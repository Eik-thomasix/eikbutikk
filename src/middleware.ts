import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Tillat tilgang til passordsiden og statiske filer/bilder uten passord
  if (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Sjekk om brukeren har en gyldig passord-cookie
  const authCookie = request.cookies.get('eikbutikk_auth');

  if (authCookie?.value === 'authenticated') {
    return NextResponse.next();
  }

  // Hvis ikke innlogget, omdiriger til /login
  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};