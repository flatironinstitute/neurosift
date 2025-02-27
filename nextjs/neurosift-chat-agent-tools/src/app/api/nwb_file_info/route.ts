import { NextResponse } from "next/server";
import { getNwbFileInfo } from "@/lib/tools/nwb_file_info";

export async function POST(request: Request) {
  const body = await request.json();
  const { dandiset_id, nwb_file_url } = body;

  if (!dandiset_id || !nwb_file_url) {
    return NextResponse.json(
      {
        error: "Missing required parameters: dandiset_id and nwb_file_url",
      },
      { status: 400 }
    );
  }

  try {
    const info = await getNwbFileInfo(dandiset_id, nwb_file_url);
    return NextResponse.json({ results: info });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
