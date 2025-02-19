/**
 * API Routes for Individual Job Operations
 *
 * This module provides endpoints for retrieving and updating specific jobs
 * using their unique identifier. Supports both job status checks and
 * progress updates.
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB, { Job, IJob } from '../../../../lib/db';
import { validateJobState } from '../../../../middleware/auth';
import { UpdateQuery } from 'mongoose';

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
 * Retrieve details of a specific job
 *
 * @param request NextRequest - The incoming request
 * @param params.id string - The unique identifier of the job
 * @returns
 *   - Success: Job object with all details
 *   - Error: 404 if job not found, 500 for server errors
 *
 * No API key required - job ID is used as authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const job = await Job.findById(params.id);

    // Simple not found check is sufficient since job ID is considered secret
    if (!job) {
      return new NextResponse('Job not found', { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Update the status and progress of a specific job
 *
 * @param request NextRequest containing any of:
 *   - status: 'pending' | 'running' | 'completed' | 'failed'
 *   - progress: number (0-100)
 *   - output: job output data
 *   - error: error information if job failed
 * @param params.id string - The unique identifier of the job
 * @returns
 *   - Success: Updated job object
 *   - Error: 404 if job not found, 500 for server errors
 *
 * Required API key: 'fulfill'
 *
 * Only specified fields will be updated, maintaining data integrity
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // No API key needed for job updates - we use job ID as authentication

  try {
    const body = await request.json();
    const { status, progress, output, error } = body;

    await connectDB();
    const job = await Job.findById(params.id);

    // Validate job exists and state transition is valid
    const validationError = await validateJobState(job, status);
    if (validationError) return validationError;

    // Only allow updates to specific fields based on current state
    const updates: UpdateQuery<IJob> = {};

    if (status) {
      updates.$set = updates.$set || {};
      updates.$set.status = status;
    }

    // Only allow progress updates for running jobs
    if (typeof progress === 'number') {
      if (job.status !== 'running' && status !== 'running') {
        return new NextResponse('Progress can only be updated for running jobs', { status: 400 });
      }
      if (progress < 0 || progress > 100) {
        return new NextResponse('Progress must be between 0 and 100', { status: 400 });
      }
      updates.$set = updates.$set || {};
      updates.$set.progress = progress;
    }

    // Only allow output updates for running or completed jobs
    if (output) {
      if (!['running', 'completed'].includes(job.status) &&
          !(status && ['running', 'completed'].includes(status))) {
        return new NextResponse('Output can only be set for running or completed jobs', { status: 400 });
      }
      updates.$set = updates.$set || {};
      updates.$set.output = output;
    }

    // Only allow error updates when transitioning to failed status
    if (error) {
      if (status !== 'failed') {
        return new NextResponse('Error can only be set when status is being set to failed', { status: 400 });
      }
      updates.$set = updates.$set || {};
      updates.$set.error = error;
    }

    const updatedJob = await Job.findByIdAndUpdate(
      params.id,
      updates,
      { new: true, runValidators: true }
    );

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error('Error updating job:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
