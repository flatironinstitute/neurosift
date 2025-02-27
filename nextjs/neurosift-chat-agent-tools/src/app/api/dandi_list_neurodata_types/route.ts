import { NextResponse } from 'next/server';
import { listNeurodataTypes } from '../../../lib/tools/dandi_list_neurodata_types';

export async function POST() {
  try {
    const uniqueTypes = await listNeurodataTypes();
    return NextResponse.json(uniqueTypes);
  } catch (error) {
    console.error('Error listing neurodata types:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
