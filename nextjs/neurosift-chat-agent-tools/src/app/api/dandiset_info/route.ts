import { NextRequest, NextResponse } from 'next/server';
import { getDandisetInfo } from '@/lib/tools/dandiset_info';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dandiset_id, version } = body;

    if (!dandiset_id) {
      return NextResponse.json({ error: 'Dandiset ID is required' }, { status: 400 });
    }

    const results = await getDandisetInfo(dandiset_id, version);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in dandisetInfo:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
