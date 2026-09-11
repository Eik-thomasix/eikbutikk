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

    const orderId = `EIK-${Date.now().toString().slice(-8)}`;

    const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const baseUrl = rawBaseUrl.startsWith('http') ? rawBaseUrl : `https://${rawBaseUrl}`;
    const returnUrl = `${baseUrl}/product/${product.id}?vipps_order=${orderId}&status=success`;

    const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, '') : undefined;

    const vippsResponse = await createVippsPaymentOrder({
      orderId: orderId,
      amountInNok: product.salePrice,
      productName: product.name,
      returnUrl: returnUrl,
      customerPhone: cleanPhone,
    });

    return NextResponse.json({
      success: true,
      orderId: orderId,
      url: vippsResponse.url,
    });

  } catch (error: any) {
    console.error('❌ Feil i /api/vipps/create-payment:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Kunne ikke opprette betaling hos Vipps.' },
      { status: 500 }
    );
  }
}