export interface Product {
  id: string;
  name: string;
  itemNumber: string;
  category: string;
  images: string[]; // Liste med alle bilder
  listPrice: number;
  salePrice: number;
  stock: number;
  shortInfo: string;
  descriptionHtml: string; // Siste Update fra Monday (HTML/Riktekst)
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

  // GraphQL-spørring som også henter siste "update"
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
        const getColValue = (title: string) => {
          const col = item.column_values?.find(
            (c: any) =>
              c.column?.title &&
              c.column.title.trim().toLowerCase() === title.trim().toLowerCase()
          );
          return col && col.text ? col.text.trim() : '';
        };

        const status = getColValue('Status');
        const stockStr = getColValue('Lager').replace(/[^0-9]/g, '');
        const stock = parseInt(stockStr, 10) || 0;

        if (status.toLowerCase() !== 'aktiv' || stock <= 0) {
          return null;
        }

        // Henter siste Update (HTML-tekst) fra Monday
        const latestUpdateHtml = item.updates?.[0]?.body || getColValue('Beskrivelse') || '<p>Ingen detaljert beskrivelse tilgjengelig.</p>';

        // Ekstraherer bilde-URLer fra Bilder-kolonnen (eller bruk standardbilde)
        const rawImages = getColValue('Bilder');
        let imageList: string[] = [];

        if (rawImages) {
          imageList = rawImages
            .split(',')
            .map((url: string) => url.trim())
            .filter((url: string) => url.startsWith('http'));
        }

        if (imageList.length === 0) {
          imageList = ['https://images.unsplash.com/photo-1592417817098-8f3d6eb16082?auto=format&fit=crop&w=800&q=80'];
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