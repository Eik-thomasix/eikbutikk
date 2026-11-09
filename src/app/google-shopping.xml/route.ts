import { NextResponse } from 'next/server';
import type { Product } from '@/lib/monday';
import { getCachedProducts, PRODUCT_CACHE_SECONDS } from '@/lib/products-cache';

const BASE_URL = 'https://tilbudsboden.no';

// ASCII-only source for Norwegian labels avoids Windows PowerShell 5 encoding issues.
const CONDITION_BY_REASON: Record<string, 'new' | 'used'> = {
  'Ny vare': 'new',
  'Utg\u00e5tt modell': 'new',
  'Demokj\u00f8rt': 'used',
  'Brukt': 'used',
  'Lagerslitt': 'used',
};

function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function plainText(html: string): string {
  return html
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function eligible(product: Product): boolean {
  return Boolean(
    CONDITION_BY_REASON[product.onlineSaleReason] &&
      product.brand &&
      product.itemNumber &&
      product.itemNumber !== 'Uten varenr' &&
      product.salePrice > 0 &&
      product.images.some((url) => /^https?:\/\//i.test(url))
  );
}

function itemXml(product: Product): string {
  const condition = CONDITION_BY_REASON[product.onlineSaleReason];
  const description = plainText(product.descriptionHtml) || product.shortInfo;
  const availability = product.stock > 0 ? 'in_stock' : 'out_of_stock';

  return `
    <item>
      <g:id>${xml(product.id)}</g:id>
      <title>${xml(product.name)}</title>
      <description>${xml(description)}</description>
      <link>${BASE_URL}/product/${encodeURIComponent(product.id)}</link>
      <g:image_link>${BASE_URL}/api/google-product-image/${encodeURIComponent(product.id)}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${product.salePrice.toFixed(2)} NOK</g:price>
      <g:condition>${condition}</g:condition>
      <g:brand>${xml(product.brand)}</g:brand>
      <g:mpn>${xml(product.itemNumber)}</g:mpn>
    </item>`;
}

export async function GET() {
  try {
    const products = (await getCachedProducts()).filter(eligible);
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Tilbudsboden.no</title>
    <link>${BASE_URL}</link>
    <description>Aktuelle tilbud fra Eiksenteret Sortland</description>${products.map(itemXml).join('')}
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
    console.error('[google-shopping] Kunne ikke generere produktfeed:', error);
    return new NextResponse('Produktfeeden er midlertidig utilgjengelig.', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }
}
