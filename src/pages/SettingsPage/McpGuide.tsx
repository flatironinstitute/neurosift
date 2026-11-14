import { CodeBlock, DataTable, Section } from "@ui";
import "./McpGuide.css";

const GUIDE_URL =
  "https://github.com/flatironinstitute/neurosift/blob/main/docs/mcp-neurosift-tools.md";

const BUILD = `$ git clone https://github.com/magland/neurosift-mcps.git
$ cd neurosift-mcps/neurosift-tools
$ npm install
$ npm run build`;

const CLAUDE_CODE = `$ claude mcp add --transport stdio neurosift-tools -- node PATH/neurosift-mcps/neurosift-tools/build/index.js`;

const CLINE = `{
  "mcpServers": {
    "neurosift-tools": {
      "command": "node",
      "args": ["PATH/neurosift-mcps/neurosift-tools/build/index.js"],
      "disabled": false,
      "autoApprove": []
    }
  }
}`;

const TOOLS = [
  ["dandi_search", "Search for Dandisets on DANDI."],
  ["dandi_semantic_search", "Search for Dandisets in plain language."],
  ["dandiset_info", "Describe a Dandiset, with its neurodata objects."],
  ["dandiset_assets", "List the files in a Dandiset."],
  ["nwb_file_info", "Describe an NWB file and its neurodata objects."],
  ["openneuro_search", "Search for datasets on OpenNeuro."],
  ["dandi_list_neurodata_types", "List the neurodata types found on DANDI."],
  [
    "dandi_search_by_neurodata_type",
    "Find Dandisets that contain given neurodata types.",
  ],
  ["pynwb_docs_semantic_search", "Search the PyNWB documentation."],
].map(([name, does]) => ({ name, does }));

/** How to connect the Neurosift tools MCP server to an AI assistant, from docs/mcp-neurosift-tools.md. */
export function McpGuide() {
  return (
    <Section title="Neurosift tools for AI assistants">
      <p className="mcp-guide-text">
        The Neurosift tools MCP server lets an AI assistant such as Claude Code
        or Cline search DANDI and OpenNeuro and read NWB files. It runs on your
        computer and needs Node.js and Git.
      </p>
      <CodeBlock language="shell" title="1. Build the server" code={BUILD} />
      <p className="mcp-guide-text">
        Then add it to your assistant. Replace PATH with the folder you cloned
        into.
      </p>
      <CodeBlock
        language="shell"
        title="2. Add it to Claude Code"
        code={CLAUDE_CODE}
      />
      <CodeBlock
        title="Or add it to Cline, in cline_mcp_settings.json"
        code={CLINE}
      />
      <DataTable
        caption="Tools the server adds"
        density="compact"
        columns={[
          { key: "name", label: "Tool", type: "code", value: (t) => t.name },
          { key: "does", label: "What it does", value: (t) => t.does },
        ]}
        rows={TOOLS}
        rowKey={(t) => t.name}
      />
      <p className="mcp-guide-text">
        <a href={GUIDE_URL} target="_blank" rel="noreferrer">
          Read the full guide
        </a>
        , with troubleshooting and a local development setup.
      </p>
    </Section>
  );
}
