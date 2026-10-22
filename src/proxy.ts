import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/images/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/vilkar') || pathname.startsWith('/angreskjema')) {
    return NextResponse.next();
  }

  if (searchParams.has('vipps_order') || searchParams.has('status')) {
    return NextResponse.next();
  }

  if (request.cookies.get('site_access')?.value === 'authenticated') {
    return NextResponse.next();
  }

  if (pathname === '/login') {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
