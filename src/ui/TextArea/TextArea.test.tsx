// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState, type KeyboardEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TextArea } from "./TextArea";

afterEach(cleanup);

const noop = () => {};

describe("TextArea", () => {
  it("has a visible label tied to a multi-line field", () => {
    render(<TextArea label="Message" value="" onChange={noop} />);
    expect(screen.getByLabelText("Message").tagName).toBe("TEXTAREA");
    expect(screen.getByText("Message").className).toBe("ns-field-label");
  });

  it("is Medium by default and Small in dense places", () => {
    const { container, rerender } = render(
      <TextArea label="Notes" value="" onChange={noop} />,
    );
    expect(container.firstElementChild?.className).toBe(
      "ns-field ns-field--md",
    );
    rerender(<TextArea label="Notes" value="" onChange={noop} size="sm" />);
    expect(container.firstElementChild?.className).toBe(
      "ns-field ns-field--sm",
    );
  });

  it("is Large where it matches the Large Search field", () => {
    const { container } = render(
      <TextArea label="Message" value="" onChange={noop} size="lg" rows={1} />,
    );
    expect(container.firstElementChild?.className).toBe(
      "ns-field ns-field--lg",
    );
  });

  it("shows three rows by default", () => {
    render(<TextArea label="Notes" value="" onChange={noop} />);
    const area = screen.getByLabelText("Notes") as HTMLTextAreaElement;
    expect(area.rows).toBe(3);
    expect(area.style.getPropertyValue("--ns-text-area-rows")).toBe("3");
    expect(area.style.getPropertyValue("--ns-text-area-max-rows")).toBe("3");
  });

  it("grows with its content up to maxRows, then scrolls", () => {
    render(
      <TextArea
        label="Message"
        value=""
        onChange={noop}
        rows={1}
        maxRows={6}
      />,
    );
    const area = screen.getByLabelText("Message") as HTMLTextAreaElement;
    expect(area.rows).toBe(1);
    expect(area.style.getPropertyValue("--ns-text-area-rows")).toBe("1");
    expect(area.style.getPropertyValue("--ns-text-area-max-rows")).toBe("6");
  });

  it("never caps below its starting rows", () => {
    render(
      <TextArea label="Notes" value="" onChange={noop} rows={4} maxRows={2} />,
    );
    expect(
      screen
        .getByLabelText("Notes")
        .style.getPropertyValue("--ns-text-area-max-rows"),
    ).toBe("4");
  });

  it("reports each change as the new text", () => {
    const onChange = vi.fn();
    render(<TextArea label="Notes" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "First line\nSecond line" },
    });
    expect(onChange).toHaveBeenCalledWith("First line\nSecond line");
  });

  it("links its helper text to the field", () => {
    render(
      <TextArea
        label="Message"
        value=""
        onChange={noop}
        helper="Enter sends. Shift+Enter adds a line."
      />,
    );
    const area = screen.getByLabelText("Message");
    const helper = document.getElementById(
      area.getAttribute("aria-describedby") ?? "",
    );
    expect(helper?.textContent).toBe("Enter sends. Shift+Enter adds a line.");
  });

  it("keeps a description the caller links, beside its own message", () => {
    const { rerender } = render(
      <>
        <TextArea
          label="Message"
          value=""
          onChange={noop}
          aria-describedby="hint"
        />
        <p id="hint">Enter to send</p>
      </>,
    );
    const area = screen.getByLabelText("Message");
    expect(area.getAttribute("aria-describedby")).toBe("hint");
    rerender(
      <>
        <TextArea
          label="Message"
          value=""
          onChange={noop}
          aria-describedby="hint"
          error="Write a message first."
        />
        <p id="hint">Enter to send</p>
      </>,
    );
    const ids = screen
      .getByLabelText("Message")
      .getAttribute("aria-describedby")
      ?.split(" ");
    expect(ids).toHaveLength(2);
    expect(ids).toContain("hint");
  });

  it("shows an error in words with an icon, marks the field invalid and links the message", () => {
    render(
      <TextArea
        label="Message"
        value=""
        onChange={noop}
        helper="Enter sends. Shift+Enter adds a line."
        error="Write a question before sending."
      />,
    );
    const area = screen.getByLabelText("Message");
    expect(area.getAttribute("aria-invalid")).toBe("true");
    const message = document.getElementById(
      area.getAttribute("aria-describedby") ?? "",
    );
    expect(message?.textContent).toBe("Write a question before sending.");
    expect(message?.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(
      screen.queryByText("Enter sends. Shift+Enter adds a line."),
    ).toBeNull();
  });

  it("can't be edited when disabled", () => {
    render(<TextArea label="Notes" value="Draft" onChange={noop} disabled />);
    expect(
      (screen.getByLabelText("Notes") as HTMLTextAreaElement).disabled,
    ).toBe(true);
  });

  it("can keep its label for screen readers only", () => {
    render(<TextArea label="Message" hideLabel value="" onChange={noop} />);
    expect(screen.getByRole("textbox", { name: "Message" })).toBeTruthy();
    expect(screen.getByText("Message").className).toBe("ns-visually-hidden");
  });

  it("passes native attributes through", () => {
    render(
      <TextArea
        label="Message"
        value=""
        onChange={noop}
        name="message"
        placeholder="Ask about this Dandiset"
        aria-keyshortcuts="Enter"
      />,
    );
    const area = screen.getByLabelText("Message");
    expect(area.getAttribute("name")).toBe("message");
    expect(area.getAttribute("placeholder")).toBe("Ask about this Dandiset");
    expect(area.getAttribute("aria-keyshortcuts")).toBe("Enter");
  });

  describe("a message box where Enter sends and Shift+Enter adds a line", () => {
    const MessageBox = ({ onSend }: { onSend: (text: string) => void }) => {
      const [text, setText] = useState("Hello");
      const send = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key !== "Enter" || event.shiftKey) return;
        event.preventDefault();
        onSend(text);
      };
      return (
        <TextArea
          label="Message"
          value={text}
          onChange={setText}
          onKeyDown={send}
        />
      );
    };

    it("hands Enter to the caller", () => {
      const onSend = vi.fn();
      render(<MessageBox onSend={onSend} />);
      fireEvent.keyDown(screen.getByLabelText("Message"), { key: "Enter" });
      expect(onSend).toHaveBeenCalledWith("Hello");
    });

    it("leaves Shift+Enter to the field", () => {
      const onSend = vi.fn();
      render(<MessageBox onSend={onSend} />);
      const notPrevented = fireEvent.keyDown(screen.getByLabelText("Message"), {
        key: "Enter",
        shiftKey: true,
      });
      expect(onSend).not.toHaveBeenCalled();
      expect(notPrevented).toBe(true);
    });
  });
});
