import { NextRequest, NextResponse } from 'next/server';

const ORDER_BOARD_ID = '18430730386';
const SHIPPING_STATUS_COLUMN_ID = 'color_mm75212c';
const ORDER_NUMBER_COLUMN_ID = 'text_mm73e37c';

const STATUS_READY = 'Klar for sending';
const STATUS_SENT = 'Sendt';
const STATUS_FAILED = 'Feilet';

type MondayWebhookBody = {
  challenge?: string;
  event?: {
    app?: string;
    type?: string;
    boardId?: number | string;
    groupId?: string;
    pulseId?: number | string;
    itemId?: number | string;
    pulseName?: string;
    columnId?: string;
    columnTitle?: string;
    isRetry?: boolean;
    triggerUuid?: string;
    value?: {
      label?: {
        index?: number;
        text?: string;
      };
    };
    previousValue?: {
      label?: {
        index?: number;
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
    console.error('Monday API-feil:', JSON.stringify(data, null, 2));
    throw new Error(
      data?.errors?.[0]?.message ||
        `Monday svarte med HTTP-status ${response.status}.`
    );
  }

  return data;
}

async function getOrder(itemId: string) {
  const query = `
    query GetOrder($itemIds: [ID!]!) {
      items(ids: $itemIds) {
        id
        name
        board { id }
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

  const data = await mondayRequest(query, { itemIds: [itemId] });
  const item = data?.data?.items?.[0];

  if (!item) {
    throw new Error(`Fant ikke Monday-item ${itemId}.`);
  }

  if (String(item.board?.id) !== ORDER_BOARD_ID) {
    throw new Error('Monday-itemet ligger ikke på forventet ordreboard.');
  }

  const columns: MondayColumnValue[] = item.column_values || [];
  const text = (columnId: string) =>
    columns.find((column) => column.id === columnId)?.text?.trim() || '';

  return {
    itemId: String(item.id),
    itemName: String(item.name || ''),
    orderId: text(ORDER_NUMBER_COLUMN_ID),
    shippingStatus: text(SHIPPING_STATUS_COLUMN_ID),
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
      ) { id }
    }
  `;

  await mondayRequest(mutation, {
    boardId: ORDER_BOARD_ID,
    itemId,
    values: JSON.stringify({
      [SHIPPING_STATUS_COLUMN_ID]: { label },
    }),
  });
}

function getBaseUrl(request: NextRequest): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();

  if (configuredBaseUrl) {
    const normalized =
      configuredBaseUrl.startsWith('http://') ||
      configuredBaseUrl.startsWith('https://')
        ? configuredBaseUrl
        : `https://${configuredBaseUrl}`;

    return normalized.replace(/\/+$/, '');
  }

  return request.nextUrl.origin.replace(/\/+$/, '');
}

export async function POST(request: NextRequest) {
  let itemId = '';
  let orderId = '';

  try {
    const body = (await request.json()) as MondayWebhookBody;

    console.log('Monday Bring-webhook mottatt:', JSON.stringify(body, null, 2));

    // Kreves når webhook-adressen kobles til i Monday.
    if (body.challenge) {
      return NextResponse.json({ challenge: body.challenge });
    }

    const event = body.event;

    if (!event) {
      return jsonError('Webhooken mangler event-objekt.', 400);
    }

    itemId = String(event.pulseId || event.itemId || '').trim();
    const boardId = String(event.boardId || '').trim();
    const newStatus = String(event.value?.label?.text || '').trim();

    if (!itemId) {
      return jsonError('Webhooken mangler pulseId eller itemId.', 400);
    }

    if (boardId !== ORDER_BOARD_ID) {
      return NextResponse.json({
        success: true,
        ignored: true,
        message: 'Webhooken gjelder et annet board.',
      });
    }

    if (event.columnId !== SHIPPING_STATUS_COLUMN_ID) {
      return NextResponse.json({
        success: true,
        ignored: true,
        message: 'Webhooken gjelder ikke Fraktstatus-kolonnen.',
      });
    }

    if (newStatus !== STATUS_READY) {
      return NextResponse.json({
        success: true,
        ignored: true,
        itemId,
        newStatus,
        message: 'Fraktstatus er ikke Klar for sending.',
      });
    }

    const order = await getOrder(itemId);
    orderId = order.orderId;

    if (!orderId) {
      await setShippingStatus(itemId, STATUS_FAILED);
      return jsonError('Ordren mangler ordrenummer i Monday.', 422);
    }

    // Les status fra Monday på nytt for å unngå å bruke et gammelt webhook-event.
    if (order.shippingStatus !== STATUS_READY) {
      return NextResponse.json({
        success: true,
        ignored: true,
        itemId,
        orderId,
        shippingStatus: order.shippingStatus,
        message: 'Fraktstatus er ikke lenger Klar for sending.',
      });
    }

    const adminSecret = process.env.BRING_ADMIN_SECRET?.trim();

    if (!adminSecret) {
      await setShippingStatus(itemId, STATUS_FAILED);
      return jsonError('BRING_ADMIN_SECRET mangler.', 503);
    }

    const createShipmentUrl = `${getBaseUrl(
      request
    )}/api/bring/create-shipment`;

    console.log('Starter Bring-booking fra Monday:', {
      itemId,
      orderId,
      createShipmentUrl,
    });

    const shipmentResponse = await fetch(createShipmentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': adminSecret,
      },
      body: JSON.stringify({ orderId }),
      cache: 'no-store',
    });

    const shipmentText = await shipmentResponse.text();
    let shipmentData: any;

    try {
      shipmentData = JSON.parse(shipmentText);
    } catch {
      await setShippingStatus(itemId, STATUS_FAILED);
      return jsonError('Bring-ruten returnerte et ugyldig svar.', 502, {
        status: shipmentResponse.status,
        response: shipmentText,
      });
    }

    if (!shipmentResponse.ok || !shipmentData?.success) {
      await setShippingStatus(itemId, STATUS_FAILED);

      console.error('Bring-booking fra Monday feilet:', {
        itemId,
        orderId,
        status: shipmentResponse.status,
        shipmentData,
      });

      return jsonError(
        shipmentData?.message || 'Bring-bookingen feilet.',
        502,
        shipmentData?.details || shipmentData
      );
    }

    const testMode = Boolean(shipmentData.testMode);

    if (!testMode) {
      // create-shipment fyller sporingsnummer, sendingsdato, PDF og flytter
      // ordren. Webhooken fullfører Fraktstatus separat.
      await setShippingStatus(itemId, STATUS_SENT);
    }

    console.log('Monday Bring-webhook fullført:', {
      itemId,
      orderId,
      testMode,
      mondayUpdated: Boolean(shipmentData.mondayUpdated),
      trackingNumber: shipmentData.trackingNumber,
    });

    return NextResponse.json({
      success: true,
      itemId,
      orderId,
      testMode,
      mondayUpdated: Boolean(shipmentData.mondayUpdated),
      trackingNumber: shipmentData.trackingNumber,
      trackingUrl: shipmentData.trackingUrl,
      labelUrl: shipmentData.labelUrl,
      message: testMode
        ? 'Bring-testsending opprettet. Fraktstatus står fortsatt som Klar for sending.'
        : 'Bring-sending opprettet. Fraktstatus er satt til Sendt.',
    });
  } catch (error) {
    console.error('Feil i /api/monday/bring-webhook:', error);

    if (itemId) {
      try {
        await setShippingStatus(itemId, STATUS_FAILED);
      } catch (statusError) {
        console.error('Kunne ikke sette Fraktstatus til Feilet:', statusError);
      }
    }

    return jsonError(
      error instanceof Error
        ? error.message
        : 'Webhooken kunne ikke behandles.',
      500,
      { itemId, orderId }
    );
  }
}
