import {
  ORMessage,
  ORTool,
} from "../DandisetPage/DandisetViewFromDendro/openRouterTypes";
import chatCompletion from "./chatCompletion";

interface HelperAssistant {
  name: string;
  description: string;
  parameters: {
    [pname: string]: {
      type: string;
      description: string;
    };
  };
  inquire: (
    args: any,
    a: { openRouterKey: string | null; modelName: string },
  ) => Promise<string>;
}

class Assistant1 {
  constructor(
    private a: {
      name: string;
      description: string;
      parameters: {
        [pname: string]: {
          type: string;
          description: string;
        };
      };
      systemPrompt: string;
      argumentsToPrompt: (a: any) => string;
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
  get parameters() {
    return this.a.parameters;
  }
  async inquire(
    args: any,
    a: { openRouterKey: string | null; modelName: string },
  ) {
    const messages: ORMessage[] = [];
    messages.push({ role: "system", content: this.a.systemPrompt });
    messages.push({ role: "user", content: this.a.argumentsToPrompt(args) });
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
        };
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
  parameters: {
    dandiset_id: {
      type: "string",
      description: "The Dandiset ID to get the information for",
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
  systemPrompt: `
You are an assistant that responds to prompts to answer questions about a Dandiset based on its Dandiset ID and a question and instructions about how to respond.

The Dandiset ID is a 6-digit number.

If you can't parse out a Dandiset ID from the prompt, you should respond with a message that you couldn't find a Dandiset ID in the prompt.

To help you with this, you should use the the dandi API to get the Dandiset metadata. This is done using the dandiset_meta tool. Be sure to use the full six digit Dandiset ID when calling the tool.

Whenever it might be relevant, include paper references in the response.

Avoid being too verbose with unnecessary information. If you can't find the information requested, respond with a message that you couldn't find the information.
`,
  argumentsToPrompt: (args: any) => {
    const { dandiset_id, user_question, instructions } = args;
    return `
Dandiset ID: ${dandiset_id}
Question: ${user_question}
Instructions: ${instructions}
`;
  },
  tools: [dandisetApiCallTool],
});

const helperAssistants: HelperAssistant[] = [];
helperAssistants.push(summarizeDandisetAssistant);

export default helperAssistants;
