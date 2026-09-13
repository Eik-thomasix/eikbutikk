import { NextRequest, NextResponse } from 'next/server';

const EXPECTED_ORDER_BOARD_ID = '18430730386';
const SHIPPING_STATUS_COLUMN_ID = 'color_mm75212c';
const ORDER_NUMBER_COLUMN_ID = 'text_mm73e37c';
const READY_STATUS_LABEL = 'Klar for sending';
const FAILED_STATUS_LABEL = 'Feilet';

type MondayWebhookBody = {
  challenge?: string;
  event?: {
    boardId?: number | string;
    pulseId?: number | string;
    itemId?: number | string;
    columnId?: string;
    value?: {
      label?: {
        text?: string;
      };
    };
  };
};

type MondayColumnValue = {
  id: string;
  text?: string | null;
};

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      message,
      ...(details !== undefined ? { details } : {}),
    },
    { status }
  );
}

async function mondayRequest(
  query: string,
  variables: Record<string, unknown>
) {
  const apiKey = process.env.MONDAY_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('MONDAY_API_KEY mangler.');
  }

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

async function getOrderFromMonday(itemId: string) {
  const query = `
    query GetOrder($itemIds: [ID!]!) {
      items(ids: $itemIds) {
        id
        name
        board {
          id
        }
        column_values(ids: [
          "${ORDER_NUMBER_COLUMN_ID}",
          "${SHIPPING_STATUS_COLUMN_ID}"
        ]) {
          id
          text
        }
      }
    }
  `;

  const data = await mondayRequest(query, {
    itemIds: [itemId],
  });

  const item = data?.data?.items?.[0];

  if (!item) {
    throw new Error(`Fant ikke Monday-item ${itemId}.`);
  }

  if (String(item.board?.id) !== EXPECTED_ORDER_BOARD_ID) {
    throw new Error('Webhooken gjelder ikke forventet ordreboard.');
  }

  const columns: MondayColumnValue[] = item.column_values || [];
  const getText = (columnId: string) =>
    columns.find((column) => column.id === columnId)?.text?.trim() || '';

  return {
    itemId: String(item.id),
    itemName: String(item.name || ''),
    orderId: getText(ORDER_NUMBER_COLUMN_ID),
    shippingStatus: getText(SHIPPING_STATUS_COLUMN_ID),
  };
}

async function setShippingStatus(itemId: string, label: string) {
  const mutation = `
    mutation SetShippingStatus(
      $boardId: ID!
      $itemId: ID!
      $values: JSON!
    ) {
      change_multiple_column_values(
        board_id: $boardId
        item_id: $itemId
        column_values: $values
      ) {
        id
      }
    }
  `;

  await mondayRequest(mutation, {
    boardId: EXPECTED_ORDER_BOARD_ID,
    itemId,
    values: JSON.stringify({
      [SHIPPING_STATUS_COLUMN_ID]: { label },
    }),
  });
}

function getBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();

  if (configured) {
    const normalized =
      configured.startsWith('http://') || configured.startsWith('https://')
        ? configured
        : `https://${configured}`;

    return normalized.replace(/\/+$/, '');
  }

  return request.nextUrl.origin.replace(/\/+$/, '');
}

export async function POST(request: NextRequest) {
  let itemId = '';

  try {
    const body = (await request.json()) as MondayWebhookBody;

    // Monday sender en challenge ved oppkobling av webhooken.
    if (body.challenge) {
      return NextResponse.json({ challenge: body.challenge });
    }

    const event = body.event;
    itemId = String(event?.pulseId || event?.itemId || '').trim();
    const boardId = String(event?.boardId || '').trim();

    if (!itemId) {
      return jsonError('Webhooken mangler pulseId eller itemId.', 400, body);
    }

    if (boardId && boardId !== EXPECTED_ORDER_BOARD_ID) {
      return jsonError('Webhooken gjelder feil board.', 403);
    }

    if (
      event?.columnId &&
      event.columnId !== SHIPPING_STATUS_COLUMN_ID
    ) {
      return NextResponse.json({
        success: true,
        ignored: true,
        message: 'Endringen gjelder ikke Fraktstatus-kolonnen.',
      });
    }

    const order = await getOrderFromMonday(itemId);

    if (!order.orderId) {
      await setShippingStatus(itemId, FAILED_STATUS_LABEL);
      return jsonError('Ordren mangler ordrenummer i Monday.', 422);
    }

    if (order.shippingStatus !== READY_STATUS_LABEL) {
      return NextResponse.json({
        success: true,
        ignored: true,
        itemId,
        orderId: order.orderId,
        shippingStatus: order.shippingStatus,
        message: 'Fraktstatus er ikke Klar for sending.',
      });
    }

    const adminSecret = process.env.BRING_ADMIN_SECRET?.trim();

    if (!adminSecret) {
      await setShippingStatus(itemId, FAILED_STATUS_LABEL);
      return jsonError('BRING_ADMIN_SECRET mangler.', 503);
    }

    const createShipmentUrl = `${getBaseUrl(
      request
    )}/api/bring/create-shipment`;

    const shipmentResponse = await fetch(createShipmentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': adminSecret,
      },
      body: JSON.stringify({
        orderId: order.orderId,
      }),
      cache: 'no-store',
    });

    const shipmentData = await shipmentResponse.json();

    if (!shipmentResponse.ok || !shipmentData?.success) {
      await setShippingStatus(itemId, FAILED_STATUS_LABEL);

      console.error('Bring-booking fra Monday-webhook feilet:', {
        itemId,
        orderId: order.orderId,
        shipmentData,
      });

      return jsonError(
        shipmentData?.message || 'Bring-bookingen feilet.',
        502,
        shipmentData?.details
      );
    }

    // create-shipment oppdaterer Monday til Sendt i produksjonsmodus.
    // I testmodus lar vi Fraktstatus stå som Klar for sending.
    return NextResponse.json({
      success: true,
      itemId,
      orderId: order.orderId,
      testMode: Boolean(shipmentData.testMode),
      mondayUpdated: Boolean(shipmentData.mondayUpdated),
      trackingNumber: shipmentData.trackingNumber,
      trackingUrl: shipmentData.trackingUrl,
      labelUrl: shipmentData.labelUrl,
      message: shipmentData.testMode
        ? 'Bring-testsending opprettet. Monday ble ikke endret.'
        : 'Bring-sending opprettet og Monday oppdatert.',
    });
  } catch (error) {
    console.error('Feil i /api/monday/bring-webhook:', error);

    if (itemId) {
      try {
        await setShippingStatus(itemId, FAILED_STATUS_LABEL);
      } catch (statusError) {
        console.error('Kunne ikke sette Fraktstatus til Feilet:', statusError);
      }
    }

    return jsonError(
      error instanceof Error
        ? error.message
        : 'Webhooken kunne ikke behandles.',
      500
    );
  }
}
