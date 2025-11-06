/**
 * Neurosift Logs - Cloudflare Worker
 * Simple logging endpoint that validates and outputs logs to console
 */

interface LogMessage {
  message: string;
  metadata?: Record<string, unknown>;
}

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://neurosift.app'
];

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get('Origin');
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin || '') ? origin! : '',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      );
    }

    try {
      // Parse request body
      const body = await request.json() as LogMessage;

      // Validate required fields
      if (!body.message) {
        return new Response(
          JSON.stringify({ error: 'Message field is required' }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Log to console (Cloudflare captures this)
      const logData = {
        message: body.message,
        metadata: body.metadata || {},
        ip: request.headers.get('CF-Connecting-IP') || 'unknown',
      };

      console.log(logData);

      // Return success response
      return new Response(
        JSON.stringify({ success: true, logged: true }),
        { status: 200, headers: corsHeaders }
      );

    } catch (error) {
      // Handle JSON parsing errors
      console.error('Error processing log:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: corsHeaders }
      );
    }
  },
};
