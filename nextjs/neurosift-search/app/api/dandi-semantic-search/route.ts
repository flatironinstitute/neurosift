import { NextRequest, NextResponse } from 'next/server';
import { getJobRunnerClient } from '../../../lib/jobRunnerClient';

interface DandiSemanticSearchRequest {
  query: string;
}

interface DandiSemanticSearchResponse {
  success: boolean;
  dandisetIds?: string[];
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
 * Perform DANDI semantic search
 * 
 * @param request NextRequest containing:
 *   - query: The search query text
 * @returns
 *   - Success: { success: true, dandisetIds: string[] }
 *   - Error: { success: false, error: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: DandiSemanticSearchRequest;
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

    const { query } = body;

    // Validate required fields
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid query parameter' },
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

    // Return empty array for empty query
    if (!query.trim()) {
      return NextResponse.json(
        { success: true, dandisetIds: [] },
        {
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

    // Construct the script based on the original doDandiSemanticSearch implementation
    const queryBase64 = Buffer.from(query).toString('base64');
    const script = `
const dandisets = await interface.getDandisets();
const query = atob("${queryBase64}");
const dandisetsSorted = await interface.semanticSortDandisets(dandisets, query);
const dandisetIds = dandisetsSorted.map(d => d.dandiset_id).slice(0, 20);
interface.print("<>");
interface.print(JSON.stringify(dandisetIds, null, 2));
interface.print("</>");
`;

    console.info('Executing DANDI semantic search script...');
    console.info('Query:', query);
    
    // Execute the script
    const response = await client.executeScript(script);
    console.info('Received response from job runner');

    // Parse the response using the same logic as the original implementation
    const i1 = response.indexOf("<>");
    const i2 = response.indexOf("</>");
    
    if (i1 === -1 || i2 === -1 || i2 <= i1) {
      console.warn("Could not find output markers in response");
      return NextResponse.json(
        { success: false, error: 'Invalid response format from job runner' },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    const json = response.slice(i1 + 2, i2).trim();
    let dandisetIds: string[] = [];
    
    try {
      dandisetIds = JSON.parse(json);
    } catch (e) {
      console.warn("Could not parse JSON from response", e);
      return NextResponse.json(
        { success: false, error: 'Failed to parse response from job runner' },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    console.info(`Found ${dandisetIds.length} dandiset IDs`);

    return NextResponse.json(
      { success: true, dandisetIds },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );

  } catch (error) {
    console.error('Error executing DANDI semantic search:', error);
    
    // Determine appropriate status code based on error type
    let status = 500;
    let errorMessage = 'Internal server error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for timeout errors
      if (error.message.includes('job runner is probably offline') || 
          error.message.includes('Failed to submit script')) {
        status = 408; // Request Timeout
      }
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { 
        status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}
