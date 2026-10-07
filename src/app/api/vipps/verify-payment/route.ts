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

    // 1. Tving komplett ferdigstilling (Monday, lagertrekk, e-post og Bring-booking)
    let completeSuccess = false;
    try {
      const completeRes = await fetch(`${baseUrl}/api/vipps/complete-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reference }),
        cache: 'no-store',
      });

      const completeData = await completeRes.json();
      if (completeRes.ok && completeData.success) {
        completeSuccess = true;
      } else {
        console.warn('complete-payment returnerte ikke suksess på første forsøk:', completeData);
      }
    } catch (completeErr) {
      console.error('Feil under kjørsel av complete-payment:', completeErr);
    }

    // 2. Hvis første forsøk ikke var i mål, vent 1.5 sek og prøv én gang til (hvis Vipps brukte litt tid)
    if (!completeSuccess) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        const retryRes = await fetch(`${baseUrl}/api/vipps/complete-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reference }),
          cache: 'no-store',
        });

        const retryData = await retryRes.json();
        if (retryRes.ok && retryData.success) {
          completeSuccess = true;
        }
      } catch (retryErr) {
        console.error('Feil under re-try av complete-payment:', retryErr);
      }
    }

    // 3. Verifiser den endelige Vipps-statusen
    const payment = await getVippsPaymentStatus(reference);
    const state = String(payment?.state || 'UNKNOWN').toUpperCase();

    if (VERIFIED_STATES.has(state) || completeSuccess) {
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