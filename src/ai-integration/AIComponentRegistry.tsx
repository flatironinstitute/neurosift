import React from "react";
import { useAIRegistry } from "./hooks/useAIComponentRegistry";
import { AIComponentRegistryContext } from "./registryContext";

/**
 * Provider component that enables AI integration for child components
 */
export const AIComponentRegistryProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const registryHook = useAIRegistry();

  return (
    <AIComponentRegistryContext.Provider value={registryHook}>
      {children}
    </AIComponentRegistryContext.Provider>
  );
};
