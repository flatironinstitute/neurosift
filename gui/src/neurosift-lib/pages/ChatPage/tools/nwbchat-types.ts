// initiateChatQuery
export type InitiateChatQueryRequest = {
  type: "initiateChatQueryRequest";
  promptLength: number;
  nwbFileInfoJsonLength: number;
  gptModel: string;
};

export const isInitiateChatQueryRequest = (
  x: any,
): x is InitiateChatQueryRequest => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "initiateChatQueryRequest" &&
    typeof x.promptLength === "number" &&
    typeof x.nwbFileInfoJsonLength === "number" &&
    typeof x.gptModel === "string"
  );
};

export type InitiateChatQueryResponse = {
  type: "initiateChatQueryResponse";
  chatQueryToken: string;
  tokenSignature: string;
};

export const isInitiateChatQueryResponse = (
  x: any,
): x is InitiateChatQueryResponse => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "initiateChatQueryResponse" &&
    typeof x.chatQueryToken === "string" &&
    typeof x.tokenSignature === "string"
  );
};

// chatQuery
export type ChatQueryRequest = {
  type: "chatQueryRequest";
  chatQueryToken: string;
  tokenSignature: string;
  challengeResponse: string;
  promptLength: number;
  nwbFileInfoJsonLength: number;
  prompt: string;
  nwbFileInfoJson: string;
  gptModel: string;
};

export const isChatQueryRequest = (x: any): x is ChatQueryRequest => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "chatQueryRequest" &&
    typeof x.chatQueryToken === "string" &&
    typeof x.tokenSignature === "string" &&
    typeof x.challengeResponse === "string" &&
    typeof x.promptLength === "number" &&
    typeof x.nwbFileInfoJsonLength === "number" &&
    typeof x.prompt === "string" &&
    typeof x.nwbFileInfoJson === "string" &&
    typeof x.gptModel === "string"
  );
};

export type ChatQueryResponse = {
  type: "chatQueryResponse";
  response: string;
  estimatedCost: number;
  fullPrompt: string;
};

export const isChatQueryResponse = (x: any): x is ChatQueryResponse => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "chatQueryResponse" &&
    typeof x.response === "string" &&
    typeof x.estimatedCost === "number" &&
    typeof x.fullPrompt === "string"
  );
};

export type ChatQueryTokenObject = {
  timestamp: number;
  difficulty: number;
  delay: number;
  promptLength: number;
  nwbFileInfoJsonLength: number;
  gptModel: string;
};

export const isChatQueryTokenObject = (x: any): x is ChatQueryTokenObject => {
  return (
    x &&
    typeof x === "object" &&
    typeof x.timestamp === "number" &&
    typeof x.difficulty === "number" &&
    typeof x.delay === "number" &&
    typeof x.promptLength === "number" &&
    typeof x.nwbFileInfoJsonLength === "number" &&
    typeof x.gptModel === "string"
  );
};

export type NwbFileInfo = {
  metaFields: {
    name: string;
    value: string;
  }[];
  neurodataGroups: {
    path: string;
    neurodataType: string;
    description: string;
  }[];
  neurodataDatasets: {
    path: string;
    neurodataType: string;
    description: string;
    shape: number[];
    dtype: string;
  }[];
};

export const isNwbFileInfoMetaField = (
  x: any,
): x is NwbFileInfo["metaFields"][0] => {
  return (
    x &&
    typeof x === "object" &&
    typeof x.name === "string" &&
    typeof x.value === "string"
  );
};

export const isNwbFileInfoNeurodataGroup = (
  x: any,
): x is NwbFileInfo["neurodataGroups"][0] => {
  return (
    x &&
    typeof x === "object" &&
    typeof x.path === "string" &&
    typeof x.neurodataType === "string" &&
    typeof x.description === "string"
  );
};

export const isNwbFileInfoNeurodataDataset = (
  x: any,
): x is NwbFileInfo["neurodataDatasets"][0] => {
  return (
    x &&
    typeof x === "object" &&
    typeof x.path === "string" &&
    typeof x.neurodataType === "string" &&
    typeof x.description === "string" &&
    Array.isArray(x.shape) &&
    x.shape.every((y: any) => typeof y === "number") &&
    typeof x.dtype === "string"
  );
};

export const isNwbFileInfo = (x: any): x is NwbFileInfo => {
  return (
    x &&
    typeof x === "object" &&
    Array.isArray(x.metaFields) &&
    x.metaFields.every(isNwbFileInfoMetaField) &&
    Array.isArray(x.neurodataGroups) &&
    x.neurodataGroups.every(isNwbFileInfoNeurodataGroup) &&
    Array.isArray(x.neurodataDatasets) &&
    x.neurodataDatasets.every(isNwbFileInfoNeurodataDataset)
  );
};

export type InitiateEmbeddingRequest = {
  type: "initiateEmbeddingRequest";
  textLength: number;
  modelName: string;
};

export const isInitiateEmbeddingRequest = (
  x: any,
): x is InitiateEmbeddingRequest => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "initiateEmbeddingRequest" &&
    typeof x.textLength === "number" &&
    typeof x.modelName === "string"
  );
};

