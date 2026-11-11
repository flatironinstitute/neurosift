// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DescriptionList } from "./DescriptionList";

afterEach(cleanup);

const SESSION = [
  { term: "Session", value: "sub-1_ses-1" },
  { term: "Start", value: "2018-01-01T00:00:00−08:00", code: true },
];

describe("DescriptionList", () => {
  it("is a description list, so screen readers announce each pair", () => {
    const { container } = render(
      <DescriptionList label="Session" items={SESSION} />,
    );
    const list = container.querySelector("dl");
    expect(list).toBeTruthy();
    expect(list?.getAttribute("aria-label")).toBe("Session");
    expect(
      [...container.querySelectorAll("dt")].map((dt) => dt.textContent),
    ).toEqual(["Session", "Start"]);
    expect(screen.getByText("sub-1_ses-1").tagName).toBe("DD");
  });

  it("sets keys beside their values by default, stacked for facts, and in code for HDF5 attributes", () => {
    const { container, rerender } = render(
      <DescriptionList label="Session" items={SESSION} />,
    );
    expect(container.querySelector("dl")?.className).toBe(
      "ns-dl ns-dl--beside",
    );
    rerender(
      <DescriptionList label="Facts" items={SESSION} layout="stacked" />,
    );
    expect(container.querySelector("dl")?.className).toBe(
      "ns-dl ns-dl--stacked",
    );
    rerender(
      <DescriptionList label="Attributes" items={SESSION} layout="code" />,
    );
    expect(container.querySelector("dl")?.className).toBe("ns-dl ns-dl--code");
  });

  it("sets identifiers in the code face", () => {
    render(<DescriptionList label="Session" items={SESSION} />);
    expect(screen.getByText("2018-01-01T00:00:00−08:00").className).toBe(
      "ns-dl-value ns-dl-value--code",
    );
    expect(screen.getByText("sub-1_ses-1").className).toBe("ns-dl-value");
  });

  it("shows an em dash and a reason for a missing value", () => {
    render(
      <DescriptionList
        label="Session"
        items={[
          {
            term: "Start",
            value: undefined,
            missing: "No start time in this file",
          },
        ]}
      />,
    );
    expect(screen.getByText("— No start time in this file")).toBeTruthy();
  });
});
