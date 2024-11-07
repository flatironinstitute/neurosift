import { ORMessage } from "../openRouterTypes";
import chatCompletion from "../chatCompletion";
import { ToolItem } from "../ToolItem";

export const probeDandisetTool: ToolItem = {
  tool: {
    type: "function" as any,
    function: {
      name: "probe_dandiset",
      description:
        "Use this tool to get information about a Dandiset based on its metadata on DANDI Archive.",
      parameters: {
        type: "object",
        properties: {
          dandiset_id: {
            type: "string",
            description: "The Dandiset ID to get information about",
          },
          user_question: {
            type: "string",
            description: "The question the user is asking about the Dandiset",
          },
          instructions: {
            type: "string",
            description: "Other instructions for what should be returned",
          },
        },
      },
    },
  },
  detailedDescription: undefined,
  function: async (
    args: any,
    onLogMessage: (title: string, message: string) => void,
    o: {
      modelName: string;
      openRouterKey: string | null;
    },
  ) => {
    const { dandiset_id, user_question, instructions } = args;

    onLogMessage(
      `probe_dandiset_objects query ${dandiset_id}`,
      `Q: ${user_question}\nI: ${instructions}`,
    );

    const stagingStr = "";
    const url = `https://api${stagingStr}.dandiarchive.org/api/dandisets/${dandiset_id}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Failed to fetch from ${url}`);
    }
    const rr = await resp.json();
    const metaInformation = JSON.stringify(rr);

    const messages: ORMessage[] = [
      {
        role: "system",
        content: `You are an assistant that can help with Dandisets. You are going to be asked about Dandiset ${dandiset_id}. Respond with information based on the following metadata obtained from the DANDI Archive:\n\n\n\n${metaInformation}`,
      },
      {
        role: "user",
        content: `User question: ${user_question}\n\nOther instructions: ${instructions}`,
      },
    ];

    const xx = await chatCompletion({
      messages,
      modelName: o.modelName,
      openRouterKey: o.openRouterKey,
      tools: [],
    });
    const { assistantMessage } = xx;

    onLogMessage("probe_dandiset response " + dandiset_id, assistantMessage);
    return assistantMessage;
  },
};

const dandisetObjectsObjectCache: {
  [dandiset_id: string]: {
    objects: {
      dandiset_id: string;
      dandiset_version: string;
      file_path: string;
      download_url: string;
      object_path: string;
      neurodata_type: string;
    }[];
  };
} = {};
export const fetchDandisetObjectsObject = async (dandiset_id: string) => {
  if (dandisetObjectsObjectCache[dandiset_id]) {
    return dandisetObjectsObjectCache[dandiset_id];
  }
  const url = `https://lindi.neurosift.org/tmp/dandi/neurodata_objects/${dandiset_id}.json`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to fetch from ${url}`);
  }
  const rr = await resp.json();

  dandisetObjectsObjectCache[dandiset_id] = rr;
  return rr;
};
