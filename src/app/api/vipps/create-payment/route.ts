import { NextRequest, NextResponse } from 'next/server';
import { createVippsPaymentOrder } from '@/lib/vipps';

const PRODUCT_COLUMNS = {
  itemNumber: ['Varenummer', 'Varenr'],
  salePrice: ['Nettpris'],
  listPrice: ['Veil Pris', 'Veil', 'Pris'],
  stock: ['Lager'],
  status: ['Status'],
  shipping: ['Fraktmetode', 'Frakt'],
  weight: 'numeric_mm75drw8',
} as const;

type MondayColumnValue = {
  id: string;
  text?: string | null;
  value?: string | null;
  column?: { title?: string | null } | null;
};

type MondayProductItem = {
  id: string;
  name: string;
  board?: { id?: string | null } | null;
  group?: { id?: string | null; title?: string | null } | null;
  column_values?: MondayColumnValue[];
};

type CustomerInput = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  address?: unknown;
  postalCode?: unknown;
  city?: unknown;
  deliveryMethod?: unknown;
};

function getInternalBaseUrl(request: NextRequest): string {
  return request.nextUrl.origin.replace(/\/+$/, '');
}

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? '').trim().slice(0, maxLength);
}

function parseNorwegianNumber(value: string | null | undefined): number {
  const normalized = String(value ?? '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('47') && digits.length === 10) return digits;
  if (digits.length === 8) return `47${digits}`;
  return '';
}

function calculateShippingPrice(weight: number): number {
  if (weight <= 0) throw new Error('Produktet mangler gyldig vekt og kan ikke sendes.');
  if (weight > 70) throw new Error('Produkter over 70 kg må hentes i butikk.');
  if (weight <= 10) return 199;
  if (weight <= 25) return 299;
  if (weight <= 35) return 399;
  return 899;
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

async function getVerifiedProduct(params: {
  apiKey: string;
  boardId: string;
  productId: string;
}) {
  const query = `
    query GetProduct($itemIds: [ID!]!) {
      items(ids: $itemIds) {
        id
        name
        board { id }
        group { id title }
        column_values {
          id
          text
          value
          column { title }
        }
      }
    }
  `;

  const data = await mondayRequest(params.apiKey, query, {
    itemIds: [params.productId],
  });
  const item = data?.data?.items?.[0] as MondayProductItem | undefined;

  if (!item) throw new Error('Produktet ble ikke funnet.');
  if (String(item.board?.id || '') !== params.boardId) {
    throw new Error('Produktet ligger ikke på forventet produktboard.');
  }

  const columns = item.column_values || [];
  const byId = (id: string) => columns.find((column) => column.id === id);
  const byTitle = (titles: readonly string[]) => {
    const normalized = titles.map((title) => title.trim().toLowerCase());
    return columns.find((column) => {
      const title = column.column?.title?.trim().toLowerCase();
      return title ? normalized.includes(title) : false;
    });
  };
  const text = (titles: readonly string[]) => byTitle(titles)?.text?.trim() || '';

  const groupTitle = item.group?.title?.trim().toLowerCase() || '';
  const status = text(PRODUCT_COLUMNS.status).toLowerCase();
  const stock = parseNorwegianNumber(text(PRODUCT_COLUMNS.stock));
  const salePrice =
    parseNorwegianNumber(text(PRODUCT_COLUMNS.salePrice)) ||
    parseNorwegianNumber(text(PRODUCT_COLUMNS.listPrice));
  const weight = parseNorwegianNumber(byId(PRODUCT_COLUMNS.weight)?.text);
  const shippingMethod = text(PRODUCT_COLUMNS.shipping).toLowerCase();
  const pickupOnly =
    shippingMethod === '' ||
    shippingMethod.includes('henting') ||
    shippingMethod.includes('butikk');

  if (groupTitle !== 'aktive produkter' || status !== 'aktiv') {
    throw new Error('Produktet er ikke tilgjengelig for kjøp.');
  }
  if (stock <= 0) throw new Error('Produktet er utsolgt.');
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    throw new Error('Produktet mangler gyldig nettpris.');
  }

  return {
    id: item.id,
    name: item.name,
    itemNumber: text(PRODUCT_COLUMNS.itemNumber) || 'Uten varenr',
    salePrice,
    stock,
    weight,
    pickupOnly,
  };
}

async function getBoardColumnMapping(apiKey: string, boardId: string) {
  const query = `
    query GetBoardColumns($boardIds: [ID!]!) {
      boards(ids: $boardIds) {
        columns { id title type }
      }
    }
  `;
  const data = await mondayRequest(apiKey, query, { boardIds: [boardId] });
  const columns: Array<{ id: string; title: string; type: string }> =
    data?.data?.boards?.[0]?.columns || [];
  const findId = (titleName: string) =>
    columns.find(
      (column) =>
        column.title.trim().toLowerCase() === titleName.trim().toLowerCase()
    )?.id || null;

  return {
    orderNumber: findId('Ordrenummer') || 'text_mm73e37c',
    vippsOrderId: findId('Vipps Ordre-ID') || 'text_mm73k8jh',
    paymentStatus: findId('Betalingsstatus') || 'color_mm73ta14',
    orderStatus: findId('Ordrestatus') || 'color_mm73zcsm',
    customerName: findId('Kunde') || 'text_mm73x8e9',
    customerEmail: findId('E-post') || 'email_mm73y45r',
    customerPhone: findId('Telefon') || 'phone_mm73k941',
    customerAddress: findId('Adresse') || 'text_mm73m33l',
    customerPostalCode: findId('Postnummer') || 'text_mm73p89n',
    customerCity: findId('Poststed') || 'text_mm73z69p',
    deliveryMethod: findId('Leveringsmåte') || 'color_mm73w78m',
    productName: findId('Produktnavn') || 'text_mm73c41k',
    itemNumber: findId('Varenummer') || 'text_mm73vnum',
    netPrice: findId('Nettpris') || 'numeric_mm73d91l',
    shippingPrice: findId('Frakt') || 'numeric_mm73m87p',
    productJson: findId('Produkt JSON') || 'long_text_mm73r6vx',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const productId = cleanText(body?.product?.id, 32);
    const customerInput = (body?.customer || {}) as CustomerInput;
    const requestedDeliveryMethod = cleanText(
      body?.shipping?.deliveryMethod ?? customerInput.deliveryMethod,
      40
    );

    const customer = {
      name: cleanText(customerInput.name, 120),
      email: cleanText(customerInput.email, 254).toLowerCase(),
      phone: cleanText(customerInput.phone, 30),
      address: cleanText(customerInput.address, 180),
      postalCode: cleanText(customerInput.postalCode, 10).replace(/\D/g, ''),
      city: cleanText(customerInput.city, 100),
    };

    if (!productId || !customer.name || !customer.email || !customer.phone) {
      return NextResponse.json(
        { success: false, message: 'Mangler nødvendige produkt- eller kundedata.' },
        { status: 400 }
      );
    }
    if (!isValidEmail(customer.email)) {
      return NextResponse.json(
        { success: false, message: 'E-postadressen er ugyldig.' },
        { status: 400 }
      );
    }
    const normalizedPhone = normalizePhone(customer.phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { success: false, message: 'Telefonnummeret må være et gyldig norsk nummer.' },
        { status: 400 }
      );
    }
    if (!/^\d{4}$/.test(customer.postalCode)) {
      return NextResponse.json(
        { success: false, message: 'Postnummer må bestå av fire sifre.' },
        { status: 400 }
      );
    }
    if (!customer.address || !customer.city) {
      return NextResponse.json(
        { success: false, message: 'Adresse og poststed må fylles ut.' },
        { status: 400 }
      );
    }

    const mondayApiKey = process.env.MONDAY_API_KEY?.trim();
    const productBoardId = process.env.MONDAY_BOARD_ID?.trim();
    const orderBoardId = process.env.MONDAY_ORDER_BOARD_ID?.trim();
    if (!mondayApiKey || !productBoardId || !orderBoardId) {
      return NextResponse.json(
        { success: false, message: 'Monday-konfigurasjonen mangler.' },
        { status: 500 }
      );
    }

    const product = await getVerifiedProduct({
      apiKey: mondayApiKey,
      boardId: productBoardId,
      productId,
    });

    const wantsPickup = requestedDeliveryMethod === 'Henting i butikk';
    const deliveryMethod =
      product.pickupOnly || product.weight > 70 || wantsPickup
        ? 'Henting i butikk'
        : 'Postsending';
    const shippingPrice =
      deliveryMethod === 'Henting i butikk'
        ? 0
        : calculateShippingPrice(product.weight);
    const totalPrice = product.salePrice + shippingPrice;

    const randomCode = crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
    const orderId = `EIK-${randomCode}`;

    const storedOrderData = {
      orderId,
      product: {
        id: product.id,
        name: product.name,
        salePrice: product.salePrice,
        shippingPrice,
        totalPrice,
        stock: product.stock,
        itemNumber: product.itemNumber,
        weight: product.weight,
      },
      customer: {
        ...customer,
        phone: normalizedPhone,
        deliveryMethod,
      },
      shipping: {
        price: shippingPrice,
        weight: product.weight,
        deliveryMethod,
      },
      createdAt: new Date().toISOString(),
      source: 'server-verified',
    };

    const columns = await getBoardColumnMapping(mondayApiKey, orderBoardId);
    const columnValues: Record<string, unknown> = {
      [columns.orderNumber]: orderId,
      [columns.vippsOrderId]: orderId,
      [columns.paymentStatus]: { label: 'Venter' },
      [columns.orderStatus]: { label: 'Venter på betaling' },
      [columns.productJson]: JSON.stringify(storedOrderData),
      [columns.customerName]: customer.name,
      [columns.customerEmail]: { email: customer.email, text: customer.email },
      [columns.customerPhone]: {
        phone: normalizedPhone,
        countryShortName: 'NO',
      },
      [columns.customerAddress]: customer.address,
      [columns.customerPostalCode]: customer.postalCode,
      [columns.customerCity]: customer.city,
      [columns.deliveryMethod]: { label: deliveryMethod },
      [columns.productName]: product.name,
      [columns.itemNumber]: product.itemNumber,
      [columns.netPrice]: String(product.salePrice),
      [columns.shippingPrice]: String(shippingPrice),
    };

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

    await mondayRequest(mondayApiKey, mutation, {
      boardId: orderBoardId,
      itemName: `Ordre ${orderId} - ${customer.name}`,
      columnValues: JSON.stringify(columnValues),
    });

    const returnUrl = `${getInternalBaseUrl(request)}/api/vipps/verify-payment?reference=${orderId}`;
    const vippsPayment = await createVippsPaymentOrder({
      orderId,
      amountInNok: totalPrice,
      productName: product.name,
      returnUrl,
      customerPhone: normalizedPhone,
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
