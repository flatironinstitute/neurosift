import { NextRequest, NextResponse } from 'next/server';

export function validateApiKey(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const providedKey = authHeader.split(' ')[1];
  const expectedKey = process.env.API_SUBMIT_KEY;

  if (!expectedKey || providedKey !== expectedKey) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  return null;
}

import { IJobDocument } from '../lib/db';

// Validate that the job ID in the URL matches an existing job
// and that the job is in an appropriate state for the requested operation
export async function validateJobState(job: IJobDocument, newStatus?: string) {
  if (!job) {
    return new NextResponse('Job not found', { status: 404 });
  }

  if (newStatus) {
    // Validate state transitions
    const validTransitions: { [key: string]: string[] } = {
      'pending': ['running'],
      'running': ['completed', 'failed'],
      'completed': [],
      'failed': []
    };

    const allowedNextStates = validTransitions[job.status] || [];
    if (!allowedNextStates.includes(newStatus)) {
      return new NextResponse(
        `Invalid status transition. Cannot change from ${job.status} to ${newStatus}`,
        { status: 400 }
      );
    }
  }

  return null;
}
