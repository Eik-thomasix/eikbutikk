import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export async function POST(request: Request) {
  try {
    const correctPassword = process.env.SITE_PASSWORD?.trim();
    if (!correctPassword) {
      console.error('SITE_PASSWORD mangler. Innlogging er deaktivert.');
      return NextResponse.json(
        { success: false, message: 'Innlogging er midlertidig utilgjengelig.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!password || !safeEqual(password, correctPassword)) {
      return NextResponse.json(
        { success: false, message: 'Feil passord' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('site_access', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 12,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Feil i innlogging:', error);
    return NextResponse.json(
      { success: false, message: 'En feil oppstod' },
      { status: 500 }
    );
  }
}
