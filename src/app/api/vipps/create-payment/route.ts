import { NextResponse } from 'next/server';
import { createVippsPaymentOrder } from '@/lib/vipps';

const WAITING_FOR_PAYMENT_GROUP_ID = 'group_mm738d0y';

const ORDER_COLUMNS = {
  productId: 'text_mm73426d',
  customerName: 'text_mm73m82v',
  productName: 'text_mm73mbxm',
  salePrice: 'numeric_mm735nf0',
  phone: 'phone_mm73p5z6',
  email: 'email_mm73fh2b',
  orderNumber: 'text_mm73e37c',
  postalCode: 'text_mm73azzn',
  deliveryMethod: 'color_mm73qa89',
  address: 'text_mm735avz',
  city: 'text_mm73han4',
  paymentStatus: 'color_mm73ta14',
  orderStatus: 'color_mm73zcsm',
  createdDate: 'date_mm73m0tv',
  itemNumber: 'text_mm73xe5m',
  vippsOrderId: 'text_mm73k8jh',
  stockUpdated: 'boolean_mm73w05',
  vippsStatus: 'color_mm73pqa6',
  productJson: 'long_text_mm73r6vx',
} as const;

interface CheckoutProduct {
  id: string;
  name: string;
  salePrice: number;
  itemNumber?: string;
  stock?: number;
  pickupOnly?: boolean;
}

interface CheckoutCustomer {
  name: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  deliveryMethod?: string;
}

interface MondayOrderResult {
  id: string;
  name: string;
}

function getNorwegianDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getBaseUrl(request: Request): string {
  const requestOrigin = new URL(request.url).origin;

  if (
    requestOrigin.includes('localhost') ||
    requestOrigin.includes('127.0.0.1')
  ) {
    return requestOrigin;
  }

  const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();

  if (!configuredBaseUrl) {
    return requestOrigin;
  }

  const normalizedBaseUrl =
    configuredBaseUrl.startsWith('http://') ||
    configuredBaseUrl.startsWith('https://')
      ? configuredBaseUrl
      : `https://${configuredBaseUrl}`;

  return normalizedBaseUrl.replace(/\/+$/, '');
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

  if (!response.ok) {
    console.error(
      'Monday HTTP-feil:',
      response.status,
      JSON.stringify(data, null, 2)
    );
    throw new Error(`Monday svarte med HTTP-status ${response.status}.`);
  }

  if (data.errors) {
    console.error(
      'Monday GraphQL-feil:',
      JSON.stringify(data.errors, null, 2)
    );
    throw new Error(
      data.errors[0]?.message || 'Monday returnerte en GraphQL-feil.'
    );
  }

  return data;
}

async function createMondayOrder(params: {
  apiKey: string;
  boardId: string;
  orderId: string;
  product: CheckoutProduct;
  customer: CheckoutCustomer;
}): Promise<MondayOrderResult> {
  const { apiKey, boardId, orderId, product, customer } = params;
  const cleanPhone = customer.phone.replace(/\D/g, '');

  const deliveryMethod =
    customer.deliveryMethod ||
    (product.pickupOnly ? 'Henting i butikk' : 'Postsending');

  // Bevisst kompakt ordredata. Bilder, HTML-beskrivelse og andre store
  // produktfelt lagres ikke her, slik at JSON-en holder seg under Monday-grensen.
  const storedOrderData = {
    orderId,
    product: {
      id: product.id,
      name: product.name,
      itemNumber: product.itemNumber || 'Uten varenummer',
      salePrice: Number(product.salePrice),
      stock:
        typeof product.stock === 'number'
          ? product.stock
          : 1,
    },
    customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      postalCode: customer.postalCode,
      city: customer.city,
      deliveryMethod,
    },
    createdAt: new Date().toISOString(),
    processed: false,
  };

  const productJson = JSON.stringify(storedOrderData);

  if (productJson.length > 1900) {
    throw new Error(
      `Ordredata er for stor for Produkt JSON (${productJson.length} tegn).`
    );
  }

  const columnValues = {
    [ORDER_COLUMNS.productId]: product.id,
    [ORDER_COLUMNS.customerName]: customer.name,
    [ORDER_COLUMNS.productName]: product.name,
    [ORDER_COLUMNS.salePrice]: String(product.salePrice),
    [ORDER_COLUMNS.phone]: {
      phone: cleanPhone,
      countryShortName: 'NO',
    },
    [ORDER_COLUMNS.email]: {
      email: customer.email.trim(),
      text: customer.email.trim(),
    },
    [ORDER_COLUMNS.orderNumber]: orderId,
    [ORDER_COLUMNS.postalCode]: customer.postalCode,
    [ORDER_COLUMNS.deliveryMethod]: { label: deliveryMethod },
    [ORDER_COLUMNS.address]: customer.address,
    [ORDER_COLUMNS.city]: customer.city,
    [ORDER_COLUMNS.paymentStatus]: { label: 'Venter' },
    [ORDER_COLUMNS.orderStatus]: { label: 'Venter på betaling' },
    [ORDER_COLUMNS.createdDate]: { date: getNorwegianDate() },
    [ORDER_COLUMNS.itemNumber]:
      product.itemNumber || 'Uten varenummer',
    [ORDER_COLUMNS.vippsOrderId]: orderId,
    [ORDER_COLUMNS.stockUpdated]: { checked: 'false' },
    [ORDER_COLUMNS.productJson]: productJson,
  };

  const itemName = `${orderId} - ${customer.name}`.slice(0, 255);

  const mutation = `
    mutation CreateMondayOrder(
      $boardId: ID!
      $groupId: String!
      $itemName: String!
      $columnValues: JSON!
    ) {
      create_item(
        board_id: $boardId
        group_id: $groupId
        item_name: $itemName
        column_values: $columnValues
      ) {
        id
        name
      }
    }
  `;

  const data = await mondayRequest(apiKey, mutation, {
    boardId,
    groupId: WAITING_FOR_PAYMENT_GROUP_ID,
    itemName,
    columnValues: JSON.stringify(columnValues),
  });

  const createdOrder = data?.data?.create_item as
    | MondayOrderResult
    | undefined;

  if (!createdOrder?.id) {
    throw new Error('Monday opprettet ikke ordren som forventet.');
  }

  console.log('Ordre opprettet i Monday:', {
    mondayItemId: createdOrder.id,
    orderId,
    itemName: createdOrder.name,
    productJsonLength: productJson.length,
  });

  return createdOrder;
}

