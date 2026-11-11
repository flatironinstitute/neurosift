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
