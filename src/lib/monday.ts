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

  // GraphQL-spørring som henter både tekst, JSON-value og tilknyttede file assets
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
          return item.column_values?.find(
            (c: any) =>
              c.column?.title &&
              c.column.title.trim().toLowerCase() === title.trim().toLowerCase()
          );
        };

        const getColValue = (title: string) => {
          const col = getColObj(title);
          return col && col.text ? col.text.trim() : '';
        };

        const status = getColValue('Status');
        const stockStr = getColValue('Lager').replace(/[^0-9]/g, '');
        const stock = parseInt(stockStr, 10) || 0;

        if (status.toLowerCase() !== 'aktiv' || stock <= 0) {
          return null;
        }

        // Henter siste Update (HTML-tekst) fra Monday
        const latestUpdateHtml =
          item.updates?.[0]?.body ||
          getColValue('Beskrivelse') ||
          '<p>Ingen detaljert beskrivelse tilgjengelig.</p>';

        // Ekstraherer bilde-URLer direkte fra Monday sine file assets eller JSON value
        let imageList: string[] = [];
        const imageCol = getColObj('Bilder');

        if (imageCol) {
          // 1. Sjekk om GraphQL returnerte direkte file assets/public_url
          if (Array.isArray(imageCol.files)) {
            imageList = imageCol.files
              .map((file: any) => file.public_url || file.url)
              .filter((url: string) => url && url.startsWith('http'));
          }

          // 2. Hvis `files` ikke returnerte lenker, prøv å parse JSON `value`
          if (imageList.length === 0 && imageCol.value) {
            try {
              const parsedVal = JSON.parse(imageCol.value);
              if (parsedVal.files && Array.isArray(parsedVal.files)) {
                imageList = parsedVal.files
                  .map((f: any) => f.url || f.public_url)
                  .filter((url: string) => url && url.startsWith('http'));
              }
            } catch (e) {
              // Ignorer parsefeil om verdien er ren tekst
            }
          }

          // 3. Sjekk om det er oppgitt rene URL-er separert med komma i teksten
          if (imageList.length === 0 && imageCol.text) {
            imageList = imageCol.text
              .split(',')
              .map((url: string) => url.trim())
              .filter((url: string) => url.startsWith('http'));
          }
        }

        // Bruk den fungerende logoen som trygg fallback hvis produktet mangler bilde i Monday
        if (imageList.length === 0) {
          imageList = ['/EIKLOGO.png'];
        }

        const listPriceStr = getColValue('Veil Pris').replace(/[^0-9]/g, '');
        const salePriceStr = getColValue('Nettpris').replace(/[^0-9]/g, '');

        const listPrice = parseFloat(listPriceStr) || 0;
        const salePrice = parseFloat(salePriceStr) || listPrice;
        const shippingMethod = getColValue('Fraktmetode');

        return {
          id: item.id,
          name: item.name,
          itemNumber: getColValue('Varenummer') || 'Uten varenr',
          category: getColValue('Kategori') || 'Utstyr & Maskiner',
          images: imageList,
          listPrice: listPrice,
          salePrice: salePrice,
          stock: stock,
          shortInfo: getColValue('Kort Info') || 'Kvalitetsutstyr fra Eiksenteret Sortland.',
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