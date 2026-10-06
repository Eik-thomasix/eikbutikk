import { NextRequest, NextResponse } from 'next/server';

function getInternalBaseUrl(request: NextRequest): string {
  return request.nextUrl.origin.replace(/\/+$/, '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body || {};

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'orderId mangler.' },
        { status: 400 }
      );
    }

    const adminSecret = process.env.BRING_ADMIN_SECRET?.trim();

    if (!adminSecret) {
      return NextResponse.json(
        { success: false, message: 'BRING_ADMIN_SECRET er ikke konfigurert i miljøvariablene.' },
        { status: 500 }
      );
    }

    const baseUrl = getInternalBaseUrl(request);

    // Kaller den ordinære create-shipment ruten med hemmelig nøkkel fra server-miljøet
    const response = await fetch(`${baseUrl}/api/bring/create-shipment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': adminSecret,
      },
      body: JSON.stringify({ orderId }),
      cache: 'no-store',
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Feil i /api/bring/test-shipment:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Ukjent feil under test-shipment.',
      },
      { status: 500 }
    );
  }
}