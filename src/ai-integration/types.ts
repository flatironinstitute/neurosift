/* eslint-disable @typescript-eslint/no-explicit-any */

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
  context: string;
  callbacks: Array<AIComponentCallback>;
}

/**
 * Shape of messages sent to parent window for AI context updates
 */
export type AIContextUpdateMessage =
  | {
      type: "aiContextUpdate";
      title: string;
      components: Array<{
        id: string;
        context: string;
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
  | {
      type: "aiUrlUpdate";
      url: string;
    };

export type AISetChatMessage = {
  type: "setChat";
  chatJson: string;
};

export type AIRequestChatMessage = {
  type: "requestChat";
};

export type AIReportChatMessage = {
  type: "reportChat";
  chatJson: string;
};

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

export interface OtherMessage {
  type: "reportNeurosiftChat";
}

/**
 * Union type of all possible message types
 */
export type AIMessage =
  | AIContextUpdateMessage
  | AICallbackMessage
  | OtherMessage
  | AISetChatMessage
  | AIRequestChatMessage
  | AIReportChatMessage;

/**
 * Core functionality provided by the AI Component Registry
 */
export interface AIComponentRegistryContext {
  registerComponentForAI: (registration: AIRegisteredComponent) => void;
  unregisterComponentForAI: (id: string) => void;
}
