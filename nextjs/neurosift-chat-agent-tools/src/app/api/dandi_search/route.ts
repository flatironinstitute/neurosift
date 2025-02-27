import { NextRequest, NextResponse } from 'next/server';
import { dandiSearch } from '@/lib/tools/dandi_search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const results = await dandiSearch(query, limit);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in DANDI search:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
