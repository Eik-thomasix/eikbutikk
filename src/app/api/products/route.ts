import { NextResponse } from 'next/server';
import { getCachedProducts, PRODUCT_CACHE_SECONDS } from '@/lib/products-cache';

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
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }
}
