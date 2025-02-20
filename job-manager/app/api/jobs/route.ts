/**
 * API Routes for Job Creation
 *
 * This module provides endpoints for creating new jobs in the job management system.
 * Jobs are uniquely identified by their type and input, and the system prevents
 * duplicate job creation for the same type/input combination.
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB, { IJob, Job } from '../../../lib/db';
import { validateApiKey } from '../../../middleware/auth';

/**
 * Handle CORS preflight requests
 * Enables cross-origin requests from the development server
 *
 * @returns Response with appropriate CORS headers
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * Create a new job or return existing job ID if a matching job exists
 *
 * @param request NextRequest containing:
 *   - type: The type of job to create
 *   - input: The job input parameters (can be object or primitive)
 * @returns
 *   - Success: { jobId: string } - ID of created/existing job
 *   - Error: 400 if missing fields, 500 for server errors
 *
 * Required API key: 'submit'
 *
 * The endpoint will:
 * 1. Validate the submit API key
 * 2. Check for required fields (type, input)
 * 3. Look for existing job with same type/input
 * 4. Create new job if no matching job exists
 * 5. Return the job ID (either new or existing)
 */
export async function POST(request: NextRequest) {
  // Validate API key and get user info
  const auth = await validateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { type, input } = body;

    if (!type || !input) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    await connectDB();

    // Convert input to string if it's an object
    const inputString = typeof input === 'object' ? JSON.stringify(input) : input.toString();

    // Check for existing job with same type, input, and user
    const existingJob = await Job.findOne({
      type,
      input: inputString,
      userId: auth.userId,
      status: { $in: ['pending', 'running', 'completed'] }
    });

    if (existingJob) {
      return NextResponse.json({ jobId: existingJob._id });
    }

    const newJob: Omit<IJob, 'createdAt' | 'updatedAt'> = {
      type,
      input: inputString,
      status: 'pending',
      progress: 0,
      userId: auth.userId
    };

    const job = await Job.create(newJob);

    return NextResponse.json({ jobId: job._id });
  } catch (error) {
    console.error('Error creating job:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
