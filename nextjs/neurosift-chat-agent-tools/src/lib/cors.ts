import { NextRequest, NextResponse } from 'next/server';

export const allowedOrigins = [
  'https://neurosift.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://neurosift-chat.vercel.app',
  'https://chat.neurosift.app',
];

export const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export function handleCorsHeaders(response: NextResponse, origin: string | null) {
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  return response;
}

export function handleOptionsRequest(request: NextRequest) {
  const origin = request.headers.get('origin');

  if (origin && allowedOrigins.includes(origin)) {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin,
        ...corsHeaders,
        'Access-Control-Max-Age': '86400' // 24 hours cache for preflight
      }
    });
  }
  return new NextResponse(null, { status: 204 });
}

export function createCorsResponse<T>(data: T, init?: ResponseInit & { headers?: { origin?: string } }) {
  const response = NextResponse.json(data, init);
  const origin = init?.headers?.origin;

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  return response;
}
