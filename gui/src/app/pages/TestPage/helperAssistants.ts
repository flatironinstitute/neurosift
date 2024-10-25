import {
  ORMessage,
  ORTool,
} from "../DandisetPage/DandisetViewFromDendro/openRouterTypes";
import chatCompletion from "./chatCompletion";

interface HelperAssistant {
  name: string;
  description: string;
  promptParameterDescription: string;
  inquire: (
    prompt: string,
    a: { openRouterKey: string | null; modelName: string },
  ) => Promise<string>;
}

class Assistant1 {
  constructor(
    private a: {
      name: string;
      description: string;
      promptParameterDescription: string;
      systemPrompt: string;
      tools: {
        function: (args: any) => Promise<any>;
        tool: ORTool;
      }[];
    },
  ) {}
  get name() {
    return this.a.name;
  }
  get description() {
    return this.a.description;
  }
  get promptParameterDescription() {
    return this.a.promptParameterDescription;
  }
  async inquire(
    prompt: string,
    a: { openRouterKey: string | null; modelName: string },
  ) {
    const messages: ORMessage[] = [];
    messages.push({ role: "system", content: this.a.systemPrompt });
    messages.push({ role: "user", content: prompt });
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const rr = await chatCompletion({
        messages,
        modelName: a.modelName,
        openRouterKey: a.openRouterKey,
        tools: this.a.tools.map((t) => t.tool),
      });
      const { assistantMessage, toolCalls } = rr;
      if (!toolCalls) {
        return assistantMessage;
      } else {
        // tool calls
        if (assistantMessage) {
          console.warn(
            "Unexpected: assistant message and tool calls. Ignoring assistant message.",
          );
        }
        const msg: ORMessage = {
          role: "assistant",
          content: null,
          tool_calls: toolCalls,
        };
        messages.push(msg);
        const processToolCall = async (tc: any) => {
          const func = this.a.tools.find(
            (x) => x.tool.function.name === tc.function.name,
          )?.function;
          if (!func) {
            throw Error(`Unexpected. Did not find tool: ${tc.function.name}`);
          }
          const args = JSON.parse(tc.function.arguments);
          console.info("TOOL CALL: ", tc.function.name, args);
          let response: string;
          try {
            response = await func(args);
          } catch (err: any) {
            response = `Error: ${err.message}`;
          }
          console.info("TOOL RESPONSE: ", response);
          const msg1: ORMessage = {
            role: "tool",
            content: JSON.stringify(response),
            tool_call_id: tc.id,
          };
          messages.push(msg1);
        }
        await Promise.all(toolCalls.map(processToolCall));
      }
    }
  }
}

const dandisetApiCallTool = {
  tool: {
    type: "function" as any,
    function: {
      name: "dandiset_meta",
      description: "Get the metadata for a Dandiset",
      parameters: {
        type: "object",
        properties: {
          dandiset_id: {
            type: "string",
            description: "The Dandiset ID to get the metadata for",
          },
        },
      },
    },
  },
  function: async (args: { dandiset_id: string }) => {
    const { dandiset_id } = args;
    const stagingStr = "";
    const url = `https://api${stagingStr}.dandiarchive.org/api/dandisets/${dandiset_id}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Failed to fetch from ${url}`);
    }
    const rr = await resp.json();
    return JSON.stringify(rr);
  },
};

const summarizeDandisetAssistant = new Assistant1({
  name: "summarize_dandiset",
  description:
    "Summarize a Dandiset based on its Dandiset ID and a request for what type of information is being queried. The user prompts should include the Dandiset ID and the information they are looking for.",
  promptParameterDescription:
    "A Dandiset ID and a request for the type of information being queried.",
  systemPrompt: `
You are an assistant that responds concisely to prompts to summarize a Dandiset based on its Dandiset ID and a request for what type of information is being queried.
The prompt should include a Dandiset ID, which is a 6-digit number, and a request for the type of information being queried.
If you can't parse out a Dandiset ID from the prompt, you should respond with a message that you couldn't find a Dandiset ID in the prompt.

You should be concise in your response and provide only the relevant information that was requested.

To help you will this, you should use the the dandi API to get the Dandiset metadata. This is done using the dandiset_meta tool.

Unless asked for specific information, you should respond with human readable text and avoid lists of technical facts about the Dandisets.
`,
  tools: [dandisetApiCallTool],
});

const helperAssistants: HelperAssistant[] = [];
helperAssistants.push(summarizeDandisetAssistant);

export default helperAssistants;
