import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 1. Unnta statiske filer, bilder og API-endepunkter fra passordbeskyttelse
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. Unnta salgsvilkår (slik at Vipps sine kontrollører kan lese dem fritt)
  if (pathname.startsWith('/vilkar')) {
    return NextResponse.next();
  }

  // 3. Unnta kunder som returnerer direkte fra en fullført Vipps-betaling
  if (searchParams.has('vipps_order') || searchParams.has('status')) {
    return NextResponse.next();
  }

  // 4. Sjekk om brukeren allerede er innlogget med passord-cookie
  const authCookie = request.cookies.get('site_access');
  if (authCookie?.value === 'authenticated') {
    return NextResponse.next();
  }

  // 5. Unnta selve innloggingssiden/passordskjermen
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // Send uautentiserte brukere til passordskjermen
  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};