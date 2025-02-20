import { NextRequest, NextResponse } from 'next/server';
import connectDB, { User } from '../lib/db';

export type AuthResult = NextResponse | {
  userId: string;
  authorized: true;
};

export async function validateApiKey(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const providedKey = authHeader.split(' ')[1];

  try {
    await connectDB();

    // Find user by API key
    const user = await User.findOne({ apiKey: providedKey });

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Return null for success, but attach user info to request
    return { userId: user.userId, authorized: true };
  } catch (error) {
    console.error('Error validating API key:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
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
