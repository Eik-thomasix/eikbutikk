import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 1. Unnta Next.js sin bilde-optimizer, statiske filer, API og bilder
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/images/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. Unnta salgsvilkår
  if (pathname.startsWith('/vilkar')) {
    return NextResponse.next();
  }

  // 3. Unnta kunder som returnerer fra Vipps
  if (searchParams.has('vipps_order') || searchParams.has('status')) {
    return NextResponse.next();
  }

  // 4. Sjekk innloggings-cookie
  const authCookie = request.cookies.get('site_access');
  if (authCookie?.value === 'authenticated') {
    return NextResponse.next();
  }

  // 5. Unnta innloggingssiden
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // Send uautentiserte brukere til passordskjermen
  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Pass på at _next/image eksplisitt unntas fra matcher
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};