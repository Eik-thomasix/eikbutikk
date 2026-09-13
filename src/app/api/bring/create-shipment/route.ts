import { NextRequest, NextResponse } from 'next/server';

const BRING_BOOKING_URL = 'https://api.bring.com/booking/api/create';
const BRING_PRODUCT_ID = '5800';
const SENT_GROUP_ID = 'group_mm73mky8';

const ORDER_COLUMNS = {
  orderNumber: 'text_mm73e37c',
  paymentStatus: 'color_mm73ta14',
  orderStatus: 'color_mm73zcsm',
  trackingNumber: 'text_mm75q5sa',
  shippingDate: 'date_mm75z9jw',
  bringPdf: 'link_mm75mrj7',
  productJson: 'long_text_mm73r6vx',
} as const;

const PRODUCT_COLUMNS = {
  weight: 'numeric_mm75drw8',
  length: 'numeric_mm75t3qf',
  width: 'numeric_mm75mdjp',
  height: 'numeric_mm75vbef',
} as const;

type MondayColumnValue = {
  id: string;
  text?: string | null;
  value?: string | null;
};

type MondayOrderItem = {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
};

type StoredOrder = {
  orderId: string;
  product: {
    id: string;
    name: string;
    itemNumber?: string;
    weight?: number;
  };
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    postalCode: string;
    city: string;
    deliveryMethod?: string;
  };
};

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, message, ...(details ? { details } : {}) },
    { status }
  );
}

function cleanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('47') && digits.length === 10) return `+${digits}`;
  if (digits.length === 8) return `+47${digits}`;
  return phone.startsWith('+') ? phone : `+${digits}`;
}

function todayNorway(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function shippingDateTimeNorway(): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
}

