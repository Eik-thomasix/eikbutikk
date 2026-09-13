import { NextRequest, NextResponse } from 'next/server';
import { getVippsPaymentStatus } from '@/lib/vipps';

/**
 * Complete payment route for Eikbutikk.
 *
 * Flow:
 * 1. Receive a Vipps reference.
 * 2. Verify the payment directly with Vipps.
 * 3. Find the matching order in Monday.
 * 4. Read trusted product and customer data from "Produkt JSON".
 * 5. Call the existing /api/checkout route.
 * 6. Mark the Monday order as paid and stock-updated.
 * 7. Return the URL for the confirmation page.
 *
 * IMPORTANT:
 * Vipps AUTHORIZED means the customer approved the payment and the amount is
 * reserved. CAPTURED means the amount has been captured. This route accepts
 * both states for testing. See TODO CAPTURE below before production launch.
 */

const ORDER_GROUPS = {
  waiting: 'group_mm738d0y',
  paid: 'group_mm73t3k9',
  processing: 'group_mm73ae8b',
  cancelled: 'group_mm7317nf',
} as const;

const ORDER_COLUMNS = {
  orderNumber: 'text_mm73e37c',
  vippsOrderId: 'text_mm73k8jh',
  paymentStatus: 'color_mm73ta14',
  orderStatus: 'color_mm73zcsm',
  vippsStatus: 'color_mm73pqa6',
  stockUpdated: 'boolean_mm73w05',
  processedDate: 'date_mm73p2e2',
  productJson: 'long_text_mm73r6vx',
} as const;

const VERIFIED_STATES = new Set(['AUTHORIZED', 'CAPTURED']);
const FAILED_STATES = new Set([
  'ABORTED',
  'CANCELLED',
  'EXPIRED',
  'TERMINATED',
]);

interface StoredOrderData {
  orderId: string;
  product: Record<string, unknown> & {
    id: string;
    name: string;
    salePrice: number;
    stock?: number;
    itemNumber?: string;
  };
  customer: Record<string, unknown> & {
    name: string;
    email: string;
    phone: string;
    deliveryMethod?: string;
  };
  createdAt?: string;
  processed?: boolean;
}

interface MondayColumnValue {
  id: string;
  text?: string | null;
  value?: string | null;
}

interface MondayOrderItem {
  id: string;
  name: string;
  group?: {
    id: string;
    title: string;
  } | null;
  column_values: MondayColumnValue[];
}

function norwegianDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

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

  if (!response.ok) {
    console.error('Monday HTTP error:', response.status, data);
    throw new Error(`Monday svarte med HTTP-status ${response.status}.`);
  }

  if (data.errors) {
    console.error('Monday GraphQL error:', JSON.stringify(data.errors, null, 2));
    throw new Error(
      data.errors[0]?.message || 'Monday returnerte en GraphQL-feil.'
    );
  }

  return data;
}

function getColumn(item: MondayOrderItem, columnId: string) {
  return item.column_values.find((column) => column.id === columnId);
}

function parseMondayLongText(column?: MondayColumnValue): string {
  if (!column) {
    return '';
  }

  if (column.text?.trim()) {
    return column.text.trim();
  }

  if (!column.value) {
    return '';
  }

  try {
    const parsed = JSON.parse(column.value);

    if (typeof parsed === 'string') {
      return parsed;
    }

    if (typeof parsed?.text === 'string') {
      return parsed.text;
    }
  } catch {
    return column.value;
  }

  return '';
}

function isChecked(column?: MondayColumnValue): boolean {
  const text = column?.text?.trim().toLowerCase();

  if (text === 'v' || text === 'yes' || text === 'true' || text === 'checked') {
    return true;
  }

  if (!column?.value) {
    return false;
  }

  try {
    const parsed = JSON.parse(column.value);
    return parsed?.checked === 'true' || parsed?.checked === true;
  } catch {
    return false;
  }
}

