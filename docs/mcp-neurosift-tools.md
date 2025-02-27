# Installing the Neurosift Tools MCP Server for Cline

The Neurosift Tools MCP server provides access to DANDI archive functionality and other neuroscience data tools through Cline in VSCode. This guide explains how to set it up.

## Prerequisites

- VSCode with the Cline extension installed
- Node.js installed on your system
- Git for cloning the repository

## Installation Steps

1. Clone the neurosift-v2 repository:
   ```bash
   git clone https://github.com/flatironinstitute/neurosift.git
   cd neurosift
   ```

2. Build the neurosift-tools MCP server:
   ```bash
   cd mcps/neurosift-tools
   npm install
   npm run build
   ```

3. Create or open the Cline MCP settings file:
   ```
   ~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
   ```

4. Add the neurosift-tools configuration to your settings:
   ```json
   {
     "mcpServers": {
       "neurosift-tools": {
         "command": "node",
         "args": ["PATH_TO_REPO/mcps/neurosift-tools/build/index.js"],
         "disabled": false,
         "autoApprove": []
       }
     }
   }
   ```

   Note: Replace `PATH_TO_REPO` with the actual path where you cloned the neurosift repository.

## Available Tools

Once installed, the MCP server provides tools for:

- `dandi_search`: Search for datasets in the DANDI archive
- `dandi_semantic_search`: Semantic search for DANDI datasets using natural language
- `dandiset_info`: Get detailed information about a specific DANDI dataset
- `dandiset_assets`: List assets/files in a DANDI dataset
- `nwb_file_neurodata_objects`: Get neurodata objects from an NWB file
- `openneuro_search`: Search for datasets on OpenNeuro
- `dandi_list_neurodata_types`: List all unique neurodata types in DANDI archive
- `dandi_search_by_neurodata_type`: Search for datasets containing specific neurodata types

## Verification

After adding the configuration:

1. Restart VSCode to apply the changes
2. Open a new conversation in Cline
3. The tools should be available in Cline's capabilities

## Troubleshooting

If tools are not appearing:
- Verify the path in `args` points to your local neurosift repository
- Check that the repository is built correctly
- Ensure the settings file is properly formatted JSON
- Restart VSCode after making changes

## Local Development

For local development of the neurosift-chat-agent-tools API, you can configure the MCP server to use your local development server by adding the `NEUROSIFT_TOOLS_API_URL` environment variable to your settings:

```json
{
  "mcpServers": {
    "neurosift-tools": {
      "command": "node",
      "args": ["PATH_TO_REPO/mcps/neurosift-tools/build/index.js"],
      "env": {
        "NEUROSIFT_TOOLS_API_URL": "http://localhost:3001/api"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

This allows you to test changes to the API locally before deploying to production.
