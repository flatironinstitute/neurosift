// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ChatLink from "./ChatLink";

afterEach(cleanup);

describe("ChatLink", () => {
  it("opens the chat in a new tab, marked Experimental", () => {
    render(
      <ChatLink href="https://example.org/chat">
        Ask about this file in Chat
      </ChatLink>,
    );
    const link = screen.getByRole("link", {
      name: "Ask about this file in Chat",
    });
    expect(link.getAttribute("href")).toBe("https://example.org/chat");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.parentElement?.textContent).toContain("Experimental");
  });
});
