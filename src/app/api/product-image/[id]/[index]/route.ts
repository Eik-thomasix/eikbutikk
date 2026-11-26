import { NextRequest } from 'next/server';
import { getCachedProducts } from '@/lib/products-cache';
import type { Product } from '@/lib/monday';

const SUCCESS_CACHE_SECONDS = 60 * 60 * 24;
const STALE_CACHE_SECONDS = 60 * 60 * 24 * 7;
const ERROR_CACHE_SECONDS = 60 * 5;

function findImage(products: Product[], id: string, index: number): string | null {
  const product = products.find((entry) => entry.id === id);
  const image = product?.images[index];
  return typeof image === 'string' && /^https?:\/\//i.test(image) ? image : null;
}

function cachedEmpty(status: number) {
  return new Response(null, {
    status,
    headers: {
      'Cache-Control': `public, s-maxage=${ERROR_CACHE_SECONDS}, stale-while-revalidate=${ERROR_CACHE_SECONDS}`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; index: string }> }
) {
  const { id, index: rawIndex } = await context.params;
  const index = Number.parseInt(rawIndex, 10);

  if (!Number.isInteger(index) || index < 0 || index > 19) {
    return cachedEmpty(400);
  }

  try {
    const imageUrl = findImage(await getCachedProducts(), id, index);
    if (!imageUrl) return cachedEmpty(404);

    const upstream = await fetch(imageUrl, {
      redirect: 'follow',
      next: { revalidate: SUCCESS_CACHE_SECONDS },
    });

    if (!upstream.ok || !upstream.body) {
      console.error(
        '[product-image] Bildet kunne ikke hentes:',
        upstream.status,
        id,
        index
      );
      return cachedEmpty(502);
    }

    const headers = new Headers({
      'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': `public, s-maxage=${SUCCESS_CACHE_SECONDS}, stale-while-revalidate=${STALE_CACHE_SECONDS}`,
      'X-Content-Type-Options': 'nosniff',
    });
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('[product-image] Uventet feil:', error);
    return cachedEmpty(500);
  }
}
