import { NextRequest, NextResponse } from 'next/server';

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

    const completeResponse = await fetch(
      `${baseUrl}/api/vipps/complete-payment`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
        cache: 'no-store',
      }
    );
    const completeData = await completeResponse.json();
    const state = String(completeData?.state || 'UNKNOWN').toUpperCase();

    if (completeResponse.ok && completeData?.success) {
      return NextResponse.redirect(
        `${baseUrl}/ordre-bekreftet?ordrenr=${encodeURIComponent(reference)}`
      );
    }

    if (completeData?.pending) {
      return NextResponse.redirect(`${baseUrl}/?payment_pending=true`);
    }

    if (FINAL_FAILURE_STATES.has(state)) {
      return NextResponse.redirect(`${baseUrl}/?payment_cancelled=true`);
    }

    return NextResponse.redirect(
      `${baseUrl}/?payment_error=order_processing&reference=${encodeURIComponent(reference)}`
    );
  } catch (error) {
    console.error('Feil ved verifisering av Vipps-betaling:', error);
    return NextResponse.redirect(`${baseUrl}/?payment_error=system_error`);
  }
}
