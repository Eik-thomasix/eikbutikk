import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    // Hent passord fra miljøvariabel eller bruk standard "Sortland2026"
    const correctPassword = process.env.SITE_PASSWORD || 'Sortland2026';

    if (password === correctPassword) {
      const response = NextResponse.json({ success: true });
      
      // Sett en sikker cookie som matcher middleware (site_access)
      response.cookies.set('site_access', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 dager
        path: '/',
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: 'Feil passord' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'En feil oppstod' },
      { status: 500 }
    );
  }
}