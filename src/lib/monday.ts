export interface Product {
  id: string;
  name: string;
  itemNumber: string;
  category: string;
  imageUrl: string;
  listPrice: number;
  salePrice: number;
  stock: number;
  shortInfo: string;
  description: string;
  createdAt: string;
  pickupOnly: boolean;
  views: number;
}

export async function fetchProductsFromMonday(): Promise<Product[]> {
  const apiKey = process.env.MONDAY_API_KEY;
  const boardId = process.env.MONDAY_BOARD_ID;

  if (!apiKey || !boardId) {
    console.error('Mangler MONDAY_API_KEY eller MONDAY_BOARD_ID.');
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
            column_values {
              id
              title
              text
              value
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
      next: { revalidate: 30 }, // Oppdaterer data hvert 30. sekund
    });

    const data = await response.json();
    const items = data?.data?.boards[0]?.items_page?.items || [];

    return items
      .map((item: any) => {
        const getColValue = (title: string) => {
          const col = item.column_values.find(
            (c: any) => c.title.toLowerCase() === title.toLowerCase()
          );
          return col ? col.text : '';
        };

        const status = getColValue('Status');
        
        // Vi viser kun varer hvor status er satt til "Aktiv" i Monday
        if (status !== 'Aktiv') return null;

        const listPrice = parseFloat(getColValue('Veil Pris')) || 0;
        const salePrice = parseFloat(getColValue('Nettpris')) || listPrice;
        const stock = parseInt(getColValue('Lager'), 10) || 0;
        const shippingMethod = getColValue('Fraktmetode');

        return {
          id: item.id,
          name: item.name,
          itemNumber: getColValue('Varenummer'),
          category: getColValue('Kategori') || 'Diverse',
          imageUrl:
            getColValue('Bilder') ||
            'https://images.unsplash.com/photo-1592417817098-8f3d6eb16082?auto=format&fit=crop&w=600&q=80',
          listPrice: listPrice,
          salePrice: salePrice,
          stock: stock,
          shortInfo: getColValue('Kort Info'),
          description: getColValue('Beskrivelse'),
          createdAt: item.created_at,
          pickupOnly:
            shippingMethod.toLowerCase().includes('henting') ||
            shippingMethod.toLowerCase().includes('butikk'),
          views: parseInt(getColValue('Visninger'), 10) || 0,
        };
      })
      .filter(Boolean) as Product[];
  } catch (error) {
    console.error('Feil ved henting fra Monday:', error);
    return [];
  }
}