import { NextResponse } from 'next/server';
import { createVippsPaymentOrder } from '@/lib/vipps';

const WAITING_FOR_PAYMENT_GROUP_ID = 'group_mm738d0y';
const WEIGHT_COLUMN_ID = 'numeric_mm75drw8';

const ORDER_COLUMNS = {
  productId: 'text_mm73426d',
  customerName: 'text_mm73m82v',
  productName: 'text_mm73mbxm',
  salePrice: 'numeric_mm735nf0',
  shippingPrice: 'numeric_mm75bhrk',
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

type DeliveryMethod = 'Postsending' | 'Henting i butikk';

interface ClientProduct {
  id: string;
}

interface CheckoutCustomer {
  name: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  deliveryMethod?: DeliveryMethod;
}

interface TrustedProduct {
  id: string;
  name: string;
  itemNumber: string;
  salePrice: number;
  stock: number;
  weight: number;
  pickupOnly: boolean;
}

interface MondayColumnValue {
  id: string;
  text?: string | null;
  column?: { title?: string | null } | null;
}

interface MondayOrderResult {
  id: string;
  name: string;
}

function parseNumber(value: string | null | undefined): number {
  if (!value) return 0;
  const normalized = value
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateShippingPrice(weight: number): number {
  if (weight <= 0) {
    throw new Error('Produktet mangler gyldig vekt i Monday.');
  }
  if (weight <= 10) return 199;
  if (weight <= 25) return 299;
  if (weight <= 35) return 399;
  if (weight <= 70) return 899;
  return 0;
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

  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (!configured) return requestOrigin;

  const normalized =
    configured.startsWith('http://') || configured.startsWith('https://')
      ? configured
      : `https://${configured}`;
  return normalized.replace(/\/+$/, '');
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
    console.error('Monday-feil:', JSON.stringify(data, null, 2));
    throw new Error(
      data?.errors?.[0]?.message ||
        `Monday svarte med HTTP-status ${response.status}.`
    );
  }
  return data;
}

async function getTrustedProduct(
  apiKey: string,
  boardId: string,
  productId: string
): Promise<TrustedProduct> {
  const query = `
    query GetProduct($itemIds: [ID!]!) {
      items(ids: $itemIds) {
        id
        name
        board { id }
        column_values {
          id
          text
          column { title }
        }
      }
    }
  `;

  const data = await mondayRequest(apiKey, query, {
    itemIds: [productId],
  });
  const item = data?.data?.items?.[0];

  if (!item || String(item.board?.id) !== boardId) {
    throw new Error('Produktet ble ikke funnet på produktboardet.');
  }

  const columns: MondayColumnValue[] = item.column_values || [];
  const byId = (id: string) => columns.find((column) => column.id === id);
  const byTitle = (title: string) => {
    const target = title.trim().toLowerCase();
    return columns.find(
      (column) => column.column?.title?.trim().toLowerCase() === target
    );
  };
  const text = (...titles: string[]) => {
    for (const title of titles) {
      const value = byTitle(title)?.text?.trim();
      if (value) return value;
    }
    return '';
  };

  const salePrice = parseNumber(text('Nettpris'));
  const stock = parseNumber(text('Lager'));
  const weight = parseNumber(byId(WEIGHT_COLUMN_ID)?.text || text('Vekt (kg)'));
  const shippingMethod = text('Fraktmetode', 'Frakt').toLowerCase();
  const pickupOnly =
    weight > 70 ||
    shippingMethod.includes('henting') ||
    shippingMethod.includes('butikk');

  if (salePrice <= 0) throw new Error('Produktet mangler gyldig nettpris.');
  if (stock <= 0) throw new Error('Produktet er utsolgt.');

  return {
    id: String(item.id),
    name: String(item.name),
    itemNumber: text('Varenummer', 'Varenr') || 'Uten varenummer',
    salePrice,
    stock,
    weight,
    pickupOnly,
  };
}

async function createMondayOrder(params: {
  apiKey: string;
  boardId: string;
  orderId: string;
  product: TrustedProduct;
  customer: CheckoutCustomer;
  deliveryMethod: DeliveryMethod;
  shippingPrice: number;
  totalPrice: number;
}): Promise<MondayOrderResult> {
  const {
    apiKey,
    boardId,
    orderId,
    product,
    customer,
    deliveryMethod,
    shippingPrice,
    totalPrice,
  } = params;

  const cleanPhone = customer.phone.replace(/\D/g, '');
  const storedOrderData = {
    orderId,
    product: {
      id: product.id,
      name: product.name,
      itemNumber: product.itemNumber,
      salePrice: product.salePrice,
      shippingPrice,
      totalPrice,
      stock: product.stock,
      weight: product.weight,
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
    shipping: {
      price: shippingPrice,
      weight: product.weight,
      deliveryMethod,
    },
    createdAt: new Date().toISOString(),
    processed: false,
  };

  const productJson = JSON.stringify(storedOrderData);
  if (productJson.length > 1900) {
    throw new Error(`Ordredata er for stor (${productJson.length} tegn).`);
  }

  const columnValues = {
    [ORDER_COLUMNS.productId]: product.id,
    [ORDER_COLUMNS.customerName]: customer.name,
    [ORDER_COLUMNS.productName]: product.name,
    [ORDER_COLUMNS.salePrice]: String(product.salePrice),
    [ORDER_COLUMNS.shippingPrice]: String(shippingPrice),
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
    [ORDER_COLUMNS.itemNumber]: product.itemNumber,
    [ORDER_COLUMNS.vippsOrderId]: orderId,
    [ORDER_COLUMNS.stockUpdated]: { checked: 'false' },
    [ORDER_COLUMNS.productJson]: productJson,
  };

  const mutation = `
    mutation CreateOrder(
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
      ) { id name }
    }
  `;

  const itemName = `${orderId} - ${customer.name}`.slice(0, 255);
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
  return createdOrder;
}

async function markMondayOrderAsFailed(params: {
  apiKey: string;
  boardId: string;
  mondayItemId: string;
}) {
  const mutation = `
    mutation MarkFailed($boardId: ID!, $itemId: ID!, $values: JSON!) {
      change_multiple_column_values(
        board_id: $boardId
        item_id: $itemId
        column_values: $values
      ) { id }
    }
  `;

  await mondayRequest(params.apiKey, mutation, {
    boardId: params.boardId,
    itemId: params.mondayItemId,
    values: JSON.stringify({
      [ORDER_COLUMNS.paymentStatus]: { label: 'Feilet' },
      [ORDER_COLUMNS.vippsStatus]: { label: 'Feilet' },
    }),
  });
}

export async function POST(request: Request) {
  let mondayItemId: string | null = null;
  let mondayApiKey: string | null = null;
  let orderBoardId: string | null = null;

  try {
    const body = await request.json();
    const clientProduct = body?.product as ClientProduct | undefined;
    const customer = body?.customer as CheckoutCustomer | undefined;

    if (
      !clientProduct?.id ||
      !customer?.name ||
      !customer?.email ||
      !customer?.phone ||
      !customer?.address ||
      !/^\d{4}$/.test(String(customer?.postalCode || '')) ||
      !customer?.city
    ) {
      return NextResponse.json(
        { success: false, message: 'Ufullstendig ordre- eller kundedata.' },
        { status: 400 }
      );
    }

    mondayApiKey = process.env.MONDAY_API_KEY?.trim() || null;
    const productBoardId = process.env.MONDAY_BOARD_ID?.trim();
    orderBoardId = process.env.MONDAY_ORDER_BOARD_ID?.trim() || null;

    if (!mondayApiKey || !productBoardId || !orderBoardId) {
      throw new Error('Monday-konfigurasjonen mangler.');
    }

    const product = await getTrustedProduct(
      mondayApiKey,
      productBoardId,
      clientProduct.id
    );

    let deliveryMethod: DeliveryMethod =
      customer.deliveryMethod === 'Henting i butikk'
        ? 'Henting i butikk'
        : 'Postsending';

    if (product.pickupOnly || product.weight > 70) {
      deliveryMethod = 'Henting i butikk';
    }

    const shippingPrice =
      deliveryMethod === 'Postsending'
        ? calculateShippingPrice(product.weight)
        : 0;
    const totalPrice = product.salePrice + shippingPrice;
    const orderId = `EIK-${Date.now().toString().slice(-8)}`;

    const baseUrl = getBaseUrl(request);
    const returnUrl =
      `${baseUrl}/product/${encodeURIComponent(product.id)}` +
      `?vipps_order=${encodeURIComponent(orderId)}`;

    const mondayOrder = await createMondayOrder({
      apiKey: mondayApiKey,
      boardId: orderBoardId,
      orderId,
      product,
      customer,
      deliveryMethod,
      shippingPrice,
      totalPrice,
    });
    mondayItemId = mondayOrder.id;

    const vippsResponse = await createVippsPaymentOrder({
      orderId,
      amountInNok: totalPrice,
      productName: product.name,
      returnUrl,
      customerPhone: customer.phone.replace(/\D/g, '') || undefined,
    });

    console.log('Vipps-betaling opprettet med frakt:', {
      orderId,
      productPrice: product.salePrice,
      shippingPrice,
      totalPrice,
      deliveryMethod,
    });

    return NextResponse.json({
      success: true,
      orderId,
      mondayItemId,
      shippingPrice,
      totalPrice,
      deliveryMethod,
      url: vippsResponse.url,
    });
  } catch (error) {
    console.error('Feil i /api/vipps/create-payment:', error);

    if (mondayItemId && mondayApiKey && orderBoardId) {
      try {
        await markMondayOrderAsFailed({
          apiKey: mondayApiKey,
          boardId: orderBoardId,
          mondayItemId,
        });
      } catch (mondayError) {
        console.error('Kunne ikke markere ordren som feilet:', mondayError);
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
