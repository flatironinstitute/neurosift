import { useState, useEffect, useCallback } from "react";
import { AIRegisteredComponent } from "../types";
import {
  sendContextUpdate,
  handleAIMessage,
} from "../messaging/windowMessaging";

/**
 * Hook that manages the registration and messaging of AI-enabled components
 */
export function useAIRegistry() {
  const [registeredComponents] = useState<Map<string, AIRegisteredComponent>>(
    () => new Map(),
  );

  const registerComponentForAI = useCallback(
    (registration: AIRegisteredComponent) => {
      registeredComponents.set(
        registration.id,
        registration as AIRegisteredComponent,
      );
      sendContextUpdate(registeredComponents);
    },
    [registeredComponents],
  );

  const unregisterComponentForAI = useCallback(
    (id: string) => {
      registeredComponents.delete(id);
      sendContextUpdate(registeredComponents);
    },
    [registeredComponents],
  );

  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      handleAIMessage(event, registeredComponents);
    };

    window.addEventListener("message", messageHandler);
    return () => window.removeEventListener("message", messageHandler);
  }, [registeredComponents]);

  return {
    registerComponentForAI,
    unregisterComponentForAI,
  };
}
