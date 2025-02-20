import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB, { User } from '../../../lib/db';

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * Create a new user with a unique API key
 * Requires admin secret key for authorization
 */
export async function POST(request: NextRequest) {
  // Only admin can create users
  const adminKey = process.env.ADMIN_SECRET_KEY;
  if (!adminKey) {
    return new NextResponse('Admin secret key not configured', { status: 500 });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== adminKey) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email, researchDescription } = body;

    if (!name || !email || !researchDescription) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    await connectDB();

    // Generate unique user ID and API key
    const userId = crypto.randomBytes(16).toString('hex');
    const apiKey = crypto.randomBytes(32).toString('hex');

    const newUser = await User.create({
      userId,
      apiKey,
      name,
      email,
      researchDescription
    });

    // Only return the API key during user creation
    return NextResponse.json({
      user: {
        userId: newUser.userId,
        name: newUser.name,
        email: newUser.email,
        researchDescription: newUser.researchDescription,
        createdAt: newUser.createdAt,
        apiKey // Include API key only in creation response
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * List all users (without API keys)
 * Requires admin secret key for authorization
 */
export async function GET(request: NextRequest) {
  // Only admin can list users
  const adminKey = process.env.ADMIN_SECRET_KEY;
  if (!adminKey) {
    return new NextResponse('Admin secret key not configured', { status: 500 });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== adminKey) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    await connectDB();

    const users = await User.find({}, {
      apiKey: 0 // Exclude API keys from the response
    }).sort({ createdAt: -1 });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error listing users:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
