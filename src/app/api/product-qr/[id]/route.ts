import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return new NextResponse(null, { status: 400 });
  }

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
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}