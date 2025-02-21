import {
  AIContextUpdateMessage,
  AIMessage,
  AIRegisteredComponent,
} from "../types";

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

/**
 * Handles incoming AI messages from the parent window
 */
export function handleAIMessage(
  event: MessageEvent<AIMessage>,
  registeredComponents: Map<string, AIRegisteredComponent>,
): void {
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
  }
}
