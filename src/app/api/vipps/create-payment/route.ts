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
  // Kunde- og adressekolonner i Monday
  customerName: 'text_mm73x8e9',
  customerEmail: 'email_mm73y45r',
  customerPhone: 'phone_mm73k941',
  customerAddress: 'text_mm73m33l',
  customerPostalCode: 'text_mm73p89n',
  customerCity: 'text_mm73z69p',
  deliveryMethod: 'color_mm73w78m',
  productName: 'text_mm73c41k',
  netPrice: 'numeric_mm73d91l',
  shippingPrice: 'numeric_mm73m87p',
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
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerPostalCode: string;
  customerCity: string;
  deliveryMethod: string;
  productName: string;
  salePrice: number;
  shippingPrice: number;
  productJson: string;
}) {
  const {
    apiKey,
    boardId,
    orderId,
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
    customerPostalCode,
    customerCity,
    deliveryMethod,
    productName,
    salePrice,
    shippingPrice,
    productJson,
  } = params;

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

  // Mappe alle verdier korrekt inkludert e-post, telefon og farge-status
  const columnValuesPayload: Record<string, unknown> = {
    [ORDER_COLUMNS.orderNumber]: orderId,
    [ORDER_COLUMNS.vippsOrderId]: orderId,
    [ORDER_COLUMNS.paymentStatus]: { label: 'Venter' },
    [ORDER_COLUMNS.orderStatus]: { label: 'Venter på betaling' },
    [ORDER_COLUMNS.productJson]: productJson,
  };

  if (customerName) columnValuesPayload[ORDER_COLUMNS.customerName] = customerName;
  if (customerEmail) columnValuesPayload[ORDER_COLUMNS.customerEmail] = { email: customerEmail, text: customerEmail };
  if (customerPhone) columnValuesPayload[ORDER_COLUMNS.customerPhone] = { phone: customerPhone, countryShortName: 'NO' };
  if (customerAddress) columnValuesPayload[ORDER_COLUMNS.customerAddress] = customerAddress;
  if (customerPostalCode) columnValuesPayload[ORDER_COLUMNS.customerPostalCode] = customerPostalCode;
  if (customerCity) columnValuesPayload[ORDER_COLUMNS.customerCity] = customerCity;
  if (deliveryMethod) columnValuesPayload[ORDER_COLUMNS.deliveryMethod] = { label: deliveryMethod };
  if (productName) columnValuesPayload[ORDER_COLUMNS.productName] = productName;
  if (salePrice) columnValuesPayload[ORDER_COLUMNS.netPrice] = String(salePrice);
  if (shippingPrice) columnValuesPayload[ORDER_COLUMNS.shippingPrice] = String(shippingPrice);

  await mondayRequest(apiKey, mutation, {
    boardId,
    itemName: `Ordre ${orderId} - ${customerName}`,
    columnValues: JSON.stringify(columnValuesPayload),
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

    const deliveryMethod = shipping?.deliveryMethod || customer.deliveryMethod || 'Postsending';

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
        deliveryMethod,
      },
      shipping: {
        price: shippingPrice,
        deliveryMethod,
      },
      createdAt: new Date().toISOString(),
    };

    const productJson = JSON.stringify(storedOrderData);

    await createPendingOrderInMonday({
      apiKey: mondayApiKey,
      boardId: orderBoardId,
      orderId,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerAddress: customer.address || '',
      customerPostalCode: customer.postalCode || '',
      customerCity: customer.city || '',
      deliveryMethod,
      productName: product.name,
      salePrice,
      shippingPrice,
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