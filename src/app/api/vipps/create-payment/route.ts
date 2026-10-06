import { NextRequest, NextResponse } from 'next/server';
import { createVippsPaymentOrder } from '@/lib/vipps';

function getInternalBaseUrl(request: NextRequest): string {
  return request.nextUrl.origin.replace(/\/+$/, '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product, customer, shipping } = body || {};

    if (
      !product?.id ||
      !product?.name ||
      !product?.salePrice ||
      !customer?.name ||
      !customer?.email ||
      !customer?.phone
    ) {
      return NextResponse.json(
        { success: false, message: 'Mangler nødvendige produkt- eller kundedata.' },
        { status: 400 }
      );
    }

    // Generer unikt ordrenummer (EIK-XXXXXX)
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderId = `EIK-${randomCode}`;

    const shippingPrice = Number(shipping?.price || 0);
    const salePrice = Number(product.salePrice);
    const totalPrice = salePrice + shippingPrice;

    const baseUrl = getInternalBaseUrl(request);
    const returnUrl = `${baseUrl}/api/vipps/verify-payment?reference=${orderId}`;

    // Opprett betalingen hos Vipps – ingenting føres i Monday ennå
    const vippsPayment = await createVippsPaymentOrder({
      orderId,
      amountInNok: totalPrice,
      productName: product.name,
      returnUrl,
      customerPhone: customer.phone,
    });

    return NextResponse.json({
      success: true,
      url: vippsPayment.url,
      orderId,
    });
  } catch (error) {
    console.error('Feil i /api/vipps/create-payment:', error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Kunne ikke initiere Vipps-betaling.',
      },
      { status: 500 }
    );
  }
}