async function markMondayOrderAsFailed(params: {
  apiKey: string;
  boardId: string;
  mondayItemId: string;
}) {
  const { apiKey, boardId, mondayItemId } = params;

  const columnValues = {
    [ORDER_COLUMNS.paymentStatus]: { label: 'Feilet' },
    [ORDER_COLUMNS.vippsStatus]: { label: 'Feilet' },
  };

  const mutation = `
    mutation MarkMondayOrderAsFailed(
      $boardId: ID!
      $itemId: ID!
      $columnValues: JSON!
    ) {
      change_multiple_column_values(
        board_id: $boardId
        item_id: $itemId
        column_values: $columnValues
      ) {
        id
      }
    }
  `;

  await mondayRequest(apiKey, mutation, {
    boardId,
    itemId: mondayItemId,
    columnValues: JSON.stringify(columnValues),
  });

  console.log('Ordren er markert som Feilet i Monday.');
}

export async function POST(request: Request) {
  let mondayItemId: string | null = null;
  let mondayApiKey: string | null = null;
  let mondayOrderBoardId: string | null = null;

  try {
    const body = await request.json();
    const product = body?.product as CheckoutProduct | undefined;
    const customer = body?.customer as CheckoutCustomer | undefined;

    if (
      !product?.id ||
      !product?.name ||
      !Number.isFinite(Number(product.salePrice)) ||
      Number(product.salePrice) <= 0 ||
      !customer?.name ||
      !customer?.email ||
      !customer?.phone ||
      !customer?.address ||
      !customer?.postalCode ||
      !customer?.city
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Ufullstendig produkt- eller kundeinformasjon.',
        },
        { status: 400 }
      );
    }

    mondayApiKey = process.env.MONDAY_API_KEY?.trim() || null;
    mondayOrderBoardId =
      process.env.MONDAY_ORDER_BOARD_ID?.trim() || null;

    if (!mondayApiKey || !mondayOrderBoardId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Monday-konfigurasjonen for ordre mangler.',
        },
        { status: 500 }
      );
    }

    const normalizedProduct: CheckoutProduct = {
      id: product.id,
      name: product.name,
      salePrice: Number(product.salePrice),
      itemNumber: product.itemNumber,
      stock:
        typeof product.stock === 'number'
          ? product.stock
          : 1,
      pickupOnly: Boolean(product.pickupOnly),
    };

    const orderId = `EIK-${Date.now().toString().slice(-8)}`;
    const baseUrl = getBaseUrl(request);
    const returnUrl =
      `${baseUrl}/product/${encodeURIComponent(normalizedProduct.id)}` +
      `?vipps_order=${encodeURIComponent(orderId)}`;

    console.log('Starter ny ordre:', {
      orderId,
      productId: normalizedProduct.id,
      productName: normalizedProduct.name,
      customerName: customer.name,
      returnUrl,
    });

    const mondayOrder = await createMondayOrder({
      apiKey: mondayApiKey,
      boardId: mondayOrderBoardId,
      orderId,
      product: normalizedProduct,
      customer,
    });

    mondayItemId = mondayOrder.id;

    const cleanPhone = customer.phone.replace(/\D/g, '');

    const vippsResponse = await createVippsPaymentOrder({
      orderId,
      amountInNok: normalizedProduct.salePrice,
      productName: normalizedProduct.name,
      returnUrl,
      customerPhone: cleanPhone || undefined,
    });

    console.log('Vipps-betaling opprettet:', {
      orderId,
      mondayItemId,
      vippsReference: vippsResponse.reference,
      returnUrl,
    });

    return NextResponse.json({
      success: true,
      orderId,
      mondayItemId,
      url: vippsResponse.url,
    });
  } catch (error) {
    console.error('Feil i /api/vipps/create-payment:', error);

    if (mondayItemId && mondayApiKey && mondayOrderBoardId) {
      try {
        await markMondayOrderAsFailed({
          apiKey: mondayApiKey,
          boardId: mondayOrderBoardId,
          mondayItemId,
        });
      } catch (mondayError) {
        console.error(
          'Klarte ikke å markere ordren som Feilet:',
          mondayError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Kunne ikke opprette Vipps-betalingen.',
      },
      { status: 500 }
    );
  }
}
