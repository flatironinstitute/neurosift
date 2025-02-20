import { NextRequest, NextResponse } from 'next/server';
import connectDB, { User } from '../../../../lib/db';
import { validateApiKey } from '../../../../middleware/auth';

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS, POST',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * Get user details
 * Requires either:
 * - Admin secret key
 * - User's own API key
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // Admin key allows access to any user
  const adminKey = process.env.ADMIN_SECRET_KEY;
  const authHeader = request.headers.get('Authorization');
  const isAdmin = adminKey && authHeader?.split(' ')[1] === adminKey;

  if (!isAdmin) {
    const auth = await validateApiKey(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.userId !== params.userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  try {
    await connectDB();

    const user = await User.findOne(
      { userId: params.userId },
      { apiKey: 0 } // Exclude API key from response
    );

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error getting user:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Update user details
 * Requires either:
 * - Admin secret key
 * - User's own API key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // Only admin can delete users
  const adminKey = process.env.ADMIN_SECRET_KEY;
  const authHeader = request.headers.get('Authorization');
  const isAdmin = adminKey && authHeader?.split(' ')[1] === adminKey;

  if (!isAdmin) {
    return new NextResponse('Unauthorized - Admin access required', { status: 401 });
  }

  try {
    await connectDB();

    const result = await User.deleteOne({ userId: params.userId });

    if (result.deletedCount === 0) {
      return new NextResponse('User not found', { status: 404 });
    }

    return new NextResponse('User deleted successfully', { status: 200 });
  } catch (error) {
    console.error('Error deleting user:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Update user details
 * Requires either:
 * - Admin secret key
 * - User's own API key
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // Admin key allows access to any user
  const adminKey = process.env.ADMIN_SECRET_KEY;
  const authHeader = request.headers.get('Authorization');
  const isAdmin = adminKey && authHeader?.split(' ')[1] === adminKey;

  // Users can only update their own details unless they're admin
  if (!isAdmin && auth.userId !== params.userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email, researchDescription } = body;

    await connectDB();

    const user = await User.findOne({ userId: params.userId });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Update allowed fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (researchDescription) user.researchDescription = researchDescription;

    await user.save();

    // Return updated user without API key
    const userResponse = {
      userId: user.userId,
      name: user.name,
      email: user.email,
      researchDescription: user.researchDescription,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return NextResponse.json({ user: userResponse });
  } catch (error) {
    console.error('Error updating user:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
