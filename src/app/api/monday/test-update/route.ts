import { NextRequest, NextResponse } from "next/server";

const ORDER_BOARD_ID = "18430730386";
const TRACKING_COLUMN = "text_mm75q5sa";
const DATE_COLUMN = "date_mm75z9jw";
const PDF_COLUMN = "link_mm75mrj7";
const ORDER_NUMBER_COLUMN = "text_mm73e37c";

async function mondayRequest(query: string, variables: Record<string, unknown>) {
  const apiKey = process.env.MONDAY_API_KEY;

  const response = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      Authorization: apiKey || "",
      "Content-Type": "application/json",
      "API-Version": "2023-10",
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await response.json();

  if (!response.ok || data.errors) {
    throw new Error(
      data?.errors?.[0]?.message ||
        `Monday svarte med ${response.status}`
    );
  }

  return data;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const orderId = String(body?.orderId || "").trim();

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "Ordrenummer mangler" },
        { status: 400 }
      );
    }

    const findQuery = `
      query ($boardId: ID!) {
        boards(ids: [$boardId]) {
          items_page(limit: 500) {
            items {
              id
              name
              column_values(ids:["${ORDER_NUMBER_COLUMN}"]) {
                id
                text
              }
            }
          }
        }
      }
    `;

    const result = await mondayRequest(findQuery, {
      boardId: ORDER_BOARD_ID,
    });

    const items =
      result?.data?.boards?.[0]?.items_page?.items || [];

    const order = items.find(
      (item: any) =>
        item.column_values?.[0]?.text === orderId
    );

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: `Fant ikke ordre ${orderId}`,
        },
        { status: 404 }
      );
    }

    const mutation = `
      mutation ($boardId: ID!, $itemId: ID!, $values: JSON!) {
        change_multiple_column_values(
          board_id: $boardId
          item_id: $itemId
          column_values: $values
        ) {
          id
        }
      }
    `;

    const today = new Date().toISOString().split("T")[0];

    const values = {
      [TRACKING_COLUMN]: "TEST-TRACKING-12345",
      [DATE_COLUMN]: { date: today },
      [PDF_COLUMN]: {
        url: "https://example.com/test-label.pdf",
        text: "Testetikett",
      },
    };

    await mondayRequest(mutation, {
      boardId: ORDER_BOARD_ID,
      itemId: order.id,
      values: JSON.stringify(values),
    });

    return NextResponse.json({
      success: true,
      orderId,
      mondayItemId: order.id,
      trackingNumber: "TEST-TRACKING-12345",
      date: today,
      pdf: "https://example.com/test-label.pdf",
      message: "Monday-kolonnene ble oppdatert.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Ukjent feil",
      },
      { status: 500 }
    );
  }
}
