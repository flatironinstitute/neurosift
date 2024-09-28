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