/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  isArrayOf,
  isEqualTo,
  isNumber,
  isString,
  optional,
  validateObject,
} from "@fi-sci/misc";

export type NeurosiftSavedChat = {
  chatId: string;
  chatTitle: string;
  dandisetId?: string;
  userId: string;
  timestampCreated: number;
  messages: any[];
};

export const isNeurosiftSavedChat = (x: any): x is NeurosiftSavedChat => {
  return validateObject(x, {
    chatId: isString,
    chatTitle: isString,
    dandisetId: optional(isString),
    userId: isString,
    timestampCreated: isNumber,
    messages: isArrayOf(() => true),
  });
};

// GetSavedChats
export type GetSavedChatsRequest = {
  type: "GetSavedChats";
  chatId?: string;
  userId?: string;
  dandiSetId?: string;
};

export const isGetSavedChatsRequest = (x: any): x is GetSavedChatsRequest => {
  return validateObject(x, {
    type: isEqualTo("GetSavedChats"),
    chatId: optional(isString),
    userId: optional(isString),
    dandiSetId: optional(isString),
  });
};

export type GetSavedChatsResponse = {
  type: "GetSavedChats";
  savedChats: NeurosiftSavedChat[];
};

export const isGetSavedChatsResponse = (x: any): x is GetSavedChatsResponse => {
  return validateObject(x, {
    type: isEqualTo("GetSavedChats"),
    savedChats: isArrayOf(isNeurosiftSavedChat),
  });
};

// AddSavedChat
export type AddSavedChatRequest = {
  type: "AddSavedChat";
  chatTitle: string;
  userId: string;
  dandisetId?: string;
  messages: any[];
};

export const isAddSavedChatRequest = (x: any): x is AddSavedChatRequest => {
  return validateObject(x, {
    type: isEqualTo("AddSavedChat"),
    chatTitle: isString,
    userId: isString,
    dandisetId: optional(isString),
    messages: isArrayOf(() => true),
  });
};

export type AddSavedChatResponse = {
  type: "AddSavedChat";
  chatId: string;
};

export const isAddSavedChatResponse = (x: any): x is AddSavedChatResponse => {
  return validateObject(x, {
    type: isEqualTo("AddSavedChat"),
    chatId: isString,
  });
};

// DeleteSavedChat
export type DeleteSavedChatRequest = {
  type: "DeleteSavedChat";
  chatId: string;
};

export const isDeleteSavedChatRequest = (
  x: any,
): x is DeleteSavedChatRequest => {
  return validateObject(x, {
    type: isEqualTo("DeleteSavedChat"),
    chatId: isString,
  });
};

export type DeleteSavedChatResponse = {
  type: "DeleteSavedChat";
};

export const isDeleteSavedChatResponse = (
  x: any,
): x is DeleteSavedChatResponse => {
  return validateObject(x, {
    type: isEqualTo("DeleteSavedChat"),
  });
};
