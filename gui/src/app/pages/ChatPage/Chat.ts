import { ORMessage } from "./openRouterTypes";

export type Chat = {
  messages: (
    | ORMessage
    | { role: "client-side-only"; content: string; color?: string } // not used anymore
  )[];
};

export type ChatAction =
  | {
      type: "add-message";
      message: ORMessage;
    }
  | {
      type: "add-messages";
      messages: ORMessage[];
    }
  | {
      type: "truncate-messages";
      lastMessage:
        | ORMessage
        | { role: "client-side-only"; content: string; color?: string }
        | null;
    }
  | {
      type: "clear-messages";
    }
  | {
      type: "set";
      chat: Chat;
    };

export const chatReducer = (state: Chat, action: ChatAction): Chat => {
  if (action.type === "add-message") {
    return {
      ...state,
      messages: [...state.messages, action.message],
    };
  } else if (action.type === "add-messages") {
    return {
      ...state,
      messages: [...state.messages, ...action.messages],
    };
  } else if (action.type === "truncate-messages") {
    if (action.lastMessage === null) {
      return {
        ...state,
        messages: [],
      };
    }
    const index = action.lastMessage
      ? state.messages.indexOf(action.lastMessage)
      : -1;
    if (index < 0) {
      return state;
    }
    return {
      ...state,
      messages: state.messages.slice(0, index + 1),
    };
  } else if (action.type === "clear-messages") {
    return {
      ...state,
      messages: [],
    };
  } else if (action.type === "set") {
    return {
      messages: [...action.chat.messages],
    };
  } else return state;
};

export const emptyChat: Chat = {
  messages: [],
};
