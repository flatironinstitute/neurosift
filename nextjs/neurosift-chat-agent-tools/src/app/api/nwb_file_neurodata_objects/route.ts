import { NextRequest, NextResponse } from 'next/server';
import { getNwbFileNeurodataObjects } from '@/lib/tools/nwb_file_neurodata_objects';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dandiset_id, nwb_file_url } = body;

    if (!dandiset_id) {
      return NextResponse.json({ error: 'Dandiset ID is required' }, { status: 400 });
    }
    if (!nwb_file_url) {
      return NextResponse.json({ error: 'NWB file URL is required' }, { status: 400 });
    }

    const results = await getNwbFileNeurodataObjects(dandiset_id, nwb_file_url);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in nwbFileNeurodataObjects:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
