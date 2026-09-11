import { NextResponse } from 'next/server';
import { createVippsPaymentOrder } from '@/lib/vipps';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { product, customer } = body;

    if (!product || !customer) {
      return NextResponse.json(
        { success: false, message: 'Ufullstendig ordreinformasjon' },
        { status: 400 }
      );
    }

    // Generer unikt ordrenummer for Vipps (f.eks. EIK-1726054800)
    const orderId = `EIK-${Date.now().toString().slice(-8)}`;

    const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://eikbutikk.no';
    const baseUrl = rawBaseUrl.startsWith('http') ? rawBaseUrl : `https://${rawBaseUrl}`;
    const returnUrl = `${baseUrl}/product/${product.id}?vipps_order=${orderId}&status=success`;

    // Opprett betalingsøkt hos Vipps
    const vippsResponse = await createVippsPaymentOrder({
      orderId: orderId,
      amountInNok: product.salePrice,
      productName: product.name,
      returnUrl: returnUrl,
      customerPhone: customer.phone,
    });

    return NextResponse.json({
      success: true,
      orderId: orderId,
      url: vippsResponse.url || vippsResponse.checkoutFrontendUrl,
    });

  } catch (error: any) {
    console.error('❌ Feil i /api/vipps/create-payment:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Kunne ikke opprette betaling hos Vipps.' },
      { status: 500 }
    );
  }
}