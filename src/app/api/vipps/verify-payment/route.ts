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

    const payment = await getVippsPaymentStatus(reference);
    const state = String(payment?.state || 'UNKNOWN').toUpperCase();
    const verified = VERIFIED_STATES.has(state);
    const failed = FINAL_FAILURE_STATES.has(state);

    console.log('Vipps-betalingsstatus kontrollert:', {
      reference,
      state,
      verified,
      failed,
    });

    // 1. DERSOM BETALINGEN BLE GODKJENT
    if (verified) {
      try {
        // Kaller den interne ruten som oppdaterer Monday og oppretter Bring-booking
        await fetch(`${baseUrl}/api/vipps/complete-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reference }),
          cache: 'no-store',
        });
      } catch (completeError) {
        console.error('Feil under kjørsel av complete-payment:', completeError);
      }

      // Sender kunden til den visuelle kvitteringssiden
      return NextResponse.redirect(`${baseUrl}/ordre-bekreftet?orderId=${reference}`);
    }

    // 2. DERSOM BETALINGEN BLE AVBRUTT ELLER FEILET HOS VIPPS
    if (failed || state === 'ABORTED') {
      return NextResponse.redirect(`${baseUrl}/?payment_cancelled=true`);
    }

    // 3. EVENTUELLE ANDRE UKJENTE STATUSER
    return NextResponse.redirect(`${baseUrl}/?payment_pending=true`);
  } catch (error) {
    console.error('Feil ved verifisering av Vipps-betaling:', error);
    return NextResponse.redirect(`${baseUrl}/?payment_error=system_error`);
  }
}