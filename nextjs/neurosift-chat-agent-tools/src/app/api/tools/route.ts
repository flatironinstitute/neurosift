import { NextResponse } from 'next/server';

const tools = [
  {
    name: "dandi_search",
    description: `
Search for datasets in the DANDI archive.

The output takes the form:
{
  results: {
    id: string;
    version: string;
    name: string;
    asset_count: number;
    size: number;
  }[]
}

In general, when you refer to a dandiset by ID XXXXXX you should use [DANDI:XXXXXX](https://neurosift.app/dandiset/XXXXXX) so the user can click on it.
This should apply to all tools.
`,
    parameters: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description: "Search query text"
        },
        limit: {
          type: "number",
          description: "Maximum number of results",
          default: 10
        }
      }
    }
  },
  {
    name: "dandi_semantic_search",
    description:
`
Semantic search for DANDI datasets using natural language. Semantic embeddings are used to find similar datasets to the query text.

The output is the same format as dandi_search.
`,
    parameters: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description: "Natural language query text"
        },
        limit: {
          type: "number",
          description: "Maximum number of results",
          default: 10
        }
      }
    }
  },
  {
    name: "dandiset_info",
    description: `
Get information about a specific version of a DANDI dataset.

When the version is unknown, use "draft".

This will return detailed information about the dandiset including:
name, description, access, license, citation, keywords, protocol, contributor names, date created, size, number of files, number of subjects, variables measured, and measurement technique.
`,
    parameters: {
      type: "object",
      required: ["dandiset_id"],
      properties: {
        dandiset_id: {
          type: "string",
          description: "DANDI dataset ID"
        },
        version: {
          type: "string",
          description: "Version of the dataset to retrieve",
          default: "draft"
        }
      }
    }
  },
  {
    name: "dandiset_assets",
    description: `
Get a list of assets/files in a dandiset version.

The output provides:
- count: total number of assets
- results: array of assets with asset_id, path, and size

When referencing an NWB file path, use the format:
[path](https://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/asset_id/download/&dandisetId=XXXXXX&dandisetVersion=XXXXX)

where XXXXXX is the dandiset ID and XXXXX is the version.
`,
    parameters: {
      type: "object",
      required: ["dandiset_id"],
      properties: {
        dandiset_id: {
          type: "string",
          description: "DANDI dataset ID"
        },
        version: {
          type: "string",
          description: "Version of the dataset to retrieve",
          default: "draft"
        },
        page: {
          type: "number",
          description: "Page number",
          default: 1
        },
        page_size: {
          type: "number",
          description: "Number of results per page",
          default: 20
        },
        glob: {
          type: "string",
          description: "Optional glob pattern to filter files (e.g., '*.nwb' for NWB files)"
        }
      }
    }
  },
  {
    name: "openneuro_search",
    description: "Search for datasets on OpenNeuro",
    parameters: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description: "Search query text"
        },
        limit: {
          type: "number",
          description: "Maximum number of results",
          default: 25
        }
      }
    }
  }
];

export async function GET() {
  return NextResponse.json(tools);
}
