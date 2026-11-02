import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';
import { fetchProductsFromMonday } from '@/lib/monday';

const PRODUCT_CACHE_SECONDS = 60 * 10;

const getCachedProducts = unstable_cache(
  async () => {
    console.info('[products-cache] Oppdaterer produktkatalogen fra datakilden.');

    const products = await fetchProductsFromMonday();

    // Ikke legg en tom katalog i cachen når butikken normalt har varer.
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error('Produktkatalogen kunne ikke oppdateres med en gyldig produktliste.');
    }

    return products;
  },
  ['tilbudsboden-product-catalog-v2'],
  {
    revalidate: PRODUCT_CACHE_SECONDS,
    tags: ['product-catalog'],
  }
);

export async function GET() {
  try {
    const products = await getCachedProducts();

    return NextResponse.json(
      {
        success: true,
        count: products.length,
        products,
      },
      {
        headers: {
          // Monday-bildene bruker tidsbegrensede, signerte URL-er.
          // Derfor caches katalogresponsen bare i 10 minutter og serveres
          // ikke som gammel CDN-respons i mange timer.
          'Cache-Control': `public, s-maxage=${PRODUCT_CACHE_SECONDS}, must-revalidate`,
        },
      }
    );
  } catch (error) {
    console.error('[products-cache] Kunne ikke hente produktkatalogen:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Tilbudene er midlertidig utilgjengelige. Prøv igjen om litt.',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
