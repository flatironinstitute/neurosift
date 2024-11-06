/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  isArrayOf,
  isEqualTo,
  isNumber,
  isString,
  optional,
  validateObject,
  isBoolean,
} from "@fi-sci/misc";

export type NeurosiftSavedChat = {
  chatId: string;
  chatTitle: string;
  dandisetId?: string;
  dandisetVersion?: string;
  nwbFileUrl?: string;
  feedbackResponse?: "helpful" | "unhelpful" | "neutral";
  feedbackNotes?: string;
  feedbackOnly?: boolean;
  userId?: string;
  timestampCreated: number;
  messages: any[];
  imageUrls?: string[];
  figureDataUrls?: string[];
};

export const isNeurosiftSavedChat = (x: any): x is NeurosiftSavedChat => {
  return validateObject(x, {
    chatId: isString,
    chatTitle: isString,
    dandisetId: optional(isString),
    dandisetVersion: optional(isString),
    nwbFileUrl: optional(isString),
    feedbackResponse: optional(isString),
    feedbackNotes: optional(isString),
    feedbackOnly: optional(isBoolean),
    userId: optional(isString),
    timestampCreated: isNumber,
    messages: isArrayOf(() => true),
    imageUrls: optional(isArrayOf(isString)),
    figureDataUrls: optional(isArrayOf(isString)),
  });
};

// GetSavedChats
export type GetSavedChatsRequest = {
  type: "GetSavedChats";
  chatId?: string;
  userId?: string;
  dandisetId?: string;
  dandisetVersion?: string;
  nwbFileUrl?: string;
  feedback?: boolean;
};

export const isGetSavedChatsRequest = (x: any): x is GetSavedChatsRequest => {
  return validateObject(x, {
    type: isEqualTo("GetSavedChats"),
    chatId: optional(isString),
    userId: optional(isString),
    dandisetId: optional(isString),
    dandisetVersion: optional(isString),
    nwbFileUrl: optional(isString),
    feedback: optional(isBoolean),
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
  userId?: string;
  dandisetId?: string;
  dandisetVersion?: string;
  nwbFileUrl?: string;
  feedbackResponse?: "helpful" | "unhelpful" | "neutral";
  feedbackNotes?: string;
  feedbackOnly?: boolean;
  messages: any[];
};

export const isAddSavedChatRequest = (x: any): x is AddSavedChatRequest => {
  return validateObject(x, {
    type: isEqualTo("AddSavedChat"),
    chatTitle: isString,
    userId: optional(isString),
    dandisetId: optional(isString),
    dandisetVersion: optional(isString),
    nwbFileUrl: optional(isString),
    feedbackResponse: optional(isString),
    feedbackNotes: optional(isString),
    feedbackOnly: optional(isBoolean),
    messages: isArrayOf(() => true),
  });
};

export type AddSavedChatResponse = {
  type: "AddSavedChat";
  chatId: string;
  imageSubstitutions: {
    name: string;
    url: string;
    uploadUrl: string;
  }[];
  figureDataSubstitutions?: {
    name: string;
    url: string;
    uploadUrl: string;
  }[];
};

export const isAddSavedChatResponse = (x: any): x is AddSavedChatResponse => {
  return validateObject(x, {
    type: isEqualTo("AddSavedChat"),
    chatId: isString,
    imageSubstitutions: isArrayOf((y: any) => {
      return validateObject(y, {
        name: isString,
        url: isString,
        uploadUrl: isString,
      });
    }),
    figureDataSubstitutions: optional(
      isArrayOf((y: any) => {
        return validateObject(y, {
          name: isString,
          url: isString,
          uploadUrl: isString,
        });
      }),
    ),
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
