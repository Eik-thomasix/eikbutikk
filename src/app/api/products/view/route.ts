import { NextRequest, NextResponse } from 'next/server';

const VIEWS_COLUMN_ID = 'numeric_mm73dqv4';
const HOME_VIEWS_COLUMN_ID = 'numeric_mm75pe46';
const PRODUCT_BOARD_ID = process.env.MONDAY_BOARD_ID!;
const MONDAY_API_KEY = process.env.MONDAY_API_KEY!;

async function mondayRequest(query: string, variables: Record<string, unknown>) {
  const response = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      Authorization: MONDAY_API_KEY,
      'Content-Type': 'application/json',
      'API-Version': '2023-10',
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await response.json();

  if (!response.ok || data.errors) {
    throw new Error(JSON.stringify(data.errors || data));
  }

  return data;
}

export async function POST(req: NextRequest) {
  try {
    const { productId, type } = await req.json();

    if (!productId || !type) {
      return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
    }

    const query = `
      query ($boardId: ID!) {
        boards(ids: [$boardId]) {
          items_page(limit: 500) {
            items {
              id
              column_values(ids:["${VIEWS_COLUMN_ID}","${HOME_VIEWS_COLUMN_ID}"]) {
                id
                text
              }
            }
          }
        }
      }
    `;

    const data = await mondayRequest(query, {
      boardId: PRODUCT_BOARD_ID,
    });

    const items = data.data.boards[0].items_page.items;
    const item = items.find((i: any) => i.id === String(productId));

    if (!item) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    const columnId =
      type === 'product'
        ? VIEWS_COLUMN_ID
        : HOME_VIEWS_COLUMN_ID;

    const currentColumn = item.column_values.find(
      (c: any) => c.id === columnId
    );

    const currentValue = Number(currentColumn?.text || 0);
    const nextValue = currentValue + 1;

    const mutation = `
      mutation ($boardId: ID!, $itemId: ID!, $value: String!) {
        change_simple_column_value(
          board_id: $boardId
          item_id: $itemId
          column_id: \"${columnId}\"
          value: $value
        ) {
          id
        }
      }
    `;

    await mondayRequest(mutation, {
      boardId: PRODUCT_BOARD_ID,
      itemId: item.id,
      value: String(nextValue),
    });

    return NextResponse.json({
      success: true,
      previous: currentValue,
      current: nextValue,
      type,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