function parseNumber(value: string | null | undefined): number {
  const parsed = Number.parseFloat(
    String(value || '')
      .replace(/\s/g, '')
      .replace(',', '.')
      .replace(/[^0-9.-]/g, '')
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function getColumn(item: MondayOrderItem, id: string) {
  return item.column_values.find((column) => column.id === id);
}

function parseLongText(column?: MondayColumnValue): string {
  if (!column) return '';
  if (column.text?.trim()) return column.text.trim();
  if (!column.value) return '';
  try {
    const parsed = JSON.parse(column.value);
    if (typeof parsed === 'string') return parsed;
    if (typeof parsed?.text === 'string') return parsed.text;
  } catch {
    return column.value;
  }
  return '';
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
    throw new Error(
      data?.errors?.[0]?.message ||
        `Monday svarte med HTTP-status ${response.status}.`
    );
  }
  return data;
}

async function findOrder(
  apiKey: string,
  boardId: string,
  orderId: string
): Promise<MondayOrderItem | null> {
  const query = `
    query FindOrder($boardIds: [ID!]!, $cursor: String) {
      boards(ids: $boardIds) {
        items_page(limit: 100, cursor: $cursor) {
          cursor
          items {
            id
            name
            column_values(ids: [
              "${ORDER_COLUMNS.orderNumber}",
              "${ORDER_COLUMNS.paymentStatus}",
              "${ORDER_COLUMNS.orderStatus}",
              "${ORDER_COLUMNS.trackingNumber}",
              "${ORDER_COLUMNS.productJson}"
            ]) { id text value }
          }
        }
      }
    }
  `;

  let cursor: string | null = null;
  do {
    const data = await mondayRequest(apiKey, query, {
      boardIds: [boardId],
      cursor,
    });
    const page = data?.data?.boards?.[0]?.items_page;
    const items: MondayOrderItem[] = page?.items || [];
    const found = items.find(
      (item) =>
        getColumn(item, ORDER_COLUMNS.orderNumber)?.text?.trim() === orderId
    );
    if (found) return found;
    cursor = page?.cursor || null;
  } while (cursor);
  return null;
}

async function getPackageData(apiKey: string, productId: string) {
  const query = `
    query GetProduct($itemIds: [ID!]!) {
      items(ids: $itemIds) {
        id
        board { id }
        column_values(ids: [
          "${PRODUCT_COLUMNS.weight}",
          "${PRODUCT_COLUMNS.length}",
          "${PRODUCT_COLUMNS.width}",
          "${PRODUCT_COLUMNS.height}"
        ]) { id text }
      }
    }
  `;
  const data = await mondayRequest(apiKey, query, {
    itemIds: [productId],
  });
  const item = data?.data?.items?.[0];
  if (!item) throw new Error('Produktet ble ikke funnet i Monday.');
  const expectedBoard = process.env.MONDAY_BOARD_ID?.trim();
  if (expectedBoard && String(item.board?.id) !== expectedBoard) {
    throw new Error('Produktet ligger ikke på forventet produktboard.');
  }
  const columns: MondayColumnValue[] = item.column_values || [];
  const value = (id: string) =>
    parseNumber(columns.find((column) => column.id === id)?.text);
  const packageData = {
    weightInKg: value(PRODUCT_COLUMNS.weight),
    lengthInCm: value(PRODUCT_COLUMNS.length),
    widthInCm: value(PRODUCT_COLUMNS.width),
    heightInCm: value(PRODUCT_COLUMNS.height),
  };
  if (Object.values(packageData).some((number) => number <= 0)) {
    throw new Error('Produktet mangler vekt eller pakkemål i Monday.');
  }
  if (packageData.weightInKg > 70) {
    throw new Error('Produktet er over 70 kg og kan ikke bookes med denne pakketjenesten.');
  }
  return packageData;
}

async function updateOrderAfterBooking(params: {
  apiKey: string;
  boardId: string;
  itemId: string;
  trackingNumber: string;
  labelUrl: string;
}) {
  const mutation = `
    mutation CompleteShipment(
      $boardId: ID!
      $itemId: ID!
      $values: JSON!
    ) {
      change_multiple_column_values(
        board_id: $boardId
        item_id: $itemId
        column_values: $values
      ) { id }
      move_item_to_group(item_id: $itemId, group_id: "${SENT_GROUP_ID}") {
        id
      }
    }
  `;
  await mondayRequest(params.apiKey, mutation, {
    boardId: params.boardId,
    itemId: params.itemId,
    values: JSON.stringify({
      [ORDER_COLUMNS.trackingNumber]: params.trackingNumber,
      [ORDER_COLUMNS.shippingDate]: { date: todayNorway() },
      [ORDER_COLUMNS.bringPdf]: {
        url: params.labelUrl,
        text: 'Åpne Bring-etikett',
      },
      [ORDER_COLUMNS.orderStatus]: { label: 'Sendt' },
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const adminSecret = process.env.BRING_ADMIN_SECRET?.trim();
    if (!adminSecret) {
      return jsonError('BRING_ADMIN_SECRET mangler i miljøvariablene.', 503);
    }
    if (request.headers.get('x-admin-secret') !== adminSecret) {
      return jsonError('Ikke autorisert.', 401);
    }

    const body = await request.json();
    const orderId = String(body?.orderId || '').trim();
    if (!/^EIK-[A-Za-z0-9-]+$/.test(orderId)) {
      return jsonError('Et gyldig EIK-ordrenummer mangler.');
    }

    const mondayApiKey = process.env.MONDAY_API_KEY?.trim();
    const orderBoardId = process.env.MONDAY_ORDER_BOARD_ID?.trim();
    const bringUid = process.env.BRING_API_UID?.trim();
    const bringApiKey = process.env.BRING_API_KEY?.trim();
    const bringClientUrl = process.env.BRING_CLIENT_URL?.trim();
    const bringCustomerNumber =
      process.env.BRING_API_CUSTOMER?.trim() || '1659671';
    const testMode = process.env.BRING_TEST_MODE !== 'false';

    if (
      !mondayApiKey ||
      !orderBoardId ||
      !bringUid ||
      !bringApiKey ||
      !bringClientUrl
    ) {
      return jsonError('Monday- eller Bring-konfigurasjonen mangler.', 503);
    }

    const orderItem = await findOrder(mondayApiKey, orderBoardId, orderId);
    if (!orderItem) return jsonError(`Fant ikke ordren ${orderId}.`, 404);

    const existingTracking = getColumn(
      orderItem,
      ORDER_COLUMNS.trackingNumber
    )?.text?.trim();
    if (existingTracking) {
      return NextResponse.json({
        success: true,
        alreadyBooked: true,
        orderId,
        trackingNumber: existingTracking,
        message: 'Ordren har allerede sporingsnummer og ble ikke booket på nytt.',
      });
    }

    const paymentStatus = getColumn(
      orderItem,
      ORDER_COLUMNS.paymentStatus
    )?.text?.trim();
    if (paymentStatus?.toLowerCase() !== 'betalt') {
      return jsonError('Ordren er ikke markert som Betalt i Monday.', 409);
    }

    const jsonText = parseLongText(
      getColumn(orderItem, ORDER_COLUMNS.productJson)
    );
    if (!jsonText) return jsonError('Produkt JSON er tom på ordren.', 422);

    let storedOrder: StoredOrder;
    try {
      storedOrder = JSON.parse(jsonText) as StoredOrder;
    } catch {
      return jsonError('Produkt JSON inneholder ugyldig JSON.', 422);
    }

    if (
      !storedOrder?.product?.id ||
      !storedOrder?.customer?.name ||
      !storedOrder?.customer?.address ||
      !/^\d{4}$/.test(storedOrder?.customer?.postalCode || '') ||
      !storedOrder?.customer?.city ||
      !storedOrder?.customer?.email ||
      !storedOrder?.customer?.phone
    ) {
      return jsonError('Ordren mangler nødvendige kunde- eller produktdata.', 422);
    }

    if (storedOrder.customer.deliveryMethod !== 'Postsending') {
      return jsonError('Bring-etikett kan bare genereres for Postsending.', 409);
    }

    const packageData = await getPackageData(
      mondayApiKey,
      storedOrder.product.id
    );

    const correlationId = `${orderId}-${Date.now()}`;
    const payload = {
      schemaVersion: 1,
      consignments: [
        {
          shippingDateTime: shippingDateTimeNorway(),
          product: {
            id: BRING_PRODUCT_ID,
            customerNumber: bringCustomerNumber,
          },
          correlationId,
          parties: {
            sender: {
              name: 'Eiksenteret Sortland',
              addressLine: 'Verkstedveien 2',
              postalCode: '8402',
              city: 'Sortland',
              countryCode: 'NO',
              reference: orderId,
              contact: {
                name: 'Eiksenteret Sortland',
                email: 'sortland@eiksenteret.com',
                phoneNumber: '+4776121360',
              },
            },
            recipient: {
              name: storedOrder.customer.name,
              addressLine: storedOrder.customer.address,
              postalCode: storedOrder.customer.postalCode,
              city: storedOrder.customer.city,
              countryCode: 'NO',
              reference: orderId,
              contact: {
                name: storedOrder.customer.name,
                email: storedOrder.customer.email,
                phoneNumber: cleanPhone(storedOrder.customer.phone),
              },
            },
          },
          packages: [
            {
              weightInKg: packageData.weightInKg,
              goodsDescription: storedOrder.product.name,
              dimensions: {
                heightInCm: packageData.heightInCm,
                widthInCm: packageData.widthInCm,
                lengthInCm: packageData.lengthInCm,
              },
              correlationId: orderId,
            },
          ],
        },
      ],
    };

    const bringResponse = await fetch(BRING_BOOKING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Mybring-API-Uid': bringUid,
        'X-Mybring-API-Key': bringApiKey,
        'X-Bring-Client-URL': bringClientUrl,
        'X-Bring-Test-Indicator': String(testMode),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const bringText = await bringResponse.text();
    let bringData: any;
    try {
      bringData = JSON.parse(bringText);
    } catch {
      return jsonError('Bring returnerte et ugyldig svar.', 502, {
        status: bringResponse.status,
        response: bringText,
      });
    }

    const result = bringData?.consignments?.[0];
    if (!bringResponse.ok || result?.errors?.length || !result?.confirmation) {
      return jsonError('Bring avviste bookingen.', 502, {
        status: bringResponse.status,
        errors: result?.errors || bringData,
      });
    }

    const confirmation = result.confirmation;
    const packageNumber = confirmation?.packages?.[0]?.packageNumber;
    const consignmentNumber = confirmation?.consignmentNumber;
    const trackingNumber = String(packageNumber || consignmentNumber || '');
    const labelUrl = String(confirmation?.links?.labels || '');
    const trackingUrl = String(confirmation?.links?.tracking || '');

    if (!trackingNumber || !labelUrl) {
      return jsonError('Bring-responsen mangler sporingsnummer eller etikett.', 502);
    }

    // I testmodus oppretter Bring en testsending, men Monday endres ikke.
    if (!testMode) {
      await updateOrderAfterBooking({
        apiKey: mondayApiKey,
        boardId: orderBoardId,
        itemId: orderItem.id,
        trackingNumber,
        labelUrl,
      });
    }

    return NextResponse.json({
      success: true,
      testMode,
      mondayUpdated: !testMode,
      orderId,
      mondayItemId: orderItem.id,
      consignmentNumber,
      trackingNumber,
      trackingUrl,
      labelUrl,
      message: testMode
        ? 'Testsending opprettet. Monday ble ikke endret.'
        : 'Bring-sending opprettet og Monday oppdatert.',
    });
  } catch (error) {
    console.error('Feil i /api/bring/create-shipment:', error);
    return jsonError(
      error instanceof Error ? error.message : 'Kunne ikke opprette sending.',
      500
    );
  }
}
