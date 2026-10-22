import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { captureVippsPayment } from '@/lib/vipps';

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key');

const ORDER_BOARD_ID = '18430730386';
const SHIPPING_STATUS_COLUMN_ID = 'color_mm75212c';
const ORDER_NUMBER_COLUMN_ID = 'text_mm73e37c';
const PRODUCT_JSON_COLUMN_ID = 'long_text_mm73r6vx';
const ORDER_STATUS_COLUMN_ID = 'color_mm73zcsm';
const PAYMENT_STATUS_COLUMN_ID = 'color_mm73ta14';
const VIPPS_STATUS_COLUMN_ID = 'color_mm73pqa6';
const PROCESSING_GROUP_ID = 'group_mm73ae8b';
const COMPLETED_GROUP_ID = 'group_mm73mky8';

const STATUS_READY = 'Klar for sending';
const STATUS_READY_PICKUP = 'Klar for henting';
const STATUS_PICKED_UP = 'Hentet';
const STATUS_SENT = 'Sendt';
const STATUS_FAILED = 'Feilet';

// Beholdes under test. I testmodus sendes sendingsmailen kun hit.
const TEST_EMAIL_ADDRESS = 'thomasix@gmail.com';

type MondayWebhookBody = {
  challenge?: string;
  event?: {
    boardId?: number | string;
    pulseId?: number | string;
    itemId?: number | string;
    columnId?: string;
    value?: { label?: { text?: string } };
  };
};

type MondayColumnValue = {
  id: string;
  text?: string | null;
  value?: string | null;
};

type StoredOrder = {
  orderId: string;
  product: {
    id: string;
    name: string;
    itemNumber?: string;
    salePrice?: number;
    shippingPrice?: number;
    totalPrice?: number;
  };
  customer: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    deliveryMethod?: string;
  };
  shipping?: {
    price?: number;
    weight?: number;
    deliveryMethod?: string;
  };
};

type ShipmentResult = {
  success?: boolean;
  testMode?: boolean;
  mondayUpdated?: boolean;
  alreadyBooked?: boolean;
  trackingNumber?: string;
  trackingUrl?: string;
  labelUrl?: string;
  message?: string;
  details?: unknown;
};

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, message, ...(details !== undefined ? { details } : {}) },
    { status }
  );
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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

function getOrderTotal(order: StoredOrder): number {
  const salePrice = Number(order.product.salePrice || 0);
  const shippingPrice = Number(order.product.shippingPrice || order.shipping?.price || 0);
  const storedTotal = Number(order.product.totalPrice || 0);
  const total = storedTotal > 0 ? storedTotal : salePrice + shippingPrice;
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error('Ordren mangler gyldig totalbeløp for Vipps capture.');
  }
  return total;
}

async function mondayRequest(
  query: string,
  variables: Record<string, unknown>
) {
  const apiKey = process.env.MONDAY_API_KEY?.trim();
  if (!apiKey) throw new Error('MONDAY_API_KEY mangler.');

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
          "${SHIPPING_STATUS_COLUMN_ID}",
          "${PRODUCT_JSON_COLUMN_ID}"
        ]) { id text value }
      }
    }
  `;

  const data = await mondayRequest(query, { itemIds: [itemId] });
  const item = data?.data?.items?.[0];
  if (!item) throw new Error(`Fant ikke Monday-item ${itemId}.`);
  if (String(item.board?.id) !== ORDER_BOARD_ID) {
    throw new Error('Monday-itemet ligger ikke på forventet ordreboard.');
  }

  const columns: MondayColumnValue[] = item.column_values || [];
  const getColumn = (id: string) => columns.find((column) => column.id === id);

  const productJson = parseLongText(getColumn(PRODUCT_JSON_COLUMN_ID));
  let storedOrder: StoredOrder | null = null;

  if (productJson) {
    try {
      storedOrder = JSON.parse(productJson) as StoredOrder;
    } catch {
      throw new Error('Produkt JSON inneholder ugyldig JSON.');
    }
  }

  return {
    itemId: String(item.id),
    orderId: getColumn(ORDER_NUMBER_COLUMN_ID)?.text?.trim() || '',
    shippingStatus:
      getColumn(SHIPPING_STATUS_COLUMN_ID)?.text?.trim() || '',
    storedOrder,
  };
}

async function setShippingStatus(itemId: string, label: string) {
  const mutation = `
    mutation SetShippingStatus($boardId: ID!, $itemId: ID!, $values: JSON!) {
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

async function updatePickupOrder(params: {
  itemId: string;
  orderStatus: string;
  moveToGroupId?: string;
}) {
  const mutation = `
    mutation UpdatePickupOrder(
      $boardId: ID!
      $itemId: ID!
      $values: JSON!
      $groupId: String
    ) {
      change_multiple_column_values(
        board_id: $boardId
        item_id: $itemId
        column_values: $values
      ) { id }
      ${params.moveToGroupId ? 'move_item_to_group(item_id: $itemId, group_id: $groupId) { id }' : ''}
    }
  `;
  await mondayRequest(mutation, {
    boardId: ORDER_BOARD_ID,
    itemId: params.itemId,
    values: JSON.stringify({
      [ORDER_STATUS_COLUMN_ID]: { label: params.orderStatus },
      [PAYMENT_STATUS_COLUMN_ID]: { label: 'Betalt' },
      [VIPPS_STATUS_COLUMN_ID]: { label: 'Captured' },
    }),
    ...(params.moveToGroupId ? { groupId: params.moveToGroupId } : {}),
  });
}

function getBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (!configured) return request.nextUrl.origin.replace(/\/+$/, '');

  const normalized =
    configured.startsWith('http://') || configured.startsWith('https://')
      ? configured
      : `https://${configured}`;

  return normalized.replace(/\/+$/, '');
}

