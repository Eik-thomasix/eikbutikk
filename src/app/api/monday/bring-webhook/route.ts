import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('====================================');
    console.log('MONDAY WEBHOOK RECEIVED');
    console.log(JSON.stringify(body, null, 2));
    console.log('====================================');

    // Monday sender en challenge når webhook-adressen kobles til.
    if (body?.challenge) {
      console.log('MONDAY WEBHOOK CHALLENGE RECEIVED');

      return NextResponse.json({
        challenge: body.challenge,
      });
    }

    return NextResponse.json({
      success: true,
      received: true,
      timestamp: new Date().toISOString(),
      message: 'Webhook-payload mottatt og logget i Vercel.',
    });
  } catch (error) {
    console.error('MONDAY WEBHOOK ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Webhooken kunne ikke leses.',
      },
      { status: 500 }
    );
  }
}
