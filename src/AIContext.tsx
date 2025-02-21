/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useEffect, useState } from "react";

export type AIComponentContext = {
  [key: string]: string | number | boolean | object | null | undefined;
};

export interface ComponentRegistrationForAICallback {
  id: string;
  description: string;
  parameters: { [key: string]: { type: string; description: string } };
  callback: (params: { [key: string]: any }) => void;
}

export interface ComponentRegistrationForAI {
  id: string;
  context: AIComponentContext;
  callbacks: ComponentRegistrationForAICallback[];
}

interface AIContextValue {
  registerComponentForAI: (registration: ComponentRegistrationForAI) => void;
  unregisterComponentForAI: (id: string) => void;
}

const AIContext = createContext<AIContextValue | undefined>(undefined);

export const AIContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [registeredComponents] = useState<
    Map<string, ComponentRegistrationForAI>
  >(() => new Map());

  const registerComponentForAI = (registration: ComponentRegistrationForAI) => {
    registeredComponents.set(registration.id, registration);
    updateParentWindow();
  };

  const unregisterComponentForAI = (id: string) => {
    registeredComponents.delete(id);
    updateParentWindow();
  };

  const updateParentWindow = () => {
    const msg = {
      type: "aiContextUpdate",
      components: Array.from(registeredComponents.entries()).map(
        ([id, reg]) => ({
          id,
          context: reg.context,
          availableCallbacks: reg.callbacks.map((cb) => ({
            componentId: id,
            id: cb.id,
            description: cb.description,
            parameters: cb.parameters,
          })),
        }),
      ),
    };

    // Don't send messages if not in an iframe
    if (window.parent === window) return;
    window.parent.postMessage(msg, "*");
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
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
        callback.callback(parameters);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [registeredComponents]);

  return (
    <AIContext.Provider
      value={{ registerComponentForAI, unregisterComponentForAI }}
    >
      {children}
    </AIContext.Provider>
  );
};

export const useAIContext = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error("useAIContext must be used within an AIContextProvider");
  }
  return context;
};