async function sendShipmentEmail(params: {
  order: StoredOrder;
  orderId: string;
  trackingNumber: string;
  trackingUrl: string;
  testMode: boolean;
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY mangler.');
  }

  const { order, orderId, trackingNumber, trackingUrl, testMode } = params;
  const recipient = testMode ? TEST_EMAIL_ADDRESS : order.customer.email;

  if (!recipient) throw new Error('Kundens e-postadresse mangler.');
  if (!trackingUrl) throw new Error('Sporingslenken fra Bring mangler.');

  const safe = {
    customerName: escapeHtml(order.customer.name),
    customerEmail: escapeHtml(order.customer.email),
    productName: escapeHtml(order.product.name),
    itemNumber: escapeHtml(order.product.itemNumber || 'Ikke oppgitt'),
    orderId: escapeHtml(orderId),
    trackingNumber: escapeHtml(trackingNumber),
    trackingUrl: escapeHtml(trackingUrl),
  };

  const testNotice = testMode
    ? `<div style="margin:0 0 20px;padding:12px 14px;border:1px solid #fcd34d;background:#fffbeb;border-radius:8px;color:#92400e;font-size:12px;line-height:1.5;"><strong>Testmodus:</strong> Denne sendingsmailen er sendt til ${TEST_EMAIL_ADDRESS}. Kundens registrerte e-post er ${safe.customerEmail}.</div>`
    : '';

  const html = `
    <div style="margin:0;background:#f3f4f6;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <div style="background:#d71920;color:#ffffff;padding:24px;text-align:center;">
          <h1 style="margin:0;font-size:24px;">Tilbudsboden.no</h1>
          <p style="margin:6px 0 0;font-size:14px;">Fra Eiksenteret Sortland</p>
        </div>

        <div style="padding:28px;">
          ${testNotice}
          <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Ordre ${safe.orderId}</p>
          <h2 style="margin:0 0 16px;font-size:22px;">Varen din er registrert for sending</h2>
          <p style="margin:0 0 22px;color:#374151;font-size:14px;line-height:1.65;">
            Hei ${safe.customerName}. Bestillingen din er registrert for sending fra Eiksenteret Sortland. Du kan følge pakken med informasjonen nedenfor.
          </p>

          <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:0 0 22px;">
            <div style="background:#f9fafb;padding:14px 16px;font-weight:bold;color:#d71920;">Sendingsinformasjon</div>
            <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:11px 16px;border-top:1px solid #e5e7eb;font-weight:bold;">Ordrenummer</td><td style="padding:11px 16px;border-top:1px solid #e5e7eb;text-align:right;">${safe.orderId}</td></tr>
              <tr><td style="padding:11px 16px;border-top:1px solid #e5e7eb;font-weight:bold;">Varenummer</td><td style="padding:11px 16px;border-top:1px solid #e5e7eb;text-align:right;">${safe.itemNumber}</td></tr>
              <tr><td style="padding:11px 16px;border-top:1px solid #e5e7eb;font-weight:bold;">Produkt</td><td style="padding:11px 16px;border-top:1px solid #e5e7eb;text-align:right;">${safe.productName}</td></tr>
              <tr><td style="padding:11px 16px;border-top:1px solid #e5e7eb;font-weight:bold;">Sporingsnummer</td><td style="padding:11px 16px;border-top:1px solid #e5e7eb;text-align:right;word-break:break-all;">${safe.trackingNumber}</td></tr>
            </table>
          </div>

          <div style="text-align:center;margin:0 0 24px;">
            <a href="${safe.trackingUrl}" style="display:inline-block;background:#d71920;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 24px;border-radius:8px;">Spor pakken</a>
          </div>

          <div style="background:#f3f4f6;border-radius:8px;padding:15px;font-size:13px;line-height:1.55;color:#374151;">
            Sporingen kan bruke litt tid på Ã¥ bli synlig etter at sendingen er registrert hos Bring.
          </div>

          <p style="margin:22px 0 0;font-size:13px;line-height:1.55;color:#4b5563;">
            Spørsmål om bestillingen?<br>
            Eiksenteret Sortland, Verkstedveien 2, 8402 Sortland<br>
            Telefon: 76 12 13 60 · <a href="mailto:sortland@eiksenteret.no" style="color:#d71920;">sortland@eiksenteret.no</a>
          </p>
        </div>
      </div>
    </div>
  `;

  const result = await resend.emails.send({
    from: 'Eiksenteret Sortland | Tilbudsboden <ordre@tilbudsboden.no>',
    replyTo: 'sortland@eiksenteret.no',
    to: [recipient],
    subject: `${testMode ? '[TEST] ' : ''}Varen din er registrert for sending | Ordre ${orderId}`,
    html,
  });

  if (result.error) {
    throw new Error(result.error.message || 'Resend avviste sendingsmailen.');
  }

  return recipient;
}

