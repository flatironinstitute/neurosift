// Definitions of subtypes are below
export type ORRequest = {
  // Either "messages" or "prompt" is required
  messages?: ORMessage[];
  prompt?: string;

  // If "model" is unspecified, uses the user's default
  model?: string; // See "Supported Models" section

  // Allows to force the model to produce specific output format.
  // Only supported by OpenAI models, Nitro models, and some others - check the
  // providers on the model page on openrouter.ai/models to see if it's supported,
  // and set `require_parameters` to true in your Provider Preferences. See
  // openrouter.ai/docs/provider-routing
  response_format?: { type: "json_object" };

  stop?: string | string[];
  stream?: boolean; // Enable streaming

  // See LLM Parameters (openrouter.ai/docs/parameters)
  max_tokens?: number; // Range: [1, context_length)
  temperature?: number; // Range: [0, 2]
  top_p?: number; // Range: (0, 1]
  top_k?: number; // Range: [1, Infinity) Not available for OpenAI models
  frequency_penalty?: number; // Range: [-2, 2]
  presence_penalty?: number; // Range: [-2, 2]
  repetition_penalty?: number; // Range: (0, 2]
  seed?: number; // OpenAI only

  // Tool calling
  // Will be passed down as-is for providers implementing OpenAI's interface.
  // For providers with custom interfaces, we transform and map the properties.
  // Otherwise, we transform the tools into a YAML template. The model responds with an assistant message.
  // See models supporting tool calling: openrouter.ai/models?supported_parameters=tools
  tools?: ORTool[];
  tool_choice?: ORToolChoice;

  // Additional optional parameters
  logit_bias?: { [key: number]: number };

  // OpenRouter-only parameters
  // See "Prompt Transforms" section: openrouter.ai/docs/transforms
  transforms?: string[];
  // See "Model Routing" section: openrouter.ai/docs/model-routing
  models?: string[];
  route?: "fallback";
  // See "Provider Routing" section: openrouter.ai/docs/provider-routing
  provider?: ORProviderPreferences;
};

// See "Provider Routing" section: openrouter.ai/docs/provider-routing
type ORProviderPreferences = any;

// Subtypes:

export type ORTextContent = {
  type: "text";
  text: string;
};

type ORImageContentPart = {
  type: "image_url";
  image_url: {
    url: string; // URL or base64 encoded image data
    detail?: string; // Optional, defaults to 'auto'
  };
};

export type ORContentPart = ORTextContent | ORImageContentPart;

export type ORMessage =
  | {
      role: "user" | "assistant" | "system" | "client-side-only";
      // ContentParts are only for the 'user' role:
      content: string | ORContentPart[];
      // If "name" is included, it will be prepended like this
      // for non-OpenAI models: `{name}: {content}`
      name?: string;
    }
  | {
      role: "tool";
      content: string;
      tool_call_id: string;
      name?: string;
    }
  | {
      // this one is not included in the openrouter documentation, but it seems it should be there: https://openrouter.ai/docs/requests
      role: "assistant";
      content: null;
      tool_calls: ORToolCall[];
    };

export type ORFunctionDescription = {
  description?: string;
  name: string;
  parameters: object; // JSON Schema object
};

export type ORTool = {
  type: "function";
  function: ORFunctionDescription;
};

export type ORToolChoice =
  | "none"
  | "auto"
  | {
      type: "function";
      function: {
        name: string;
      };
    };

export type ORResponse = {
  id: string;
  // Depending on whether you set "stream" to "true" and
  // whether you passed in "messages" or a "prompt", you
  // will get a different output shape
  choices: (ORNonStreamingChoice | ORStreamingChoice | ORNonChatChoice)[];
  created: number; // Unix timestamp
  model: string;
  object: "chat.completion" | "chat.completion.chunk";

  system_fingerprint?: string; // Only present if the provider supports it

  // Usage data is always returned for non-streaming.
  // When streaming, you will get one usage object at
  // the end accompanied by an empty choices array.
  usage?: ORResponseUsage;
};

// If the provider returns usage, we pass it down
// as-is. Otherwise, we count using the GPT-4 tokenizer.

type ORResponseUsage = {
  /** Including images and tools if any */
  prompt_tokens: number;
  /** The tokens generated */
  completion_tokens: number;
  /** Sum of the above two fields */
  total_tokens: number;
};

// Subtypes:
export type ORNonChatChoice = {
  finish_reason: string | null;
  text: string;
  error?: Error;
};

export type ORNonStreamingChoice = {
  finish_reason: string | null; // Depends on the model. Ex: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call'
  message: {
    content: string | null;
    role: string;
    tool_calls?: ORToolCall[];
    // Deprecated, replaced by tool_calls
    function_call?: ORFunctionCall;
  };
  error?: Error;
};

export type ORStreamingChoice = {
  finish_reason: string | null;
  delta: {
    content: string | null;
    role?: string;
    tool_calls?: ORToolCall[];
    // Deprecated, replaced by tool_calls
    function_call?: ORFunctionCall;
  };
  error?: Error;
};

export type ORError = {
  code: number; // See "Error Handling" section
  message: string;
};

type ORFunctionCall = {
  name: string;
  arguments: string; // JSON format arguments
};

export type ORToolCall = {
  id: string;
  type: "function";
  function: ORFunctionCall;
};
