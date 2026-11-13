// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TextInput } from "./TextInput";

afterEach(cleanup);

const noop = () => {};

describe("TextInput", () => {
  it("has a visible label tied to the field", () => {
    render(<TextInput label="Window start (s)" value="" onChange={noop} />);
    const input = screen.getByLabelText("Window start (s)");
    expect(input.tagName).toBe("INPUT");
    expect(input.getAttribute("type")).toBe("text");
  });

  it("is Medium by default and Small in dense places", () => {
    const { container, rerender } = render(
      <TextInput label="Bins" value="" onChange={noop} />,
    );
    expect(container.firstElementChild?.className).toBe(
      "ns-field ns-field--md",
    );
    rerender(<TextInput label="Bins" value="" onChange={noop} size="sm" />);
    expect(container.firstElementChild?.className).toBe(
      "ns-field ns-field--sm",
    );
  });

  it("reports each change as the new text", () => {
    const onChange = vi.fn();
    render(<TextInput label="Bins" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Bins"), {
      target: { value: "50" },
    });
    expect(onChange).toHaveBeenCalledWith("50");
  });

  it("links its helper text to the field", () => {
    render(
      <TextInput
        label="Window start (s)"
        value=""
        onChange={noop}
        helper="Seconds from the start of the session."
      />,
    );
    const input = screen.getByLabelText("Window start (s)");
    const helper = document.getElementById(
      input.getAttribute("aria-describedby") ?? "",
    );
    expect(helper?.textContent).toBe("Seconds from the start of the session.");
  });

  it("keeps a description the caller links, beside its own message", () => {
    render(
      <>
        <TextInput
          label="API key"
          value=""
          onChange={noop}
          aria-describedby="hint"
          error="Enter a key first."
        />
        <p id="hint">Find it in your DANDI account.</p>
      </>,
    );
    const ids = screen
      .getByLabelText("API key")
      .getAttribute("aria-describedby")
      ?.split(" ");
    expect(ids).toHaveLength(2);
    expect(ids?.[0]).toBe("hint");
  });

  it("shows an error in words with an icon, marks the field invalid and links the message", () => {
    render(
      <TextInput
        label="Window start (s)"
        value="2000"
        onChange={noop}
        helper="Seconds from the start of the session."
        error="Use a start between 0 and 1,375.28 s."
      />,
    );
    const input = screen.getByLabelText("Window start (s)");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const message = document.getElementById(
      input.getAttribute("aria-describedby") ?? "",
    );
    expect(message?.textContent).toBe("Use a start between 0 and 1,375.28 s.");
    expect(message?.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(
      screen.queryByText("Seconds from the start of the session."),
    ).toBeNull();
  });

  it("repeats the unit as a suffix, which screen readers skip since the label says it", () => {
    render(
      <TextInput
        label="Window start (s)"
        value="0.18"
        onChange={noop}
        unit="s"
      />,
    );
    const unit = screen.getByText("s");
    expect(unit.getAttribute("aria-hidden")).toBe("true");
  });

  it("can't be edited when disabled", () => {
    render(<TextInput label="Bins" value="50" onChange={noop} disabled />);
    expect((screen.getByLabelText("Bins") as HTMLInputElement).disabled).toBe(
      true,
    );
  });

  it("can keep its label for screen readers only", () => {
    render(
      <TextInput
        label="Opacity value"
        hideLabel
        value="0.5"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("textbox", { name: "Opacity value" })).toBeTruthy();
    expect(screen.getByText("Opacity value").className).toBe(
      "ns-visually-hidden",
    );
  });

  describe("show and hide, for password fields", () => {
    const Secret = ({
      shown,
      onShownChange = noop,
    }: {
      shown: boolean;
      onShownChange?: (shown: boolean) => void;
    }) => (
      <TextInput
        type="password"
        label="DANDI API key"
        value="7f3a9c2e"
        onChange={noop}
        reveal={{ shown, onShownChange, name: "API key" }}
      />
    );

    it("hides the key by default, with a button that says what it shows", () => {
      render(<Secret shown={false} />);
      expect(screen.getByLabelText("DANDI API key").getAttribute("type")).toBe(
        "password",
      );
      expect(screen.getByRole("button", { name: "Show API key" })).toBeTruthy();
    });

    it("shows the key as text, with a button to hide it again", () => {
      render(<Secret shown />);
      expect(screen.getByLabelText("DANDI API key").getAttribute("type")).toBe(
        "text",
      );
      expect(screen.getByRole("button", { name: "Hide API key" })).toBeTruthy();
    });

    it("reports the new state, and keeps the value", () => {
      const onShownChange = vi.fn();
      render(<Secret shown={false} onShownChange={onShownChange} />);
      fireEvent.click(screen.getByRole("button", { name: "Show API key" }));
      expect(onShownChange).toHaveBeenCalledWith(true);
      expect(
        (screen.getByLabelText("DANDI API key") as HTMLInputElement).value,
      ).toBe("7f3a9c2e");
    });

    it("adds no button to fields that aren’t passwords", () => {
      render(<TextInput label="Dandiset ID" value="" onChange={noop} />);
      expect(screen.queryByRole("button")).toBeNull();
    });
  });
});
