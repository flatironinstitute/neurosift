/**
 * API Route for Getting Job Upload URLs
 *
 * This endpoint provides signed URLs for uploading job outputs to memobin
 * storage, but only for jobs that are currently in the running state.
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB, { Job } from '../../../../../lib/db';
import axios from 'axios';

/**
 * Generate a signed upload URL for job outputs
 *
 * @param request NextRequest containing:
 *   - fileName: Name of the file to upload (e.g., "result.json")
 * @param params.id string - The unique identifier of the job
 * @returns
 *   - Success: { uploadUrl: string, downloadUrl: string }
 *   - Error: 400 for invalid state/args, 404 if not found, 500 for server errors
 *
 * No API key required - job ID is used as authentication
 * Job must be in 'running' state to allow uploads
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // No API key needed - we use job ID as authentication
  await connectDB();
  const job = await Job.findById(params.id);

  if (!job) {
    return new NextResponse('Job not found', { status: 404 });
  }

  // Only allow uploads for running jobs
  if (job.status !== 'running') {
    return new NextResponse('Upload URLs can only be generated for running jobs', { status: 400 });
  }

  const MEMOBIN_API_KEY = process.env.MEMOBIN_API_KEY;
  if (!MEMOBIN_API_KEY) {
    console.error('MEMOBIN_API_KEY not configured');
    return new NextResponse('Server configuration error', { status: 500 });
  }

  try {
    const body = await request.json();
    const { fileName } = body;

    if (!fileName) {
      return new NextResponse('Missing fileName', { status: 400 });
    }

    // Construct the file path with outputs directory
    const path = `jobs/${params.id}/outputs/${fileName}`;
    const downloadUrl = `https://tempory.net/f/memobin/${path}`;

    // Get size parameter from request if provided, default to 10MB
    const size = body.size || 10 * 1024 * 1024;

    // Get signed URL from tempory.net
    const response = await axios.post(
      'https://hub.tempory.net/api/uploadFile',
      {
        appName: 'memobin',
        filePath: path,
        size: size,
        userId: 'neurosift',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MEMOBIN_API_KEY}`,
        },
      }
    );

    if (response.data.downloadUrl !== downloadUrl) {
      console.error('Mismatch between expected and received download URLs');
      return new NextResponse('Storage service error', { status: 500 });
    }

    return NextResponse.json({
      uploadUrl: response.data.uploadUrl,
      downloadUrl: response.data.downloadUrl,
    });

  } catch (error) {
    console.error('Error getting upload URL:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