export type InitiateEmbeddingResponse = {
  type: "initiateEmbeddingResponse";
  embeddingToken: string;
  tokenSignature: string;
};

export const isInitiateEmbeddingResponse = (
  x: any,
): x is InitiateEmbeddingResponse => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "initiateEmbeddingResponse" &&
    typeof x.embeddingToken === "string" &&
    typeof x.tokenSignature === "string"
  );
};

export type EmbeddingRequest = {
  type: "embeddingRequest";
  embeddingToken: string;
  tokenSignature: string;
  challengeResponse: string;
  textLength: number;
  text: string;
  modelName: string;
};

export const isEmbeddingRequest = (x: any): x is EmbeddingRequest => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "embeddingRequest" &&
    typeof x.embeddingToken === "string" &&
    typeof x.tokenSignature === "string" &&
    typeof x.challengeResponse === "string" &&
    typeof x.textLength === "number" &&
    typeof x.text === "string" &&
    typeof x.modelName === "string"
  );
};

export type EmbeddingResponse = {
  type: "embeddingResponse";
  embedding: number[];
};

export const isEmbeddingResponse = (x: any): x is EmbeddingResponse => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "embeddingResponse" &&
    Array.isArray(x.embedding) &&
    x.embedding.every((y: any) => typeof y === "number")
  );
};

export type EmbeddingTokenObject = {
  timestamp: number;
  difficulty: number;
  delay: number;
  textLength: number;
  modelName: string;
};

export const isEmbeddingTokenObject = (x: any): x is EmbeddingTokenObject => {
  return (
    x &&
    typeof x === "object" &&
    typeof x.timestamp === "number" &&
    typeof x.difficulty === "number" &&
    typeof x.delay === "number" &&
    typeof x.textLength === "number" &&
    typeof x.modelName === "string"
  );
};

// initiateNeurosiftCompletion

export type InitiateNeurosiftCompletionRequest = {
  type: "initiateNeurosiftCompletionRequest";
  messagesJsonLength: number;
  modelName: string;
};

export const isInitiateNeurosiftCompletionRequest = (
  x: any,
): x is InitiateNeurosiftCompletionRequest => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "initiateNeurosiftCompletionRequest" &&
    typeof x.messagesJsonLength === "number" &&
    typeof x.modelName === "string"
  );
};

export type InitiateNeurosiftCompletionResponse = {
  type: "initiateNeurosiftCompletionResponse";
  neurosiftCompletionToken: string;
  tokenSignature: string;
};

export const isInitiateNeurosiftCompletionResponse = (
  x: any,
): x is InitiateNeurosiftCompletionResponse => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "initiateNeurosiftCompletionResponse" &&
    typeof x.neurosiftCompletionToken === "string" &&
    typeof x.tokenSignature === "string"
  );
};

// neurosiftCompletion

export type NeurosiftCompletionRequest = {
  type: "neurosiftCompletionRequest";
  neurosiftCompletionToken: string;
  tokenSignature: string;
  challengeResponse: string;
  messagesJsonLength: number;
  messagesJson: string;
  modelName: string;
  toolsJson?: string;
  toolChoice?: string;
};

export const isNeurosiftCompletionRequest = (
  x: any,
): x is NeurosiftCompletionRequest => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "neurosiftCompletionRequest" &&
    typeof x.neurosiftCompletionToken === "string" &&
    typeof x.tokenSignature === "string" &&
    typeof x.challengeResponse === "string" &&
    typeof x.messagesJsonLength === "number" &&
    typeof x.messagesJson === "string" &&
    typeof x.modelName === "string" &&
    (x.toolsJson === undefined || typeof x.toolsJson === "string") &&
    (x.toolChoice === undefined || typeof x.toolChoice === "string")
  );
};

export type NeurosiftCompletionResponse = {
  type: "neurosiftCompletionResponse";
  response: string;
  toolCalls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
};

export const isNeurosiftCompletionResponse = (
  x: any,
): x is NeurosiftCompletionResponse => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "neurosiftCompletionResponse" &&
    typeof x.response === "string" &&
    (x.toolCalls === undefined ||
      (Array.isArray(x.toolCalls) &&
        x.toolCalls.every(
          (y: any) =>
            typeof y === "object" &&
            typeof y.id === "string" &&
            typeof y.type === "string" &&
            typeof y.function === "object" &&
            typeof y.function.name === "string" &&
            typeof y.function.arguments === "string",
        )))
  );
};

export type NeurosiftCompletionTokenObject = {
  timestamp: number;
  difficulty: number;
  delay: number;
  messagesJsonLength: number;
  modelName: string;
};

export const isNeurosiftCompletionTokenObject = (
  x: any,
): x is NeurosiftCompletionTokenObject => {
  return (
    x &&
    typeof x === "object" &&
    typeof x.timestamp === "number" &&
    typeof x.difficulty === "number" &&
    typeof x.delay === "number" &&
    typeof x.messagesJsonLength === "number" &&
    typeof x.modelName === "string"
  );
};
