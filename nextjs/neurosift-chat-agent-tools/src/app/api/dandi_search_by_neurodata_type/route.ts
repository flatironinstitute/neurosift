import { NextRequest, NextResponse } from 'next/server';
import { searchByNeurodataType } from '../../../lib/tools/dandi_search_by_neurodata_type';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { types, limit } = body;

    if (!types || !Array.isArray(types) || types.length === 0) {
      return NextResponse.json(
        { error: 'types array is required and must not be empty' },
        { status: 400 }
      );
    }

    const { results, total } = await searchByNeurodataType(types, limit);
    return NextResponse.json({ results, total });
  } catch (error) {
    console.error('Error in DANDI neurodata type search:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
