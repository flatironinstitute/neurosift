// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  handleAIMessage,
  isAllowedAIMessageOrigin,
  isTrustedAIMessageEvent,
} from "./windowMessaging";
import { AIRegisteredComponent } from "../types";

describe("isAllowedAIMessageOrigin", () => {
  it("accepts the chat app and local development origins", () => {
    expect(isAllowedAIMessageOrigin("https://chat.neurosift.app")).toBe(true);
    expect(isAllowedAIMessageOrigin("http://localhost:3000")).toBe(true);
    expect(isAllowedAIMessageOrigin("http://127.0.0.1:5173")).toBe(true);
  });
  it("rejects anything else", () => {
    expect(isAllowedAIMessageOrigin("https://evil.example")).toBe(false);
    expect(
      isAllowedAIMessageOrigin("https://chat.neurosift.app.evil.example"),
    ).toBe(false);
    expect(isAllowedAIMessageOrigin("http://localhost.evil.example")).toBe(
      false,
    );
    expect(isAllowedAIMessageOrigin("null")).toBe(false);
    expect(isAllowedAIMessageOrigin("")).toBe(false);
  });
});

describe("isTrustedAIMessageEvent", () => {
  const parent = { id: "parent" };
  const self = { id: "self" };
  it("trusts the embedding window with an allowed origin", () => {
    expect(
      isTrustedAIMessageEvent(
        { origin: "https://chat.neurosift.app", source: parent },
        parent,
        self,
      ),
    ).toBe(true);
  });
  it("rejects a message from a window other than the parent", () => {
    expect(
      isTrustedAIMessageEvent(
        { origin: "https://chat.neurosift.app", source: { id: "other" } },
        parent,
        self,
      ),
    ).toBe(false);
  });
  it("rejects the parent when its origin is not allowed", () => {
    expect(
      isTrustedAIMessageEvent(
        { origin: "https://evil.example", source: parent },
        parent,
        self,
      ),
    ).toBe(false);
  });
  it("rejects everything when not embedded", () => {
    expect(
      isTrustedAIMessageEvent(
        { origin: "https://chat.neurosift.app", source: self },
        self,
        self,
      ),
    ).toBe(false);
  });
});

describe("handleAIMessage", () => {
  const makeComponents = () => {
    const callback = vi.fn();
    const components = new Map<string, AIRegisteredComponent>();
    components.set("c1", {
      id: "c1",
      context: "",
      callbacks: [{ id: "cb1", description: "", parameters: {}, callback }],
    } as unknown as AIRegisteredComponent);
    return { callback, components };
  };
  const data = {
    type: "aiCallback" as const,
    componentId: "c1",
    callbackId: "cb1",
    parameters: { x: 1 },
  };

  it("ignores a callback request from an untrusted window", () => {
    const { callback, components } = makeComponents();
    handleAIMessage(
      {
        data,
        origin: "https://evil.example",
        source: {},
      } as unknown as MessageEvent,
      components,
    );
    expect(callback).not.toHaveBeenCalled();
  });

  it("ignores a callback request when not embedded at all", () => {
    const { callback, components } = makeComponents();
    handleAIMessage(
      {
        data,
        origin: "https://chat.neurosift.app",
        source: window,
      } as unknown as MessageEvent,
      components,
    );
    expect(callback).not.toHaveBeenCalled();
  });

  it("runs a callback request from the embedding chat window", () => {
    const { callback, components } = makeComponents();
    const fakeParent = { id: "parent" };
    const descriptor = Object.getOwnPropertyDescriptor(window, "parent");
    Object.defineProperty(window, "parent", {
      value: fakeParent,
      configurable: true,
    });
    try {
      handleAIMessage(
        {
          data,
          origin: "https://chat.neurosift.app",
          source: fakeParent,
        } as unknown as MessageEvent,
        components,
      );
    } finally {
      if (descriptor) Object.defineProperty(window, "parent", descriptor);
    }
    expect(callback).toHaveBeenCalledWith({ x: 1 });
  });

  it("ignores messages without a data object", () => {
    const { components } = makeComponents();
    expect(() =>
      handleAIMessage(
        { data: null, origin: "", source: null } as unknown as MessageEvent,
        components,
      ),
    ).not.toThrow();
  });
});
