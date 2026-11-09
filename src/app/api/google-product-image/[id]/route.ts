import { NextRequest, NextResponse } from 'next/server';
import { fetchProductsFromMonday } from '@/lib/monday';
import { getCachedProducts } from '@/lib/products-cache';
import type { Product } from '@/lib/monday';

function findImage(products: Product[], id: string): string | null {
  const product = products.find((entry) => entry.id === id);
  const image = product?.images.find((url) => /^https?:\/\//i.test(url));
  return image || null;
}

async function downloadImage(url: string): Promise<Response> {
  return fetch(url, { cache: 'no-store', redirect: 'follow' });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    let imageUrl = findImage(await getCachedProducts(), id);
    if (!imageUrl) return new NextResponse(null, { status: 404 });

    let upstream = await downloadImage(imageUrl);

    // Ved utløpt Monday-signatur hentes katalogen direkte én gang og bildet prøves på nytt.
    if (!upstream.ok) {
      imageUrl = findImage(await fetchProductsFromMonday(), id);
      if (!imageUrl) return new NextResponse(null, { status: 404 });
      upstream = await downloadImage(imageUrl);
    }

    if (!upstream.ok) {
      console.error('[google-product-image] Bildet kunne ikke hentes:', upstream.status, id);
      return new NextResponse(null, { status: 502 });
    }

    return new NextResponse(await upstream.arrayBuffer(), {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[google-product-image] Uventet feil:', error);
    return new NextResponse(null, { status: 500 });
  }
}
