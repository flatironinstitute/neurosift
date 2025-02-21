/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Represents the state/context of an AI-enabled component
 */
export type AIComponentState = {
  [key: string]: string | number | boolean | object | null | undefined;
};

/**
 * Represents a callback that can be triggered on an AI-enabled component
 */
export interface AIComponentCallback {
  id: string;
  description: string;
  parameters: {
    [key: string]: {
      type: string;
      description: string;
      required?: boolean;
    };
  };
  callback: (params: any) => void;
}

/**
 * Represents a component registered for AI interaction
 */
export interface AIRegisteredComponent {
  id: string;
  context: AIComponentState;
  callbacks: Array<AIComponentCallback>;
}

/**
 * Shape of messages sent to parent window for AI context updates
 */
export interface AIContextUpdateMessage {
  type: "aiContextUpdate";
  components: Array<{
    id: string;
    context: AIComponentState;
    availableCallbacks: Array<{
      componentId: string;
      id: string;
      description: string;
      parameters: {
        [key: string]: {
          type: string;
          description: string;
        };
      };
    }>;
  }>;
}

/**
 * Shape of messages received from parent window for callback execution
 */
export interface AICallbackMessage {
  type: "aiCallback";
  componentId: string;
  callbackId: string;
  parameters: {
    [key: string]: any;
  };
}

/**
 * Union type of all possible message types
 */
export type AIMessage = AIContextUpdateMessage | AICallbackMessage;

/**
 * Core functionality provided by the AI Component Registry
 */
export interface AIComponentRegistryContext {
  registerComponentForAI: (registration: AIRegisteredComponent) => void;
  unregisterComponentForAI: (id: string) => void;
}
