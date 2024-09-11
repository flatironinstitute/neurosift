// initiatePublish
export type InitiatePublishRequest = {
  type: "initiatePublishRequest";
  channel: string;
  senderPublicKey: string;
  messageSize: number;
  messageSignature: string;
};

export const isInitiatePublishRequest = (
  x: any,
): x is InitiatePublishRequest => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "initiatePublishRequest" &&
    typeof x.channel === "string" &&
    typeof x.senderPublicKey === "string" &&
    typeof x.messageSize === "number" &&
    typeof x.messageSignature === "string"
  );
};

export type InitiatePublishResponse = {
  type: "initiatePublishResponse";
  publishToken: string;
  tokenSignature: string;
};

export const isInitiatePublishResponse = (
  x: any,
): x is InitiatePublishResponse => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "initiatePublishResponse" &&
    typeof x.publishToken === "string" &&
    typeof x.tokenSignature === "string"
  );
};

// publish
export type PublishRequest = {
  type: "publishRequest";
  publishToken: string;
  tokenSignature: string;
  messageJson: string;
  challengeResponse: string;
};

export const isPublishRequest = (x: any): x is PublishRequest => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "publishRequest" &&
    typeof x.publishToken === "string" &&
    typeof x.tokenSignature === "string" &&
    typeof x.messageJson === "string" &&
    typeof x.challengeResponse === "string"
  );
};

export type PublishResponse = {
  type: "publishResponse";
  success: boolean;
};

export const isPublishResponse = (x: any): x is PublishResponse => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "publishResponse" &&
    typeof x.success === "boolean"
  );
};

// initiateSubscribe
export type InitiateSubscribeRequest = {
  type: "initiateSubscribeRequest";
  channels: string[];
};

export const isInitiateSubscribeRequest = (
  x: any,
): x is InitiateSubscribeRequest => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "initiateSubscribeRequest" &&
    Array.isArray(x.channels) &&
    x.channels.every((c: any) => typeof c === "string")
  );
};

export type InitiateSubscribeResponse = {
  type: "initiateSubscribeResponse";
  subscribeToken: string;
  tokenSignature: string;
};

export const isInitiateSubscribeResponse = (
  x: any,
): x is InitiateSubscribeResponse => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "initiateSubscribeResponse" &&
    typeof x.subscribeToken === "string" &&
    typeof x.tokenSignature === "string"
  );
};

// subscribe
export type SubscribeRequest = {
  type: "subscribeRequest";
  subscribeToken: string;
  tokenSignature: string;
  channels: string[];
  challengeResponse: string;
};

export const isSubscribeRequest = (x: any): x is SubscribeRequest => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "subscribeRequest" &&
    typeof x.subscribeToken === "string" &&
    typeof x.tokenSignature === "string" &&
    Array.isArray(x.channels) &&
    x.channels.every((c: any) => typeof c === "string") &&
    typeof x.challengeResponse === "string"
  );
};

export type SubscribeResponse = {
  type: "subscribeResponse";
  pubnubSubscribeKey: string;
  pubnubToken: string;
};

export const isSubscribeResponse = (x: any): x is SubscribeResponse => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "subscribeResponse" &&
    typeof x.pubnubSubscribeKey === "string" &&
    typeof x.pubnubToken === "string"
  );
};

export type SubscribeTokenObject = {
  timestamp: number;
  difficulty: number;
  delay: number;
  channels: string[];
};

export const isSubscribeTokenObject = (x: any): x is SubscribeTokenObject => {
  return (
    x &&
    typeof x === "object" &&
    typeof x.timestamp === "number" &&
    typeof x.difficulty === "number" &&
    typeof x.delay === "number" &&
    Array.isArray(x.channels) &&
    x.channels.every((c: any) => typeof c === "string")
  );
};

export type PublishTokenObject = {
  timestamp: number;
  difficulty: number;
  delay: number;
  senderPublicKey: string;
  channel: string;
  messageSize: number;
  messageSignature: string;
};

export const isPublishTokenObject = (x: any): x is PublishTokenObject => {
  return (
    x &&
    typeof x === "object" &&
    typeof x.timestamp === "number" &&
    typeof x.difficulty === "number" &&
    typeof x.delay === "number" &&
    typeof x.senderPublicKey === "string" &&
    typeof x.channel === "string" &&
    typeof x.messageSize === "number" &&
    typeof x.messageSignature === "string"
  );
};

export type PubsubMessage = {
  type: "message";
  senderPublicKey: string;
  timestamp: number;
  messageJson: string;
  messageSignature: string;
  systemSignaturePayload: string;
  systemSignature: string;
  systemPublicKey: string;
};

export const isPubsubMessage = (x: any): x is PubsubMessage => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "message" &&
    typeof x.senderPublicKey === "string" &&
    typeof x.timestamp === "number" &&
    typeof x.messageJson === "string" &&
    typeof x.messageSignature === "string" &&
    typeof x.systemSignaturePayload === "string" &&
    typeof x.systemSignature === "string" &&
    typeof x.systemPublicKey === "string"
  );
};
