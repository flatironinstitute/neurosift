import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import connectDB, { User, Annotation, Blob, IAnnotationDocument } from '../../../lib/db';

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
  const expandBlobs = searchParams.get('expandBlobs') === 'true';

  const results = await Promise.all(annotations.map(async (annotation: IAnnotationDocument) => {
    const result = annotation.toObject();
    if (expandBlobs && typeof result.data === 'object' && result.data.content && result.data.content.startsWith('blob:')) {
      const blobId = result.data.content.substring(5);
      const blob = await Blob.findOne({ id: blobId });
      if (blob) {
        result.data.content = blob.content;
      }
    }
    return result;
  }));

  return NextResponse.json({ annotations: results });
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

    const annotationId = crypto.randomBytes(16).toString('hex');
    let finalData = data;

    // Check if data content is larger than 10000 bytes
    if (typeof data === 'object' && data.content && Buffer.from(data.content).length > 10000) {
      const blobId = crypto.randomBytes(16).toString('hex');
      await Blob.create({
        id: blobId,
        content: data.content,
        annotationId,
        createdAt: new Date()
      });
      finalData = {
        ...data,
        content: `blob:${blobId}`
      };
    }

    const newAnnotation = await Annotation.create({
      id: annotationId,
      title,
      type,
      userId: user.userId,
      targetType,
      tags: tags || [],
      data: finalData
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
    const { id, type, title, targetType, tags, data } = body;

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

    // Initialize update data
    const updateData: any = {};
    if (type) updateData.type = type;
    if (targetType) updateData.targetType = targetType;
    if (title) updateData.title = title;
    if (tags) updateData.tags = tags;

    updateData.updatedAt = new Date();

    // Handle blob update if data is provided
    let finalData = data;
    if (data !== undefined) {
      // If current data is a blob, delete it
      if (typeof annotation.data === 'object' && annotation.data.content && annotation.data.content.startsWith('blob:')) {
        const oldBlobId = annotation.data.content.substring(5);
        await Blob.deleteOne({ id: oldBlobId });
      }

      // If new data is large enough, create new blob
      if (typeof data === 'object' && data.content && Buffer.from(data.content).length > 10000) {
        const blobId = crypto.randomBytes(16).toString('hex');
        await Blob.create({
          id: blobId,
          content: data.content,
          annotationId: id,
          createdAt: new Date()
        });
        finalData = {
          ...data,
          content: `blob:${blobId}`
        };
      }
    }

    if (data !== undefined) {
      updateData.data = finalData;
    }

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

    const existingAnnotation = await Annotation.findOne({ id });
    if (existingAnnotation) {
      // Check if the annotation data is a blob reference
      if (typeof annotation.data === 'object' && annotation.data.content && annotation.data.content.startsWith('blob:')) {
        const blobId = annotation.data.content.substring(5);
        await Blob.deleteOne({ id: blobId });
      }
      await Annotation.deleteOne({ id });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting annotation:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
