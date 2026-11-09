import { NextResponse } from 'next/server';
import type { Product } from '@/lib/monday';
import { getCachedProducts, PRODUCT_CACHE_SECONDS } from '@/lib/products-cache';

const STORE_CODE = '13141700';

const GOOGLE_ELIGIBLE_REASONS = new Set([
  'Ny vare',
  'Utg\u00e5tt modell',
  'Demokj\u00f8rt',
  'Brukt',
  'Lagerslitt',
]);

function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function eligible(product: Product): boolean {
  return Boolean(
    product.pickupOnly &&
      GOOGLE_ELIGIBLE_REASONS.has(product.onlineSaleReason) &&
      product.brand &&
      product.itemNumber &&
      product.itemNumber !== 'Uten varenr' &&
      product.salePrice > 0 &&
      product.images.some((url) => /^https?:\/\//i.test(url))
  );
}

function itemXml(product: Product): string {
  const quantity = Math.max(0, Math.floor(product.stock));
  const availability = quantity > 0 ? 'in_stock' : 'out_of_stock';

  return `
    <item>
      <g:id>${xml(product.id)}</g:id>
      <g:store_code>${STORE_CODE}</g:store_code>
      <g:availability>${availability}</g:availability>
      <g:quantity>${quantity}</g:quantity>
      <g:price>${product.salePrice.toFixed(2)} NOK</g:price>
    </item>`;
}

export async function GET() {
  try {
    const products = (await getCachedProducts()).filter(eligible);
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Tilbudsboden.no - Local Inventory</title>
    <link>https://tilbudsboden.no</link>
    <description>Local inventory for Eiksenteret Sortland</description>${products.map(itemXml).join('')}
  </channel>
</rss>`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': `public, s-maxage=${PRODUCT_CACHE_SECONDS}, must-revalidate`,
      },
    });
  } catch (error) {
    console.error('[google-local-inventory] Kunne ikke generere lokal lagerfeed:', error);
    return new NextResponse('Local inventory feed is temporarily unavailable.', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }
}
