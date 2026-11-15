// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Select } from "./Select";

afterEach(cleanup);

const noop = () => {};
const description = (el: HTMLElement) =>
  document.getElementById(el.getAttribute("aria-describedby") ?? "")
    ?.textContent;
const GROUPS = [
  { value: "", label: "None" },
  { value: "trial_type", label: "Trial type" },
  { value: "contrast", label: "Contrast", disabled: true },
];

describe("Select", () => {
  it("is a native select named by its visible label", () => {
    render(
      <Select
        label="Group trials by"
        value=""
        onChange={noop}
        options={GROUPS}
      />,
    );
    const select = screen.getByRole("combobox", { name: "Group trials by" });
    expect(select.tagName).toBe("SELECT");
    expect(screen.getByText("Group trials by").tagName).toBe("LABEL");
  });

  it("lists every option and shows the chosen value", () => {
    render(
      <Select
        label="Group trials by"
        value="trial_type"
        onChange={noop}
        options={GROUPS}
      />,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect([...select.options].map((o) => o.label)).toEqual([
      "None",
      "Trial type",
      "Contrast",
    ]);
    expect(select.value).toBe("trial_type");
    expect(select.options[2].disabled).toBe(true);
  });

  it("keeps a description the caller links, beside its own message", () => {
    render(
      <>
        <Select
          label="Group trials by"
          value=""
          onChange={noop}
          options={GROUPS}
          aria-describedby="hint"
          helper="Columns of /intervals/trials."
        />
        <p id="hint">Each group gets its own color.</p>
      </>,
    );
    const ids = screen
      .getByRole("combobox")
      .getAttribute("aria-describedby")
      ?.split(" ");
    expect(ids).toHaveLength(2);
    expect(ids?.[0]).toBe("hint");
  });

  it("reports the picked value", () => {
    const onChange = vi.fn();
    render(
      <Select
        label="Group trials by"
        value=""
        onChange={onChange}
        options={GROUPS}
      />,
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "trial_type" },
    });
    expect(onChange).toHaveBeenCalledWith("trial_type");
  });

  it("keeps meta text out of the option's name, so the closed field shows only the value", () => {
    render(
      <Select
        label="Version"
        value="draft"
        onChange={noop}
        options={[
          { value: "draft", label: "Draft", meta: "Latest, not yet published" },
        ]}
      />,
    );
    const option = (screen.getByRole("combobox") as HTMLSelectElement)
      .options[0];
    expect(option.label).toBe("Draft");
    expect(option.dataset.meta).toBe("Latest, not yet published");
  });

  it("ties helper text and errors to the field, and marks errors invalid", () => {
    const { rerender } = render(
      <Select
        label="Group trials by"
        value=""
        onChange={noop}
        options={GROUPS}
        helper="Splits the PSTH into one row per value."
      />,
    );
    const select = screen.getByRole("combobox");
    expect(description(select)).toBe("Splits the PSTH into one row per value.");
    expect(select.getAttribute("aria-invalid")).toBeNull();
    rerender(
      <Select
        label="Group trials by"
        value=""
        onChange={noop}
        options={GROUPS}
        error="“Contrast” isn’t in this file’s trials table. Pick another column."
      />,
    );
    expect(select.getAttribute("aria-invalid")).toBe("true");
    expect(description(select)).toBe(
      "“Contrast” isn’t in this file’s trials table. Pick another column.",
    );
  });

  it("comes in two sizes and passes native props through", () => {
    render(
      <Select
        label="Sort units by"
        value=""
        onChange={noop}
        options={GROUPS}
        size="sm"
        disabled
      />,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.disabled).toBe(true);
    expect(select.closest(".ns-field")?.classList).toContain("ns-field--sm");
  });
});

