import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

type VippsWebhookEvent = {
  msn?: string;
  reference?: string;
  pspReference?: string;
  name?: string;
  timestamp?: string;
  idempotencyKey?: string;
  success?: boolean;
  amount?: {
    currency?: string;
    value?: number;
  };
};

const PROCESSABLE_EVENTS = new Set([
  'AUTHORIZED',
  'CAPTURED',
  'ABORTED',
  'EXPIRED',
  'CANCELLED',
  'TERMINATED',
]);

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function verifyVippsWebhook(request: NextRequest, rawBody: string): boolean {
  const secret = process.env.VIPPS_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error('VIPPS_WEBHOOK_SECRET mangler.');
  }

  const date = request.headers.get('x-ms-date')?.trim() || '';
  const contentHash =
    request.headers.get('x-ms-content-sha256')?.trim() || '';
  const authorization = request.headers.get('authorization')?.trim() || '';
  const host = request.headers.get('host')?.trim() || request.nextUrl.host;

  if (!date || !contentHash || !authorization || !host) return false;

  const calculatedContentHash = createHash('sha256')
    .update(rawBody, 'utf8')
    .digest('base64');

  if (!safeEqual(calculatedContentHash, contentHash)) return false;

  const pathAndQuery = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const signedString = `POST\n${pathAndQuery}\n${date};${host};${contentHash}`;
  const signature = createHmac('sha256', secret)
    .update(signedString, 'utf8')
    .digest('base64');
  const expectedAuthorization =
    `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`;

  return safeEqual(expectedAuthorization, authorization);
}

function getInternalBaseUrl(request: NextRequest): string {
  return request.nextUrl.origin.replace(/\/+$/, '');
}

export async function POST(request: NextRequest) {
  let event: VippsWebhookEvent | null = null;

  try {
    const rawBody = await request.text();

    if (!verifyVippsWebhook(request, rawBody)) {
      return NextResponse.json(
        { success: false, message: 'Ugyldig webhook-signatur.' },
        { status: 401 }
      );
    }

    try {
      event = JSON.parse(rawBody) as VippsWebhookEvent;
    } catch {
      return NextResponse.json(
        { success: false, message: 'Webhooken inneholder ugyldig JSON.' },
        { status: 400 }
      );
    }

    const reference = String(event.reference || '').trim();
    const eventName = String(event.name || '').trim().toUpperCase();
    const expectedMsn = process.env.VIPPS_MERCHANT_SERIAL_NUMBER?.trim();
    const receivedMsn = String(event.msn || '').trim();

    if (!reference || !/^[a-zA-Z0-9-]{8,64}$/.test(reference)) {
      return NextResponse.json(
        { success: false, message: 'Webhooken mangler gyldig betalingsreferanse.' },
        { status: 400 }
      );
    }

    if (expectedMsn && receivedMsn && expectedMsn !== receivedMsn) {
      return NextResponse.json(
        { success: false, message: 'Webhooken gjelder feil salgssted.' },
        { status: 403 }
      );
    }

    if (!PROCESSABLE_EVENTS.has(eventName)) {
      return NextResponse.json({
        success: true,
        ignored: true,
        reference,
        event: eventName || 'UNKNOWN',
      });
    }

    const completeResponse = await fetch(
      `${getInternalBaseUrl(request)}/api/vipps/complete-payment`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
        cache: 'no-store',
      }
    );
    const completeData = await completeResponse.json();

    if (!completeResponse.ok) {
      const state = String(completeData?.state || '').toUpperCase();
      const finalFailureHandled =
        ['ABORTED', 'EXPIRED', 'CANCELLED', 'TERMINATED'].includes(state) &&
        completeResponse.status === 409;

      if (!finalFailureHandled) {
        console.error('Vipps-webhook kunne ikke fullføre ordrebehandlingen:', {
          reference,
          eventName,
          status: completeResponse.status,
          completeData,
        });
        return NextResponse.json(
          {
            success: false,
            message:
              completeData?.message ||
              'Ordrebehandlingen etter Vipps-webhook feilet.',
            reference,
            event: eventName,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      reference,
      event: eventName,
      processed: Boolean(completeData?.success),
      alreadyCompleted: Boolean(completeData?.alreadyCompleted),
      state: completeData?.state,
    });
  } catch (error) {
    console.error('Feil i Vipps-webhook:', {
      reference: event?.reference,
      event: event?.name,
      error,
    });
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Vipps-webhooken kunne ikke behandles.',
      },
      { status: 500 }
    );
  }
}
