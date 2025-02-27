import { NextRequest, NextResponse } from 'next/server';
import { getDandisetAssets } from '@/lib/tools/dandiset_assets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dandiset_id, version, page, page_size, glob } = body;

    if (!dandiset_id) {
      return NextResponse.json({ error: 'Dandiset ID is required' }, { status: 400 });
    }

    const results = await getDandisetAssets(dandiset_id, version, page, page_size, glob);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in dandisetAssets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
