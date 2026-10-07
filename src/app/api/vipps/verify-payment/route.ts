import { NextRequest, NextResponse } from 'next/server';
import { getVippsPaymentStatus } from '@/lib/vipps';

const VERIFIED_STATES = new Set(['AUTHORIZED', 'CAPTURED']);
const FINAL_FAILURE_STATES = new Set([
  'ABORTED',
  'CANCELLED',
  'EXPIRED',
  'TERMINATED',
]);

function getBaseUrl(request: NextRequest): string {
  return request.nextUrl.origin.replace(/\/+$/, '');
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);

  try {
    const reference = request.nextUrl.searchParams.get('reference')?.trim();

    if (!reference || !/^[a-zA-Z0-9-]{8,64}$/.test(reference)) {
      return NextResponse.redirect(`${baseUrl}/?payment_error=invalid_reference`);
    }

    // Kjør complete-payment ÉN gang (uten dupliserende re-try)
    try {
      await fetch(`${baseUrl}/api/vipps/complete-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reference }),
        cache: 'no-store',
      });
    } catch (completeErr) {
      console.error('Feil under kjørsel av complete-payment:', completeErr);
    }

    const payment = await getVippsPaymentStatus(reference);
    const state = String(payment?.state || 'UNKNOWN').toUpperCase();

    if (VERIFIED_STATES.has(state)) {
      return NextResponse.redirect(
        `${baseUrl}/ordre-bekreftet?ordrenr=${encodeURIComponent(reference)}`
      );
    }

    if (FINAL_FAILURE_STATES.has(state)) {
      return NextResponse.redirect(`${baseUrl}/?payment_cancelled=true`);
    }

    return NextResponse.redirect(`${baseUrl}/?payment_pending=true`);
  } catch (error) {
    console.error('Feil ved verifisering av Vipps-betaling:', error);
    return NextResponse.redirect(`${baseUrl}/?payment_error=system_error`);
  }
}