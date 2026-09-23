import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch(
      'https://api.bring.com/booking/api/v1/ping',
      {
        method: 'GET',
        headers: {
          'X-Mybring-API-Uid': process.env.BRING_API_UID || '',
          'X-Mybring-API-Key': process.env.BRING_API_KEY || '',
          'X-Bring-Client-URL':
            process.env.BRING_CLIENT_URL ||
            'https://tilbudsboden.no',
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    );

    const text = await response.text();

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      response: text,
      config: {
        uid: process.env.BRING_API_UID,
        customerNumber: process.env.BRING_CUSTOMER_NUMBER,
        apiCustomer: process.env.BRING_API_CUSTOMER,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error',
      },
      { status: 500 }
    );
  }
}