async function sendPickupReadyEmail(params: {
  order: StoredOrder;
  orderId: string;
}) {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY mangler.');
  const safe = {
    customerName: escapeHtml(params.order.customer.name),
    productName: escapeHtml(params.order.product.name),
    itemNumber: escapeHtml(params.order.product.itemNumber || 'Ikke oppgitt'),
    orderId: escapeHtml(params.orderId),
  };
  const result = await resend.emails.send({
    from: 'Eiksenteret Sortland | Tilbudsboden <ordre@tilbudsboden.no>',
    replyTo: 'sortland@eiksenteret.no',
    to: [params.order.customer.email],
    subject: `Bestillingen er klar for henting | Ordre ${params.orderId}`,
    html: `
      <div style="margin:0;background:#f3f4f6;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
        <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <div style="background:#d71920;color:#ffffff;padding:24px;text-align:center;">
            <h1 style="margin:0;font-size:24px;">Tilbudsboden.no</h1>
            <p style="margin:6px 0 0;font-size:14px;">Fra Eiksenteret Sortland</p>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Ordre ${safe.orderId}</p>
            <h2 style="margin:0 0 16px;font-size:22px;">Bestillingen er klar for henting</h2>
            <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.65;">Hei ${safe.customerName}. Varen din er nå kontrollert og klar for henting hos Eiksenteret Sortland.</p>
            <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:0 0 20px;background:#f9fafb;font-size:14px;line-height:1.6;">
              <strong>Produkt:</strong> ${safe.productName}<br>
              <strong>Varenummer:</strong> ${safe.itemNumber}<br>
              <strong>Hentested:</strong> Verkstedveien 2, 8402 Sortland<br>
              <strong>Ordrenummer:</strong> ${safe.orderId}
            </div>
            <p style="margin:0;color:#4b5563;font-size:13px;line-height:1.55;">Oppgi gjerne ordrenummeret ved henting. Spørsmål? Ring 76 12 13 60 eller svar på denne e-posten.</p>
          </div>
        </div>
      </div>
    `,
  });
  if (result.error) throw new Error(result.error.message || 'Resend avviste hentemailen.');
}

