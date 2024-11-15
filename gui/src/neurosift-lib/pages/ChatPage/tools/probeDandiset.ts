import { ORMessage } from "../openRouterTypes";
import chatCompletion from "../chatCompletion";
import { ToolItem } from "../ToolItem";
import { Dandiset } from "./dandi-archive-schema";

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
      `probe_dandiset query ${dandiset_id}`,
      `Q: ${user_question}\nI: ${instructions}`,
    );

    const stagingStr = "";
    const url = `https://api${stagingStr}.dandiarchive.org/api/dandisets/${dandiset_id}/versions/draft/info/`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Failed to fetch from ${url}`);
    }
    const rr = await resp.json();

    // it's important not to include all the metadata, as it can be very large - not good for the chat context
    const dandisetMetadata: Dandiset = rr.metadata;
    let metaSummary = "";
    metaSummary += `Name: ${dandisetMetadata.name}\n`;
    metaSummary += `Description: ${dandisetMetadata.description}\n`;
    metaSummary += `Contributors: ${dandisetMetadata.contributor.map((c) => c.name).join(", ")}\n`;
    metaSummary += `About: ${dandisetMetadata.about?.map((a) => a.name).join(", ")}\n`;
    metaSummary += `Study target: ${dandisetMetadata.studyTarget?.join(", ")}\n`;
    metaSummary += `License: ${dandisetMetadata.license.join(", ")}\n`;
    metaSummary += `Protocol: ${dandisetMetadata.protocol?.join(", ")}\n`;
    metaSummary += `Ethics approval: ${dandisetMetadata.ethicsApproval?.join(", ")}\n`;
    metaSummary += `Keywords: ${dandisetMetadata.keywords?.join(", ")}\n`;
    metaSummary += `Acknowledgement: ${dandisetMetadata.acknowledgement}\n`;
    metaSummary += `Access: ${dandisetMetadata.access?.map((a) => a.status).join(", ")}\n`;
    metaSummary += `URL: ${dandisetMetadata.url}\n`;
    metaSummary += `Repository: ${dandisetMetadata.repository}\n`;
    metaSummary += `Related resource: ${dandisetMetadata.relatedResource?.map((r) => r.name).join(", ")}\n`;
    metaSummary += `Was generated by: ${dandisetMetadata.wasGeneratedBy?.join(", ")}\n`;
    metaSummary += `Date created: ${dandisetMetadata.dateCreated}\n`;
    metaSummary += `Date modified: ${dandisetMetadata.dateModified}\n`;
    metaSummary += `Citation: ${dandisetMetadata.citation}\n`;

    const messages: ORMessage[] = [
      {
        role: "system",
        content: `You are an assistant that can help with Dandisets. You are going to be asked about Dandiset ${dandiset_id}. Respond with information based on the following metadata obtained from the DANDI Archive:\n\n${metaSummary}\n\n`,
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
