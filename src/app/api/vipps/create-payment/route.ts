import { NextRequest, NextResponse } from 'next/server';
import { createVippsPaymentOrder } from '@/lib/vipps';

const ORDER_COLUMNS = {
  orderNumber: 'text_mm73e37c',
  vippsOrderId: 'text_mm73k8jh',
  paymentStatus: 'color_mm73ta14',
  orderStatus: 'color_mm73zcsm',
  vippsStatus: 'color_mm73pqa6',
  stockUpdated: 'boolean_mm73w05',
  productJson: 'long_text_mm73r6vx',
} as const;

function getInternalBaseUrl(request: NextRequest): string {
  return request.nextUrl.origin.replace(/\/+$/, '');
}

async function mondayRequest(
  apiKey: string,
  query: string,
  variables: Record<string, unknown>
) {
  const response = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
      'API-Version': '2023-10',
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  const data = await response.json();

  if (!response.ok || data.errors) {
    console.error('Monday GraphQL-feil:', JSON.stringify(data, null, 2));
    throw new Error(
      data?.errors?.[0]?.message ||
        `Monday svarte med HTTP-status ${response.status}.`
    );
  }

  return data;
}

async function createPendingOrderInMonday(params: {
  apiKey: string;
  boardId: string;
  orderId: string;
  customerName: string;
  productJson: string;
}) {
  const { apiKey, boardId, orderId, customerName, productJson } = params;

  const mutation = `
    mutation CreateOrder(
      $boardId: ID!
      $itemName: String!
      $columnValues: JSON!
    ) {
      create_item(
        board_id: $boardId
        item_name: $itemName
        column_values: $columnValues
      ) { id }
    }
  `;

  const columnValues = JSON.stringify({
    [ORDER_COLUMNS.orderNumber]: orderId,
    [ORDER_COLUMNS.vippsOrderId]: orderId,
    [ORDER_COLUMNS.paymentStatus]: { label: 'Venter' },
    [ORDER_COLUMNS.orderStatus]: { label: 'Venter på betaling' },
    [ORDER_COLUMNS.productJson]: productJson,
  });

  await mondayRequest(apiKey, mutation, {
    boardId,
    itemName: `Ordre ${orderId} - ${customerName}`,
    columnValues,
  });
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

    const mondayApiKey = process.env.MONDAY_API_KEY?.trim();
    const orderBoardId = process.env.MONDAY_ORDER_BOARD_ID?.trim();

    if (!mondayApiKey || !orderBoardId) {
      return NextResponse.json(
        { success: false, message: 'Monday-konfigurasjonen for ordre mangler.' },
        { status: 500 }
      );
    }

    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderId = `EIK-${randomCode}`;

    const shippingPrice = Number(shipping?.price || 0);
    const salePrice = Number(product.salePrice);
    const totalPrice = salePrice + shippingPrice;

    const storedOrderData = {
      orderId,
      product: {
        id: product.id,
        name: product.name,
        salePrice,
        shippingPrice,
        totalPrice,
        stock: product.stock,
        itemNumber: product.itemNumber,
        weight: product.weight,
      },
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address || '',
        postalCode: customer.postalCode || '',
        city: customer.city || '',
        deliveryMethod: shipping?.deliveryMethod || customer.deliveryMethod || 'Henting',
      },
      shipping: {
        price: shippingPrice,
        deliveryMethod: shipping?.deliveryMethod || customer.deliveryMethod || 'Henting',
      },
      createdAt: new Date().toISOString(),
    };

    const productJson = JSON.stringify(storedOrderData);

    await createPendingOrderInMonday({
      apiKey: mondayApiKey,
      boardId: orderBoardId,
      orderId,
      customerName: customer.name,
      productJson,
    });

    const baseUrl = getInternalBaseUrl(request);
    const returnUrl = `${baseUrl}/api/vipps/verify-payment?reference=${orderId}`;

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