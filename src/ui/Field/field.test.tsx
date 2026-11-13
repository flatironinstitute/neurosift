// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Select } from "../Select/Select";
import { TextInput } from "../TextInput/TextInput";

// Vitest skips CSS imports, so the test reads the rules and matches their selectors.
const css = document.createElement("style");
beforeAll(() => {
  css.textContent = readFileSync(`${import.meta.dirname}/../field.css`, "utf8");
  document.head.append(css);
});
afterEach(cleanup);

const noop = () => {};
const OPTIONS = [
  { value: "trial_type", label: "Trial type" },
  { value: "contrast", label: "Contrast", disabled: true },
];
const styledAs = (element: Element, property: string, token: string) =>
  [...(css.sheet?.cssRules ?? [])].some(
    (rule) =>
      rule instanceof CSSStyleRule &&
      rule.style.getPropertyValue(property) === `var(${token})` &&
      element.matches(rule.selectorText),
  );
const isDimmed = (control: HTMLElement) => ({
  box: styledAs(
    control.closest(".ns-field-box")!,
    "border-color",
    "--border-disabled",
  ),
  label: styledAs(
    document.querySelector(`label[for="${control.id}"]`)!,
    "color",
    "--text-disabled",
  ),
});

describe("Field disabled look", () => {
  it("dims the field when its control is disabled", () => {
    render(
      <>
        <TextInput label="Bins" value="" onChange={noop} disabled />
        <Select
          label="Group trials by"
          value="trial_type"
          onChange={noop}
          options={OPTIONS}
          disabled
        />
      </>,
    );
    const dimmed = { box: true, label: true };
    expect(isDimmed(screen.getByLabelText("Bins"))).toEqual(dimmed);
    expect(isDimmed(screen.getByLabelText("Group trials by"))).toEqual(dimmed);
  });

  it("leaves a Select enabled-looking when only one of its options is disabled", () => {
    render(
      <Select
        label="Group trials by"
        value="trial_type"
        onChange={noop}
        options={OPTIONS}
      />,
    );
    expect(isDimmed(screen.getByLabelText("Group trials by"))).toEqual({
      box: false,
      label: false,
    });
  });
});