export async function POST(request: NextRequest) {
  let itemId = '';

  try {
    const body = (await request.json()) as MondayWebhookBody;

    if (body.challenge) {
      return NextResponse.json({ challenge: body.challenge });
    }

    const event = body.event;
    if (!event) return jsonError('Webhooken mangler event-objekt.', 400);

    itemId = String(event.pulseId || event.itemId || '').trim();
    const boardId = String(event.boardId || '').trim();
    const newStatus = String(event.value?.label?.text || '').trim();

    if (!itemId) return jsonError('Webhooken mangler item-ID.', 400);

    const supportedStatus = [STATUS_READY, STATUS_READY_PICKUP, STATUS_PICKED_UP].includes(newStatus);
    if (
      boardId !== ORDER_BOARD_ID ||
      event.columnId !== SHIPPING_STATUS_COLUMN_ID ||
      !supportedStatus
    ) {
      return NextResponse.json({
        success: true,
        ignored: true,
        message: 'Webhook-hendelsen skal ikke starte ordrebehandling.',
      });
    }
    const order = await getOrder(itemId);
    if (!order.orderId || !order.storedOrder) {
      await setShippingStatus(itemId, STATUS_FAILED);
      return jsonError('Ordren mangler ordrenummer eller Produkt JSON.', 422);
    }

    if (order.shippingStatus !== newStatus) {
      return NextResponse.json({
        success: true,
        ignored: true,
        message: 'Fraktstatus er endret siden webhook-hendelsen ble mottatt.',
      });
    }

    const deliveryMethod = order.storedOrder.customer.deliveryMethod || order.storedOrder.shipping?.deliveryMethod;

    if (newStatus === STATUS_READY_PICKUP) {
      if (deliveryMethod !== 'Henting i butikk') {
        await setShippingStatus(itemId, STATUS_FAILED);
        return jsonError('Klar for henting kan bare brukes på henteordrer.', 409);
      }
      if (process.env.VIPPS_CAPTURE_ENABLED !== 'true') {
        await setShippingStatus(itemId, STATUS_FAILED);
        return jsonError('Vipps capture er ikke aktivert.', 503);
      }
      const captureResult = await captureVippsPayment({
        reference: order.orderId,
        amountInNok: getOrderTotal(order.storedOrder),
      });
      await updatePickupOrder({
        itemId,
        orderStatus: STATUS_READY_PICKUP,
        moveToGroupId: PROCESSING_GROUP_ID,
      });
      await sendPickupReadyEmail({ order: order.storedOrder, orderId: order.orderId });
      return NextResponse.json({
        success: true,
        itemId,
        orderId: order.orderId,
        vippsCaptured: true,
        vippsAlreadyCaptured: captureResult.alreadyCaptured,
        capturedAmountInEre: captureResult.capturedAmountInEre,
        emailSent: true,
        message: 'Henteordren er captured og kunden er varslet.',
      });
    }

    if (newStatus === STATUS_PICKED_UP) {
      if (deliveryMethod !== 'Henting i butikk') {
        await setShippingStatus(itemId, STATUS_FAILED);
        return jsonError('Hentet kan bare brukes på henteordrer.', 409);
      }
      await updatePickupOrder({
        itemId,
        orderStatus: STATUS_PICKED_UP,
        moveToGroupId: COMPLETED_GROUP_ID,
      });
      return NextResponse.json({
        success: true,
        itemId,
        orderId: order.orderId,
        message: 'Henteordren er markert som hentet og fullført.',
      });
    }

    if (deliveryMethod !== 'Postsending') {
      await setShippingStatus(itemId, STATUS_FAILED);
      return jsonError('Klar for sending kan bare brukes på postordrer.', 409);
    }

    const adminSecret = process.env.BRING_ADMIN_SECRET?.trim();

    if (!adminSecret) {
      await setShippingStatus(itemId, STATUS_FAILED);
      return jsonError('BRING_ADMIN_SECRET mangler.', 503);
    }

    const response = await fetch(
      `${getBaseUrl(request)}/api/bring/create-shipment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify({ orderId: order.orderId }),
        cache: 'no-store',
      }
    );

    const shipmentData = (await response.json()) as ShipmentResult;

    if (!response.ok || !shipmentData.success) {
      await setShippingStatus(itemId, STATUS_FAILED);
      return jsonError(
        shipmentData.message || 'Bring-bookingen feilet.',
        502,
        shipmentData.details
      );
    }

    const trackingNumber = String(shipmentData.trackingNumber || '').trim();
    const trackingUrl = String(shipmentData.trackingUrl || '').trim();
    const testMode = Boolean(shipmentData.testMode);

    if (!trackingNumber || !trackingUrl) {
      await setShippingStatus(itemId, STATUS_FAILED);
      return jsonError('Bring-responsen mangler sporing.', 502);
    }

    if (!testMode) {
      await setShippingStatus(itemId, STATUS_SENT);
    }

    const emailRecipient = await sendShipmentEmail({
      order: order.storedOrder,
      orderId: order.orderId,
      trackingNumber,
      trackingUrl,
      testMode,
    });

    console.log('Bring-webhook og sendingsmail fullført:', {
      itemId,
      orderId: order.orderId,
      testMode,
      emailRecipient,
      trackingNumber,
    });

    return NextResponse.json({
      success: true,
      itemId,
      orderId: order.orderId,
      testMode,
      mondayUpdated: Boolean(shipmentData.mondayUpdated),
      trackingNumber,
      trackingUrl,
      labelUrl: shipmentData.labelUrl,
      emailSent: true,
      emailRecipient,
      message: testMode
        ? 'Bring-testsending og testmail ble opprettet. Monday ble ikke endret.'
        : 'Bring-sending, Monday-oppdatering og sendingsmail er fullført.',
    });
  } catch (error) {
    console.error('Feil i Monday Bring-webhook:', error);

    if (itemId) {
      try {
        await setShippingStatus(itemId, STATUS_FAILED);
      } catch (statusError) {
        console.error('Kunne ikke sette Fraktstatus til Feilet:', statusError);
      }
    }

    return jsonError(
      error instanceof Error ? error.message : 'Webhooken kunne ikke behandles.',
      500
    );
  }
}
