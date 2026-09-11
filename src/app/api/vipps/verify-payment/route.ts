import { NextRequest, NextResponse } from 'next/server';
import { getVippsPaymentStatus } from '@/lib/vipps';

const VERIFIED_STATES = new Set(['AUTHORIZED', 'CAPTURED']);
const FINAL_FAILURE_STATES = new Set([
  'ABORTED',
  'CANCELLED',
  'EXPIRED',
  'TERMINATED',
]);

export async function GET(request: NextRequest) {
  try {
    const reference = request.nextUrl.searchParams.get('reference')?.trim();

    if (!reference) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          message: 'Vipps-referanse mangler.',
        },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9-]{8,64}$/.test(reference)) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          message: 'Vipps-referansen har ugyldig format.',
        },
        { status: 400 }
      );
    }

    const payment = await getVippsPaymentStatus(reference);
    const state = String(payment?.state || 'UNKNOWN').toUpperCase();
    const verified = VERIFIED_STATES.has(state);
    const failed = FINAL_FAILURE_STATES.has(state);

    console.log('Vipps-betalingsstatus kontrollert:', {
      reference,
      state,
      verified,
    });

    return NextResponse.json({
      success: true,
      verified,
      failed,
      reference,
      state,
      authorizedAmount:
        payment?.aggregate?.authorizedAmount?.value ?? 0,
      capturedAmount:
        payment?.aggregate?.capturedAmount?.value ?? 0,
      currency:
        payment?.amount?.currency ||
        payment?.aggregate?.authorizedAmount?.currency ||
        'NOK',
    });
  } catch (error) {
    console.error('Feil ved verifisering av Vipps-betaling:', error);

    return NextResponse.json(
      {
        success: false,
        verified: false,
        message:
          error instanceof Error
            ? error.message
            : 'Kunne ikke verifisere betalingen hos Vipps.',
      },
      { status: 500 }
    );
  }
}
