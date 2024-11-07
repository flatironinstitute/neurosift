import { DandisetsResponse } from "./dandiset-types";

export const lexicaltDandisetsTool = {
  tool: {
    type: "function" as any,
    function: {
      name: "lexical_dandisets",
      description:
        "Does a lexical search and returns a list of Dandiset IDs and titles in order of last modified date, with the most recent first.",
      parameters: {
        type: "object",
        properties: {
          search_text: {
            type: "string",
            description: "The search text to use to find matching Dandisets.",
          },
        },
      },
    },
  },
  function: async (
    args: { search_text: string },
    onLogMessage: (title: string, message: string) => void,
  ) => {
    onLogMessage("lexical_dandisets query", args.search_text);
    const { search_text } = args;
    const stagingStr = "";
    const url = `https://api${stagingStr}.dandiarchive.org/api/dandisets/?page=1&page_size=20&ordering=-modified&search=${search_text}&draft=true&empty=false&embargoed=false`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Failed to fetch from ${url}`);
    }
    const rr: DandisetsResponse = await resp.json();
    const ret = rr.results.map((result) => ({
      dandiset_id: result.identifier,
      title:
        result.most_recent_published_version?.name ||
        result.draft_version?.name,
    }));
    onLogMessage("lexical_dandisets response", JSON.stringify(ret));
    return JSON.stringify(ret);
  },
};
