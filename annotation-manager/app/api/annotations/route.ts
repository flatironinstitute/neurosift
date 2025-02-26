import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB, { User, Annotation } from '../../../lib/db';

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * List annotations with optional filters
 * No authentication required for reading
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const targetType = searchParams.get('targetType');
  const type = searchParams.get('type');
  const userId = searchParams.get('userId');
  const tags = searchParams.get('tags')?.split(',');

  try {
    await connectDB();

    let query: any = {};
    if (targetType) query.targetType = targetType;
    if (type) query.type = type;
    if (userId) query.userId = userId;
    if (tags && tags.length > 0) query.tags = { $all: tags };

    const annotations = await Annotation.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ annotations });
  } catch (error) {
    console.error('Error listing annotations:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Create a new annotation
 * Requires NEUROSIFT_API_KEY for authentication
 */
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('Authorization')?.split(' ')[1];
  if (!apiKey) {
    return new NextResponse('Unauthorized - API key required', { status: 401 });
  }

  try {
    await connectDB();

    // Verify user by API key
    const user = await User.findOne({ apiKey });
    if (!user) {
      return new NextResponse('Unauthorized - Invalid API key', { status: 401 });
    }

    const body = await request.json();
    const { title, type, targetType, tags, data } = body;

    if (!title || !type || !targetType || !data) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Validate targetType
    const validTargetTypes = ['dandiset', 'openneuro_dataset', 'nwb_file'];
    if (!validTargetTypes.includes(targetType)) {
      return new NextResponse('Invalid targetType', { status: 400 });
    }

    const newAnnotation = await Annotation.create({
      id: crypto.randomBytes(16).toString('hex'),
      title,
      type,
      userId: user.userId,
      targetType,
      tags: tags || [],
      data
    });

    return NextResponse.json({ annotation: newAnnotation });
  } catch (error) {
    console.error('Error creating annotation:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Update an existing annotation
 * Requires NEUROSIFT_API_KEY and user must own the annotation
 */
export async function PUT(request: NextRequest) {
  const apiKey = request.headers.get('Authorization')?.split(' ')[1];
  if (!apiKey) {
    return new NextResponse('Unauthorized - API key required', { status: 401 });
  }

  try {
    await connectDB();

    // Verify user by API key
    const user = await User.findOne({ apiKey });
    if (!user) {
      return new NextResponse('Unauthorized - Invalid API key', { status: 401 });
    }

    const body = await request.json();
    const { id, type, targetType, tags, data } = body;

    if (!id) {
      return new NextResponse('Missing annotation ID', { status: 400 });
    }

    // Find existing annotation
    const annotation = await Annotation.findOne({ id });
    if (!annotation) {
      return new NextResponse('Annotation not found', { status: 404 });
    }

    // Check ownership
    if (annotation.userId !== user.userId) {
      return new NextResponse('Unauthorized - Not the annotation owner', { status: 403 });
    }

    // Validate targetType if provided
    if (targetType) {
      const validTargetTypes = ['dandiset', 'openneuro_dataset', 'nwb_file'];
      if (!validTargetTypes.includes(targetType)) {
        return new NextResponse('Invalid targetType', { status: 400 });
      }
    }

    // Update fields if provided
    const updateData: any = {};
    if (type) updateData.type = type;
    if (targetType) updateData.targetType = targetType;
    if (tags) updateData.tags = tags;
    if (data) updateData.data = data;

    const updatedAnnotation = await Annotation.findOneAndUpdate(
      { id },
      updateData,
      { new: true }
    );

    return NextResponse.json({ annotation: updatedAnnotation });
  } catch (error) {
    console.error('Error updating annotation:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Delete an annotation
 * Requires NEUROSIFT_API_KEY and user must own the annotation
 */
export async function DELETE(request: NextRequest) {
  const apiKey = request.headers.get('Authorization')?.split(' ')[1];
  if (!apiKey) {
    return new NextResponse('Unauthorized - API key required', { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  if (!id) {
    return new NextResponse('Missing annotation ID', { status: 400 });
  }

  try {
    await connectDB();

    // Verify user by API key
    const user = await User.findOne({ apiKey });
    if (!user) {
      return new NextResponse('Unauthorized - Invalid API key', { status: 401 });
    }

    // Find the annotation
    const annotation = await Annotation.findOne({ id });
    if (!annotation) {
      return new NextResponse('Annotation not found', { status: 404 });
    }

    // Check ownership
    if (annotation.userId !== user.userId) {
      return new NextResponse('Unauthorized - Not the annotation owner', { status: 403 });
    }

    await Annotation.deleteOne({ id });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting annotation:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
