import { NextRequest, NextResponse } from 'next/server';
import connectDB, { User } from '../../../../../lib/db';
import { validateApiKey } from '../../../../../middleware/auth';

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

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // Only admin can retrieve API keys
  const adminKey = process.env.ADMIN_SECRET_KEY;
  const authHeader = request.headers.get('Authorization');
  const isAdmin = adminKey && authHeader?.split(' ')[1] === adminKey;

  if (!isAdmin) {
    return new NextResponse('Unauthorized - Admin access required', { status: 401 });
  }

  try {
    await connectDB();

    const user = await User.findOne({ userId: params.userId });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    return NextResponse.json({ apiKey: user.apiKey });
  } catch (error) {
    console.error('Error retrieving API key:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
