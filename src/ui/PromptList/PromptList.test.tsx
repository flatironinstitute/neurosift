// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PromptList } from "./PromptList";

afterEach(cleanup);

const PROMPTS = [
  { id: "count", text: "How many Dandisets are published?" },
  { id: "modality", text: "Break down OpenNeuro datasets by modality" },
];

describe("PromptList", () => {
  it("is a list named by its label", () => {
    render(
      <PromptList
        label="Suggested prompts"
        items={PROMPTS}
        onSelect={() => {}}
      />,
    );
    const list = screen.getByRole("list", { name: "Suggested prompts" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("has one button per prompt, named by its text", () => {
    render(
      <PromptList
        label="Suggested prompts"
        items={PROMPTS}
        onSelect={() => {}}
      />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(
      PROMPTS.map((p) => p.text),
    );
    expect(buttons.every((b) => b.getAttribute("type") === "button")).toBe(
      true,
    );
  });

  it("hands the chosen prompt to onSelect", () => {
    const onSelect = vi.fn();
    render(
      <PromptList
        label="Suggested prompts"
        items={PROMPTS}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: PROMPTS[1].text }));
    expect(onSelect).toHaveBeenCalledWith(PROMPTS[1]);
  });

  it("works from the keyboard, as a native button", () => {
    const onSelect = vi.fn();
    render(
      <PromptList
        label="Suggested prompts"
        items={PROMPTS}
        onSelect={onSelect}
      />,
    );
    const button = screen.getByRole("button", { name: PROMPTS[0].text });
    button.focus();
    expect(document.activeElement).toBe(button);
    expect(button.tagName).toBe("BUTTON");
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith(PROMPTS[0]);
  });

  it("shares its rows with Recently opened", () => {
    render(
      <PromptList
        label="Suggested prompts"
        items={PROMPTS}
        onSelect={() => {}}
      />,
    );
    const list = screen.getByRole("list");
    expect(list.className).toBe("ns-row-list");
    expect(within(list).getAllByRole("listitem")[0].className).toBe(
      "ns-row-list-row",
    );
    expect(screen.getAllByRole("button")[0].className).toBe(
      "ns-row-list-action ns-prompt-list-text",
    );
  });
});
