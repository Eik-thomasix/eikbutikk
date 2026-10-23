import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';
import { fetchProductsFromMonday } from '@/lib/monday';

const PRODUCT_CACHE_SECONDS = 60 * 10;
const STALE_FALLBACK_SECONDS = 60 * 60 * 24;

const getCachedProducts = unstable_cache(
  async () => {
    console.info('[products-cache] Oppdaterer produktkatalogen fra datakilden.');

    const products = await fetchProductsFromMonday();

    // En tom respons kan skyldes et midlertidig problem eller en nådd API-grense.
    // Ikke legg en tom katalog i den delte cachen når butikken normalt har varer.
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error('Produktkatalogen kunne ikke oppdateres med en gyldig produktliste.');
    }

    return products;
  },
  ['tilbudsboden-product-catalog-v1'],
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
          // Vercel/CDN kan gjenbruke svaret i 10 minutter og beholde en
          // tidligere fungerende respons som reserve ved midlertidige feil.
          'Cache-Control': `public, s-maxage=${PRODUCT_CACHE_SECONDS}, stale-while-revalidate=${STALE_FALLBACK_SECONDS}`,
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
