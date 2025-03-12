import { NextRequest, NextResponse } from 'next/server';
import connectDB, { Annotation, Blob } from '../../../../lib/db';

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

/**
 * Get a single annotation by ID with optional blob expansion
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const searchParams = request.nextUrl.searchParams;
  const expandBlobs = searchParams.get('expandBlobs') === 'true';
  const { id } = params;

  try {
    await connectDB();

    const annotation = await Annotation.findOne({ id });
    if (!annotation) {
      return new NextResponse('Annotation not found', { status: 404 });
    }

    const result = annotation.toObject();

    // If expandBlobs is true and the data contains a blob reference, expand it
    if (expandBlobs && typeof result.data === 'object' && result.data.content && result.data.content.startsWith('blob:')) {
      const blobId = result.data.content.substring(5); // Remove 'blob:' prefix
      const blob = await Blob.findOne({ id: blobId });
      if (blob) {
        result.data.content = blob.content;
      }
    }

    return NextResponse.json({ annotation: result });
  } catch (error) {
    console.error('Error retrieving annotation:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
