import { NextRequest, NextResponse } from 'next/server';
import { dandiSemanticSearch } from '@/lib/tools/dandi_semantic_search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit, dandisets } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const results = await dandiSemanticSearch(query, limit, dandisets);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in DANDI semantic search:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
