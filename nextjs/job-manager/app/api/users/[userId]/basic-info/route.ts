import { NextRequest, NextResponse } from 'next/server';
import connectDB, { User } from '../../../../../lib/db';

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

/**
 * Get basic user info (just name for now)
 * This endpoint is publicly accessible
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await connectDB();

    const user = await User.findOne(
      { userId: params.userId },
      { name: 1 } // Only retrieve the name field
    );

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Return just the name
    return NextResponse.json({
      name: user.name
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
