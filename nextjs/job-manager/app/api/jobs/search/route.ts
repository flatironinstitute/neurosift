/**
 * API Routes for Job Search
 *
 * This module provides endpoints for searching and filtering jobs based on
 * various criteria such as type, input, and status. Results are sorted
 * by creation date and limited to prevent overwhelming responses.
 */

import { FilterQuery } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import connectDB, { IJob, Job } from '../../../../lib/db';
import { validateApiKey } from '../../../../middleware/auth';

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
 * Search for jobs based on specified criteria
 *
 * @param request NextRequest containing optional filters:
 *   - type: Filter by job type
 *   - input: Filter by exact input match
 *   - status: Filter by job status
 * @returns
 *   - Success: Array of the caller's matching jobs (limited to 100, sorted by creation date)
 *   - Error: 401 without a valid API key, 500 for server errors
 *
 * The endpoint will:
 * 1. Build a query based on provided filters
 * 2. Return the most recent 100 matching jobs
 */
export async function POST(request: NextRequest) {
  // Job IDs act as the credential for reading, updating, and deleting a job,
  // so listing jobs must be restricted to the caller's own jobs: an
  // unauthenticated listing would hand out every ID.
  const auth = await validateApiKey(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const body = await request.json();
    const { type, input, status } = body;

    await connectDB();

    const query: FilterQuery<IJob> = { userId: auth.userId };
    if (type) query.type = type;
    if (input) query.input = typeof input === 'object' ? JSON.stringify(input) : input.toString();
    if (status) query.status = status;

    const jobs = await Job.find(query).sort({ createdAt: -1 }).limit(100);
    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Error searching jobs:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
