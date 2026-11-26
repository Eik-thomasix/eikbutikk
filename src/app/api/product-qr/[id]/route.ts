import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

const QR_CACHE_SECONDS = 60 * 60 * 24 * 365;
const ERROR_CACHE_SECONDS = 60 * 5;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return new NextResponse(null, {
      status: 400,
      headers: {
        'Cache-Control': `public, s-maxage=${ERROR_CACHE_SECONDS}`,
      },
    });
  }

  try {
    const target = `https://tilbudsboden.no/product/${id}`;
    const png = await QRCode.toBuffer(target, {
      type: 'png',
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#111111', light: '#ffffff' },
    });

    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': `public, s-maxage=${QR_CACHE_SECONDS}, stale-while-revalidate=${QR_CACHE_SECONDS}, immutable`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[product-qr] Kunne ikke generere QR-kode:', error);
    return new NextResponse(null, {
      status: 500,
      headers: {
        'Cache-Control': `public, s-maxage=${ERROR_CACHE_SECONDS}`,
      },
    });
  }
}
