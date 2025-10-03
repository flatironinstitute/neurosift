import { NextRequest, NextResponse } from 'next/server';
import { getJobRunnerClient } from '../../../lib/jobRunnerClient';

interface ExecuteScriptRequest {
  script: string;
}

interface ExecuteScriptResponse {
  success: boolean;
  output?: string;
  error?: string;
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

/**
 * Execute a script via the job runner system
 * 
 * @param request NextRequest containing:
 *   - script: The script to execute
 * @returns
 *   - Success: { success: true, output: string }
 *   - Error: { success: false, error: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: ExecuteScriptRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    const { script } = body;

    // Validate required fields
    if (!script || typeof script !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid script parameter' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    // Get the persistent job runner client
    const client = getJobRunnerClient();

    // Execute the script
    console.info('Executing script via job runner...');
    const output = await client.executeScript(script);
    console.info('Script execution completed');

    return NextResponse.json(
      { success: true, output },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );

  } catch (error) {
    console.error('Error executing script:', error);
    const errorString = error instanceof Error ? error.message : String(error);

    // we will return with 200, but set success: false in the body

    return NextResponse.json(
      { success: false, error: errorString },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}