describe("Select in browsers without customizable selects", () => {
  const SPEEDS = [
    { value: "0.5", label: "0.5×" },
    { value: "1", label: "1×" },
    { value: "2", label: "2×", meta: "Fast" },
    { value: "4", label: "4×", disabled: true },
    { value: "8", label: "8×" },
  ];

  const stubBrowser = () => {
    vi.stubGlobal("CSS", {
      supports: (property: string) => property === "anchor-name",
    });
    vi.stubGlobal(
      "matchMedia",
      (query: string) =>
        ({ matches: query === "(pointer: fine)" }) as MediaQueryList,
    );
    Element.prototype.scrollIntoView = () => {};
    // jsdom has no popovers; these mimic the toggle events browsers send.
    HTMLElement.prototype.showPopover = function () {
      this.dataset.open = "";
      this.dispatchEvent(
        Object.assign(new Event("toggle"), { newState: "open" }),
      );
    };
    HTMLElement.prototype.hidePopover = function () {
      delete this.dataset.open;
      this.dispatchEvent(
        Object.assign(new Event("toggle"), { newState: "closed" }),
      );
    };
  };

  const Speed = ({
    onChange = noop,
  }: {
    onChange?: (value: string) => void;
  }) => (
    <Select
      label="Playback speed"
      value="1"
      onChange={onChange}
      options={SPEEDS}
    />
  );

  afterEach(() => vi.unstubAllGlobals());

  it("draws its own list: a combobox named by the label, showing the value", () => {
    stubBrowser();
    render(<Speed />);
    const field = screen.getByRole("combobox", { name: "Playback speed" });
    expect(field.tagName).toBe("BUTTON");
    expect(field.textContent).toBe("1×");
    expect(field.getAttribute("aria-expanded")).toBe("false");
    expect(
      screen.getByRole("listbox", { hidden: true }).getAttribute("aria-label"),
    ).toBe("Playback speed");
  });

  it("opens on the chosen option, moves past disabled ones and picks with Enter", () => {
    stubBrowser();
    const onChange = vi.fn<(value: string) => void>();
    render(<Speed onChange={onChange} />);
    const field = screen.getByRole("combobox");
    fireEvent.keyDown(field, { key: "ArrowDown" });
    expect(field.getAttribute("aria-expanded")).toBe("true");
    const active = () =>
      document.getElementById(field.getAttribute("aria-activedescendant") ?? "")
        ?.textContent;
    expect(active()).toBe("1×");
    fireEvent.keyDown(field, { key: "ArrowDown" });
    fireEvent.keyDown(field, { key: "ArrowDown" });
    expect(active()).toBe("8×");
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("8");
    expect(field.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes on Escape without changing the value", () => {
    stubBrowser();
    const onChange = vi.fn<(value: string) => void>();
    render(<Speed onChange={onChange} />);
    const field = screen.getByRole("combobox");
    fireEvent.keyDown(field, { key: " " });
    fireEvent.keyDown(field, { key: "End" });
    fireEvent.keyDown(field, { key: "Escape" });
    expect(field.getAttribute("aria-expanded")).toBe("false");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("picks by typing while closed, as a native select does", () => {
    stubBrowser();
    const onChange = vi.fn<(value: string) => void>();
    render(<Speed onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "2" });
    expect(onChange).toHaveBeenCalledWith("2");
  });

  it("marks the chosen option, shows meta text and ignores clicks on disabled options", () => {
    stubBrowser();
    const onChange = vi.fn<(value: string) => void>();
    render(<Speed onChange={onChange} />);
    fireEvent.click(screen.getByRole("combobox"));
    const options = screen.getAllByRole("option", { hidden: true });
    expect(options[1].getAttribute("aria-selected")).toBe("true");
    expect(options[2].textContent).toBe("2×Fast");
    fireEvent.click(options[3]);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(options[4]);
    expect(onChange).toHaveBeenCalledWith("8");
  });

  it("keeps the native select on touch screens", () => {
    stubBrowser();
    vi.stubGlobal(
      "matchMedia",
      () => ({ matches: false }) as unknown as MediaQueryList,
    );
    render(<Speed />);
    expect(screen.getByRole("combobox").tagName).toBe("SELECT");
  });
});
