import {
  AIContextUpdateMessage,
  AIMessage,
  AIRegisteredComponent,
  AIRequestChatMessage,
  AISetChatMessage,
} from "../types";

const globalNeurosiftChat = {
  neurosiftChatReported: false,
};

/**
 * Sends an AI context update message to the parent window
 */
export function sendContextUpdate(
  registeredComponents: Map<string, AIRegisteredComponent>,
): void {
  // Don't send messages if not in an iframe
  if (window.parent === window) return;

  const message: AIContextUpdateMessage = {
    type: "aiContextUpdate",
    title: "Neurosift",
    components: Array.from(registeredComponents.entries()).map(([id, reg]) => ({
      id,
      context: reg.context,
      availableCallbacks: reg.callbacks.map((cb) => ({
        componentId: id,
        id: cb.id,
        description: cb.description,
        parameters: cb.parameters,
      })),
    })),
  };

  window.parent.postMessage(message, "*");
}

export function sendSetChatMessage(chatJson: string): void {
  if (window.parent === window) return;

  const message: AISetChatMessage = {
    type: "setChat",
    chatJson,
  };

  window.parent.postMessage(message, "*");
}

let chatJsonReceived: string | null = null;
export async function requestAndGetChatJsonFromNeurosiftChat(): Promise<
  string | null
> {
  const message: AIRequestChatMessage = {
    type: "requestChat",
  };
  chatJsonReceived = null;
  window.parent.postMessage(message, "*");

  const timer = Date.now();
  while (!chatJsonReceived && Date.now() - timer < 5000) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!chatJsonReceived) {
    return null;
  }
  return chatJsonReceived;
}

export function sendUrlUpdate(url: string): void {
  if (window.parent === window) return;

  const message = {
    type: "aiUrlUpdate",
    url,
  };

  window.parent.postMessage(message, "*");
}

// Origins that are allowed to drive neurosift through window messages: the
// Neurosift chat app, and local development servers.
export const allowedAIMessageOrigins = ["https://chat.neurosift.app"];

export const isAllowedAIMessageOrigin = (origin: string): boolean => {
  if (allowedAIMessageOrigins.includes(origin)) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

// A message is acted on only when it comes from the window that embeds
// neurosift and that window has an allowed origin. Without this check any
// page that opened or framed neurosift could invoke a registered callback
// with arbitrary parameters.
export const isTrustedAIMessageEvent = (
  event: { origin: string; source: unknown },
  parentWindow: unknown = window.parent,
  selfWindow: unknown = window,
): boolean => {
  if (parentWindow === selfWindow) return false; // not embedded
  if (event.source !== parentWindow) return false;
  return isAllowedAIMessageOrigin(event.origin);
};

/**
 * Handles incoming AI messages from the parent window
 */
export function handleAIMessage(
  event: MessageEvent<AIMessage>,
  registeredComponents: Map<string, AIRegisteredComponent>,
): void {
  if (!event.data || typeof event.data !== "object") return;
  if (!isTrustedAIMessageEvent(event)) return;
  if (event.data.type === "aiCallback") {
    const { componentId, callbackId, parameters } = event.data;
    const component = registeredComponents.get(componentId);

    if (!component) {
      console.error(`Component with id ${componentId} not found`);
      return;
    }

    const callback = component.callbacks.find((cb) => cb.id === callbackId);
    if (!callback) {
      console.error(`Callback with id ${callbackId} not found`);
      return;
    }

    console.log(
      `Calling callback ${callbackId} for component ${componentId}`,
      parameters,
    );

    // Type assertion since parameters are validated by the parent window
    callback.callback(parameters as Record<string, unknown>);
  } else if (event.data.type === "reportNeurosiftChat") {
    globalNeurosiftChat.neurosiftChatReported = true;
  } else if (event.data.type === "reportChat") {
    chatJsonReceived = event.data.chatJson;
  }
}

export const isInNeurosiftChat = () => {
  return globalNeurosiftChat.neurosiftChatReported;
};