async function findMondayOrder(
  apiKey: string,
  boardId: string,
  reference: string
): Promise<MondayOrderItem | null> {
  const query = `
    query FindOrder($boardIds: [ID!]!, $cursor: String) {
      boards(ids: $boardIds) {
        items_page(limit: 100, cursor: $cursor) {
          cursor
          items {
            id
            name
            group {
              id
              title
            }
            column_values(ids: [
              "${ORDER_COLUMNS.orderNumber}",
              "${ORDER_COLUMNS.vippsOrderId}",
              "${ORDER_COLUMNS.paymentStatus}",
              "${ORDER_COLUMNS.orderStatus}",
              "${ORDER_COLUMNS.vippsStatus}",
              "${ORDER_COLUMNS.stockUpdated}",
              "${ORDER_COLUMNS.productJson}"
            ]) {
              id
              text
              value
            }
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

    const match = items.find((item) => {
      const orderNumber = getColumn(item, ORDER_COLUMNS.orderNumber)?.text?.trim();
      const vippsOrderId = getColumn(item, ORDER_COLUMNS.vippsOrderId)?.text?.trim();
      return orderNumber === reference || vippsOrderId === reference;
    });

    if (match) {
      return match;
    }

    cursor = page?.cursor || null;
  } while (cursor);

  return null;
}

async function updateMondayOrder(params: {
  apiKey: string;
  boardId: string;
  itemId: string;
  columnValues: Record<string, unknown>;
  groupId?: string;
}) {
  const { apiKey, boardId, itemId, columnValues, groupId } = params;

  if (Object.keys(columnValues).length > 0) {
    const mutation = `
      mutation UpdateOrder(
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
      itemId,
      columnValues: JSON.stringify(columnValues),
    });
  }

  if (groupId) {
    const moveMutation = `
      mutation MoveOrder($itemId: ID!, $groupId: String!) {
        move_item_to_group(item_id: $itemId, group_id: $groupId) {
          id
        }
      }
    `;

    await mondayRequest(apiKey, moveMutation, {
      itemId,
      groupId,
    });
  }
}

