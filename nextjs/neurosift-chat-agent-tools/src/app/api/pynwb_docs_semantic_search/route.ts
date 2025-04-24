import { NextRequest, NextResponse } from 'next/server';
import { pynwbDocsSemanticSearch } from '@/lib/tools/pynwb_docs_semantic_search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit } = body;

    if (limit > 20) {
      return NextResponse.json({ error: 'Limit must be <= 20' }, { status: 400 });
    }

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const results = await pynwbDocsSemanticSearch(query, limit);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in pynwb docs semantic search:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
