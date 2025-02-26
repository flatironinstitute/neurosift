import { NextRequest, NextResponse } from 'next/server';
import connectDB, { User } from '../../../../lib/db';

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * Get user ID from API key
 * This endpoint is publicly accessible but only returns minimal user info
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new NextResponse('API key required', { status: 401 });
  }

  const apiKey = authHeader.split(' ')[1];

  try {
    await connectDB();

    const user = await User.findOne({ apiKey });

    if (!user) {
      return new NextResponse('Invalid API key', { status: 401 });
    }

    // Only return minimal user info
    return NextResponse.json({
      userId: user.userId,
      name: user.name
    });
  } catch (error) {
    console.error('Error validating API key:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
