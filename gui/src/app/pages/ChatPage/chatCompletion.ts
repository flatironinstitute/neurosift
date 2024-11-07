import { ORMessage, ORTool, ORToolChoice } from "./openRouterTypes";

const chatCompletionTimestamps: number[] = [];

// safeguard (e.g., an infinite loop)
const MAX_CHAT_COMPLETIONS_PER_MINUTE = 10;

const chatCompletion = async (a: {
  messages: ORMessage[];
  modelName: string;
  openRouterKey: string | null;
  tools: ORTool[];
}) => {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const numberOfChatCompletionsInLastMinute = chatCompletionTimestamps.filter(
      (timestamp) => Date.now() - timestamp < 60 * 1000,
    ).length;
    if (numberOfChatCompletionsInLastMinute < MAX_CHAT_COMPLETIONS_PER_MINUTE) {
      break;
    }
    const ok = confirm(
      "You are sending too many requests to the server. Wait a bit and then click OK to continue.",
    );
    if (!ok) {
      throw new Error("Too many requests");
    }
  }
  chatCompletionTimestamps.push(Date.now());

  const { messages, modelName, tools, openRouterKey } = a;
  const messages2: ORMessage[] = [...messages];
  console.info("messages", messages2);

  const tool_choice: ORToolChoice = "auto";

  let url: string;
  let options: RequestInit;

  if (openRouterKey === null) {
    url = "https://ns-chat-proxy.vercel.app/api/completion";

    options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer not-really-a-secret`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages2,
        tools,
        tool_choice,
      }),
    };
  } else {
    url = "https://openrouter.ai/api/v1/chat/completions";

    options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openRouterKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        tools,
        tool_choice,
      }),
    };
  }

  const resp = await fetch(url, options);
  if (!resp.ok) {
    throw new Error(`Failed to fetch from ${url}`);
  }
  const rr: {
    choices?: { message: { content: string; tool_calls?: any[] } }[];
  } = await resp.json();
  if (!rr.choices) {
    console.warn(messages, tools);
    throw new Error("No choices in response");
  }
  const choice = rr.choices[0];
  const { content: response, tool_calls: toolCalls } = choice.message;

  console.info("response", { response });

  return { assistantMessage: response, toolCalls };
};

export default chatCompletion;
