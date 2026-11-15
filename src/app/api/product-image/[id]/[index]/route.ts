import { NextRequest, NextResponse } from 'next/server';
import { getCachedProducts } from '@/lib/products-cache';
import type { Product } from '@/lib/monday';

function findImage(products: Product[], id: string, index: number): string | null {
  const product = products.find((entry) => entry.id === id);
  const image = product?.images[index];
  return typeof image === 'string' && /^https?:\/\//i.test(image) ? image : null;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; index: string }> }
) {
  const { id, index: rawIndex } = await context.params;
  const index = Number.parseInt(rawIndex, 10);

  if (!Number.isInteger(index) || index < 0 || index > 19) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const imageUrl = findImage(await getCachedProducts(), id, index);
    if (!imageUrl) return new NextResponse(null, { status: 404 });

    const upstream = await fetch(imageUrl, { cache: 'no-store', redirect: 'follow' });

    if (!upstream.ok) {
      console.error('[product-image] Bildet kunne ikke hentes:', upstream.status, id, index);
      return new NextResponse(null, {
        status: 502,
        headers: { 'Cache-Control': 'no-store' },
      });
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
    console.error('[product-image] Uventet feil:', error);
    return new NextResponse(null, {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}