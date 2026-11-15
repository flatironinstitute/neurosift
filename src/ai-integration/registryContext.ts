import { createContext, useContext } from "react";
import type { AIComponentRegistryContext as AIRegistryContextType } from "./types";

export const AIComponentRegistryContext = createContext<
  AIRegistryContextType | undefined
>(undefined);

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