function validateStoredOrder(data: unknown): asserts data is StoredOrderData {
  const order = data as StoredOrderData;

  if (
    !order ||
    !order.orderId ||
    !order.product?.id ||
    !order.product?.name ||
    !Number.isFinite(Number(order.product?.salePrice)) ||
    !order.customer?.name ||
    !order.customer?.email ||
    !order.customer?.phone
  ) {
    throw new Error('Produkt JSON mangler nødvendige ordreopplysninger.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const reference = String(body?.reference || '').trim();

    if (!reference) {
      return NextResponse.json(
        { success: false, message: 'Vipps-referanse mangler.' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9-]{8,64}$/.test(reference)) {
      return NextResponse.json(
        { success: false, message: 'Vipps-referansen har ugyldig format.' },
        { status: 400 }
      );
    }

    const mondayApiKey = process.env.MONDAY_API_KEY?.trim();
    const orderBoardId = process.env.MONDAY_ORDER_BOARD_ID?.trim();

    if (!mondayApiKey || !orderBoardId) {
      throw new Error('Monday-konfigurasjonen for ordre mangler.');
    }

    const payment = await getVippsPaymentStatus(reference);
    const state = String(payment?.state || 'UNKNOWN').toUpperCase();

    if (FAILED_STATES.has(state)) {
      const failedOrder = await findMondayOrder(
        mondayApiKey,
        orderBoardId,
        reference
      );

      if (failedOrder) {
        await updateMondayOrder({
          apiKey: mondayApiKey,
          boardId: orderBoardId,
          itemId: failedOrder.id,
          groupId: ORDER_GROUPS.cancelled,
          columnValues: {
            [ORDER_COLUMNS.paymentStatus]: { label: 'Feilet' },
            [ORDER_COLUMNS.vippsStatus]: { label: 'Feilet' },
          },
        });
      }

      return NextResponse.json(
        {
          success: false,
          verified: false,
          state,
          message: 'Vipps-betalingen ble ikke fullført.',
        },
        { status: 409 }
      );
    }

    if (!VERIFIED_STATES.has(state)) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          pending: true,
          state,
          message: 'Betalingen er ikke ferdig behandlet hos Vipps ennå.',
        },
        { status: 409 }
      );
    }

    const mondayOrder = await findMondayOrder(
      mondayApiKey,
      orderBoardId,
      reference
    );

    if (!mondayOrder) {
      return NextResponse.json(
        {
          success: false,
          verified: true,
          state,
          message: `Fant ingen Monday-ordre for ${reference}.`,
        },
        { status: 404 }
      );
    }

    const stockAlreadyUpdated = isChecked(
      getColumn(mondayOrder, ORDER_COLUMNS.stockUpdated)
    );

    if (stockAlreadyUpdated) {
      return NextResponse.json({
        success: true,
        verified: true,
        alreadyCompleted: true,
        state,
        reference,
        redirect: `/ordre-bekreftet?ordrenr=${encodeURIComponent(reference)}`,
      });
    }

    const productJson = parseMondayLongText(
      getColumn(mondayOrder, ORDER_COLUMNS.productJson)
    );

    if (!productJson) {
      throw new Error('Produkt JSON er tom på Monday-ordren.');
    }

    let storedOrder: unknown;

    try {
      storedOrder = JSON.parse(productJson);
    } catch {
      throw new Error('Produkt JSON inneholder ugyldig JSON.');
    }

    validateStoredOrder(storedOrder);

    if (storedOrder.orderId !== reference) {
      throw new Error('Vipps-referansen samsvarer ikke med lagret ordre.');
    }

    const authorizedAmount = Number(
      payment?.aggregate?.authorizedAmount?.value || 0
    );
    const capturedAmount = Number(
      payment?.aggregate?.capturedAmount?.value || 0
    );
    const expectedAmount = Math.round(Number(storedOrder.product.totalPrice ??(Number(storedOrder.product.salePrice) + Number(storedOrder.product.shippingPrice || 0))) * 100);
    const confirmedAmount = Math.max(authorizedAmount, capturedAmount);

    if (confirmedAmount !== expectedAmount) {
      throw new Error(
        `Beløpet hos Vipps (${confirmedAmount}) samsvarer ikke med ordren (${expectedAmount}).`
      );
    }

    /*
     * TODO CAPTURE BEFORE PRODUCTION:
     * AUTHORIZED reserves the amount, while CAPTURED confirms capture.
     * Decide whether Eikbutikk should capture automatically here or only when
     * the product is shipped/collected. Do not describe an AUTHORIZED payment
     * as captured in customer communication.
     */

    const checkoutResponse = await fetch(
      `${getInternalBaseUrl(request)}/api/checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product: storedOrder.product,
          customer: storedOrder.customer,
          payment: {
            reference,
            state,
            authorizedAmount,
            capturedAmount,
          },
        }),
        cache: 'no-store',
      }
    );

    const checkoutData = await checkoutResponse.json();

    if (!checkoutResponse.ok || !checkoutData?.success) {
      throw new Error(
        checkoutData?.message ||
          'Checkout klarte ikke å oppdatere lager eller sende ordredata.'
      );
    }

    const vippsLabel = state === 'CAPTURED' ? 'Captured' : 'Autorisert';

    await updateMondayOrder({
      apiKey: mondayApiKey,
      boardId: orderBoardId,
      itemId: mondayOrder.id,
      groupId: ORDER_GROUPS.processing,
      columnValues: {
        [ORDER_COLUMNS.paymentStatus]: { label: 'Betalt' },
        [ORDER_COLUMNS.vippsStatus]: { label: vippsLabel },
        [ORDER_COLUMNS.orderStatus]: { label: 'Behandles' },
        [ORDER_COLUMNS.stockUpdated]: { checked: 'true' },
        [ORDER_COLUMNS.processedDate]: { date: norwegianDate() },
      },
    });

    console.log('Vipps-ordre fullført:', {
      reference,
      state,
      mondayItemId: mondayOrder.id,
    });

    return NextResponse.json({
      success: true,
      verified: true,
      state,
      reference,
      redirect: `/ordre-bekreftet?ordrenr=${encodeURIComponent(reference)}`,
    });
  } catch (error) {
    console.error('Feil i /api/vipps/complete-payment:', error);

    return NextResponse.json(
      {
        success: false,
        verified: false,
        message:
          error instanceof Error
            ? error.message
            : 'Kunne ikke fullføre Vipps-ordren.',
      },
      { status: 500 }
    );
  }
}
