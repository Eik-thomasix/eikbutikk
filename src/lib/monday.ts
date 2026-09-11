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

interface MondayAsset {
  id?: string;
  name?: string;
  public_url?: string;
  url?: string;
  file_extension?: string;
}

interface MondayColumnValue {
  id: string;
  text?: string | null;
  value?: string | null;
  column?: {
    title?: string | null;
  } | null;
}

interface MondayItem {
  id: string;
  name: string;
  created_at?: string | null;
  updates?: Array<{
    body?: string | null;
  }>;
  assets?: MondayAsset[];
  column_values?: MondayColumnValue[];
}

export async function fetchProductsFromMonday(): Promise<Product[]> {
  const apiKey = process.env.MONDAY_API_KEY?.trim();
  const boardId = process.env.MONDAY_BOARD_ID?.trim();

  console.log('🔍 Starter henting av produkter fra Monday');
  console.log('🔍 API-nøkkel finnes:', Boolean(apiKey));
  console.log(
    '🔍 Board-ID etter opprydding:',
    boardId || 'MANGLER'
  );

  if (!apiKey || !boardId) {
    console.error(
      '⚠️ Mangler MONDAY_API_KEY eller MONDAY_BOARD_ID.'
    );

    return [];
  }

  const query = `
    query {
      boards(ids: ${boardId}) {
        id
        name
        items_page(limit: 100) {
          items {
            id
            name
            created_at
            updates(limit: 1) {
              body
            }
            assets {
              id
              name
              public_url
              url
              file_extension
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
    const response = await fetch(
      'https://api.monday.com/v2',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey,
          'API-Version': '2023-10',
        },
        body: JSON.stringify({ query }),
        cache: 'no-store',
      }
    );

    console.log(
      '🔍 Monday HTTP-status:',
      response.status
    );

    console.log(
      '🔍 Monday HTTP-status tekst:',
      response.statusText
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        '❌ Monday svarte med HTTP-feil:',
        response.status,
        response.statusText
      );

      console.error(
        '❌ Respons fra Monday:',
        JSON.stringify(data, null, 2)
      );

      return [];
    }

    if (data.errors) {
      console.error(
        '❌ Monday GraphQL-feil:',
        JSON.stringify(data.errors, null, 2)
      );

      return [];
    }

    const boards = data?.data?.boards || [];

    console.log(
      '🔍 Antall boards returnert:',
      boards.length
    );

    if (boards.length === 0) {
      console.error(
        `❌ Monday returnerte ikke board ${boardId}. Kontroller at API-nøkkelen har tilgang til boardet.`
      );

      return [];
    }

    const board = boards[0];

    console.log('✅ Board funnet:', {
      id: board.id,
      name: board.name,
    });

    const items: MondayItem[] =
      board?.items_page?.items || [];

    console.log(
      '🔍 Antall items returnert fra Monday:',
      items.length
    );

    if (items.length === 0) {
      console.warn(
        '⚠️ Boardet ble funnet, men Monday returnerte ingen items.'
      );

      return [];
    }

    const parsedProducts = items
      .map((item): Product | null => {
        const getColumnObject = (
          title: string
        ): MondayColumnValue | undefined => {
          const targetTitle = title
            .trim()
            .toLowerCase();

          return item.column_values?.find(
            (columnValue) => {
              const columnTitle =
                columnValue.column?.title
                  ?.trim()
                  .toLowerCase();

              if (!columnTitle) {
                return false;
              }

              return (
                columnTitle === targetTitle ||
                columnTitle.includes(targetTitle)
              );
            }
          );
        };

        const getColumnValue = (
          title: string
        ): string => {
          const column = getColumnObject(title);

          return typeof column?.text === 'string'
            ? column.text.trim()
            : '';
        };

        const status = getColumnValue('Status');
        const normalizedStatus = status.toLowerCase();

        const stockString = getColumnValue(
          'Lager'
        ).replace(/[^0-9]/g, '');

        const stock =
          stockString !== ''
            ? parseInt(stockString, 10)
            : 1;

        const isActive =
          !status ||
          normalizedStatus === 'aktiv' ||
          normalizedStatus === 'active' ||
          normalizedStatus === 'ja' ||
          normalizedStatus.includes('aktiv');

        console.log('🔍 Behandler Monday-item:', {
          id: item.id,
          name: item.name,
          status,
          isActive,
          stock,
        });

        if (!isActive) {
          console.log(
            `⏭️ Hopper over "${item.name}" fordi status er "${status}".`
          );

          return null;
        }

        const latestUpdateHtml =
          item.updates?.[0]?.body ||
          getColumnValue('Beskrivelse') ||
          '<p>Ingen detaljert beskrivelse tilgjengelig.</p>';

        const imageExtensions = new Set([
          'jpg',
          'jpeg',
          'png',
          'webp',
          'gif',
          'avif',
          'svg',
        ]);

        let imageList = (item.assets || [])
          .filter((asset) => {
            const extension = asset.file_extension
              ?.toLowerCase()
              .replace('.', '');

            if (extension) {
              return imageExtensions.has(extension);
            }

            const fileName =
              asset.name?.toLowerCase() || '';

            return Array.from(imageExtensions).some(
              (allowedExtension) =>
                fileName.endsWith(
                  `.${allowedExtension}`
                )
            );
          })
          .map((asset) => {
            return asset.public_url || asset.url || '';
          })
          .filter((url): url is string => {
            return (
              typeof url === 'string' &&
              url.startsWith('http')
            );
          });

        imageList = Array.from(new Set(imageList));

        const imageColumn =
          getColumnObject('Bilder') ||
          getColumnObject('Bilde');

        if (
          imageList.length === 0 &&
          imageColumn?.text
        ) {
          const imageUrlsFromText =
            imageColumn.text
              .split(',')
              .map((url) => url.trim())
              .filter((url) =>
                url.startsWith('http')
              );

          imageList.push(...imageUrlsFromText);
        }

        if (
          imageList.length === 0 &&
          imageColumn?.value
        ) {
          try {
            const parsedValue = JSON.parse(
              imageColumn.value
            );

            const files = Array.isArray(
              parsedValue?.files
            )
              ? parsedValue.files
              : [];

            const imageUrlsFromValue = files
              .map(
                (file: {
                  url?: string;
                  public_url?: string;
                }) => {
                  return (
                    file.public_url ||
                    file.url ||
                    ''
                  );
                }
              )
              .filter(
                (url: string) =>
                  typeof url === 'string' &&
                  url.startsWith('http')
              );

            imageList.push(...imageUrlsFromValue);
          } catch {
            console.warn(
              `⚠️ Kunne ikke tolke bildefeltet for "${item.name}".`
            );
          }
        }

        imageList = Array.from(new Set(imageList));

        if (imageList.length === 0) {
          imageList = ['/EIKLOGO.png'];
        }

        const listPriceString =
          getColumnValue('Veil Pris').replace(
            /[^0-9]/g,
            ''
          ) ||
          getColumnValue('Veil').replace(
            /[^0-9]/g,
            ''
          ) ||
          getColumnValue('Pris').replace(
            /[^0-9]/g,
            ''
          );

        const salePriceString =
          getColumnValue('Nettpris').replace(
            /[^0-9]/g,
            ''
          ) || listPriceString;

        const listPrice =
          parseFloat(listPriceString) || 0;

        const salePrice =
          parseFloat(salePriceString) ||
          listPrice;

        const shippingMethod =
          getColumnValue('Fraktmetode') ||
          getColumnValue('Frakt');

        const pickupOnly =
          shippingMethod === '' ||
          shippingMethod
            .toLowerCase()
            .includes('henting') ||
          shippingMethod
            .toLowerCase()
            .includes('butikk');

        return {
          id: item.id,
          name: item.name,
          itemNumber:
            getColumnValue('Varenummer') ||
            getColumnValue('Varenr') ||
            'Uten varenr',
          category:
            getColumnValue('Kategori') ||
            'Utstyr & Maskiner',
          images: imageList,
          listPrice,
          salePrice,
          stock,
          shortInfo:
            getColumnValue('Kort Info') ||
            getColumnValue('Info') ||
            'Kvalitetsutstyr fra Eiksenteret Sortland.',
          descriptionHtml: latestUpdateHtml,
          createdAt:
            item.created_at ||
            new Date().toISOString(),
          pickupOnly,
          views:
            parseInt(
              getColumnValue('Visninger'),
              10
            ) || 0,
        };
      })
      .filter(
        (product): product is Product =>
          product !== null
      );

    console.log(
      '✅ Antall aktive produkter etter filtrering:',
      parsedProducts.length
    );

    return parsedProducts;
  } catch (error) {
    console.error(
      '❌ Kritisk feil ved henting fra Monday:',
      error
    );

    return [];
  }
}