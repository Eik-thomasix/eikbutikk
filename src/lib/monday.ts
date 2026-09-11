export interface Product {
  id: string;
  name: string;
  itemNumber: string;
  category: string;
  images: string[];
  listPrice: number;
  salePrice: number;
  stock: number;
  shortInfo: string;
  descriptionHtml: string;
  createdAt: string;
  pickupOnly: boolean;
  views: number;
}

export async function fetchProductsFromMonday(): Promise<Product[]> {
  const apiKey = process.env.MONDAY_API_KEY;
  const boardId = process.env.MONDAY_BOARD_ID;

  if (!apiKey || !boardId) {
    console.error('⚠️ Mangler MONDAY_API_KEY eller MONDAY_BOARD_ID.');
    return [];
  }

  const query = `
    query {
      boards (ids: ${boardId}) {
        items_page (limit: 100) {
          items {
            id
            name
            created_at
            updates (limit: 1) {
              body
            }
            column_values {
              id
              text
              value
              column {
                title
              }
              ... on FileValue {
                files {
                  ... on MondayResource {
                    public_url
                  }
                  ... on Asset {
                    public_url
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
        'API-Version': '2023-10',
      },
      body: JSON.stringify({ query }),
      cache: 'no-store',
    });

    const data = await response.json();

    if (data.errors) {
      console.error('❌ Monday API Feil:', JSON.stringify(data.errors, null, 2));
      return [];
    }

    const items = data?.data?.boards?.[0]?.items_page?.items || [];

    const parsedProducts = items
      .map((item: any) => {
        const getColObj = (title: string) => {
          return item.column_values?.find((c: any) => {
            if (!c.column?.title) return false;
            const colTitle = c.column.title.trim().toLowerCase();
            const targetTitle = title.trim().toLowerCase();
            return colTitle === targetTitle || colTitle.includes(targetTitle);
          });
        };

        const getColValue = (title: string) => {
          const col = getColObj(title);
          return col && col.text ? col.text.trim() : '';
        };

        const status = getColValue('Status');
        const stockStr = getColValue('Lager').replace(/[^0-9]/g, '');
        const stock = stockStr !== '' ? parseInt(stockStr, 10) : 1; // Default til 1 om kolonne mangler

        // Fleksibel statussjekk: Aksepterer "Aktiv", "Active", "Ja", eller om feltet er tomt
        const isActive = 
          !status || 
          status.toLowerCase().includes('aktiv') || 
          status.toLowerCase().includes('active') ||
          status.toLowerCase() === 'ja';

        if (!isActive) {
          return null;
        }

        // Beskrivelse fra Updates eller felt
        const latestUpdateHtml =
          item.updates?.[0]?.body ||
          getColValue('Beskrivelse') ||
          '<p>Ingen detaljert beskrivelse tilgjengelig.</p>';

        // Hent bilde-URLer
        let imageList: string[] = [];
        const imageCol = getColObj('Bilder') || getColObj('Bilde');

        if (imageCol) {
          if (Array.isArray(imageCol.files)) {
            imageList = imageCol.files
              .map((file: any) => file.public_url || file.url)
              .filter((url: string) => url && url.startsWith('http'));
          }

          if (imageList.length === 0 && imageCol.value) {
            try {
              const parsedVal = JSON.parse(imageCol.value);
              if (parsedVal.files && Array.isArray(parsedVal.files)) {
                imageList = parsedVal.files
                  .map((f: any) => f.url || f.public_url)
                  .filter((url: string) => url && url.startsWith('http'));
              }
            } catch (e) {}
          }

          if (imageList.length === 0 && imageCol.text) {
            imageList = imageCol.text
              .split(',')
              .map((url: string) => url.trim())
              .filter((url: string) => url.startsWith('http'));
          }
        }

        if (imageList.length === 0) {
          imageList = ['/EIKLOGO.png'];
        }

        const listPriceStr = getColValue('Veil').replace(/[^0-9]/g, '') || getColValue('Pris').replace(/[^0-9]/g, '');
        const salePriceStr = getColValue('Nettpris').replace(/[^0-9]/g, '') || listPriceStr;

        const listPrice = parseFloat(listPriceStr) || 0;
        const salePrice = parseFloat(salePriceStr) || listPrice;
        const shippingMethod = getColValue('Frakt');

        return {
          id: item.id,
          name: item.name,
          itemNumber: getColValue('Varenummer') || getColValue('Varenr') || 'Uten varenr',
          category: getColValue('Kategori') || 'Utstyr & Maskiner',
          images: imageList,
          listPrice: listPrice,
          salePrice: salePrice,
          stock: stock,
          shortInfo: getColValue('Kort Info') || getColValue('Info') || 'Kvalitetsutstyr fra Eiksenteret Sortland.',
          descriptionHtml: latestUpdateHtml,
          createdAt: item.created_at || new Date().toISOString(),
          pickupOnly:
            shippingMethod.toLowerCase().includes('henting') ||
            shippingMethod.toLowerCase().includes('butikk') ||
            shippingMethod === '',
          views: parseInt(getColValue('Visninger'), 10) || 0,
        };
      })
      .filter(Boolean) as Product[];

    return parsedProducts;
  } catch (error) {
    console.error('❌ Kritisk feil ved henting fra Monday:', error);
    return [];
  }
}