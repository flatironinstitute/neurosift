import type { NextRequest } from 'next/server';
import { handleCorsHeaders, handleOptionsRequest } from '@/lib/cors';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return handleOptionsRequest(request);
  }

  const response = NextResponse.next();
  return handleCorsHeaders(response, request.headers.get('origin'));
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
};
