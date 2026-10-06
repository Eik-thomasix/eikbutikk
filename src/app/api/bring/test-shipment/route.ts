import { NextRequest, NextResponse } from 'next/server';

const ORDER_COLUMNS = {
  paymentStatus: 'color_mm73ta14',
  orderStatus: 'color_mm73zcsm',
  vippsStatus: 'color_mm73pqa6',
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
    console.error('Monday-feil:', JSON.stringify(data, null, 2));
    throw new Error(
      data?.errors?.[0]?.message ||
        `Monday svarte med HTTP-status ${response.status}.`
    );
  }

  return data;
}

async function markOrderAsPaidInMonday(apiKey: string, boardId: string, orderId: string) {
  const findQuery = `
    query FindOrder($boardIds: [ID!]!, $cursor: String) {
      boards(ids: $boardIds) {
        items_page(limit: 100, cursor: $cursor) {
          cursor
          items {
            id
            name
            column_values(ids: ["text_mm73e37c"]) { id text }
          }
        }
      }
    }
  `;

  let cursor: string | null = null;
  let itemId: string | null = null;

  do {
    const data = await mondayRequest(apiKey, findQuery, {
      boardIds: [boardId],
      cursor,
    });
    const page = data?.data?.boards?.[0]?.items_page;
    const items = page?.items || [];

    const match = items.find((item: { column_values: { text?: string }[] }) =>
      item.column_values.some((col) => col.text?.trim() === orderId)
    );

    if (match) {
      itemId = match.id;
      break;
    }
    cursor = page?.cursor || null;
  } while (cursor);

  if (!itemId) {
    throw new Error(`Fant ikke ordren ${orderId} i Monday for å sette Betalt-status.`);
  }

  const updateMutation = `
    mutation MarkPaid($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(
        board_id: $boardId
        item_id: $itemId
        column_values: $columnValues
      ) { id }
    }
  `;

  await mondayRequest(apiKey, updateMutation, {
    boardId,
    itemId,
    columnValues: JSON.stringify({
      [ORDER_COLUMNS.paymentStatus]: { label: 'Betalt' },
      [ORDER_COLUMNS.orderStatus]: { label: 'Behandles' },
      [ORDER_COLUMNS.vippsStatus]: { label: 'Test' },
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body || {};

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'orderId mangler.' },
        { status: 400 }
      );
    }

    const adminSecret = process.env.BRING_ADMIN_SECRET?.trim();
    const mondayApiKey = process.env.MONDAY_API_KEY?.trim();
    const orderBoardId = process.env.MONDAY_ORDER_BOARD_ID?.trim();

    if (!adminSecret || !mondayApiKey || !orderBoardId) {
      return NextResponse.json(
        { success: false, message: 'Miljøvariabler for Bring eller Monday mangler.' },
        { status: 500 }
      );
    }

    // 1. Markér ordren som Betalt i Monday først
    await markOrderAsPaidInMonday(mondayApiKey, orderBoardId, orderId);

    // 2. Kall ordinær Bring-booking
    const baseUrl = getInternalBaseUrl(request);
    const response = await fetch(`${baseUrl}/api/bring/create-shipment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': adminSecret,
      },
      body: JSON.stringify({ orderId }),
      cache: 'no-store',
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Feil i /api/bring/test-shipment:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Ukjent feil under test-shipment.',
      },
      { status: 500 }
    );
  }
}