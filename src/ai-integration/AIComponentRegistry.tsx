import React, { createContext, useContext } from "react";
import type { AIComponentRegistryContext as AIRegistryContextType } from "./types";
import { useAIRegistry } from "./hooks/useAIComponentRegistry";

const AIComponentRegistryContext = createContext<
  AIRegistryContextType | undefined
>(undefined);

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

/**
 * Hook to access AI component registry functionality
 * Must be used within an AIComponentRegistryProvider
 */
export const useAIComponentRegistry = () => {
  const context = useContext(AIComponentRegistryContext);
  if (!context) {
    throw new Error(
      "useAIComponentRegistry must be used within an AIComponentRegistryProvider",
    );
  }
  return context;
};

// Re-export types for convenience
export * from "./types";
