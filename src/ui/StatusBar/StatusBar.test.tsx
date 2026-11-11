// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StatusBar } from "./StatusBar";

afterEach(cleanup);

describe("StatusBar", () => {
  it("is a named region with the build version in the code face", () => {
    render(<StatusBar version="v2.0.1" items={[]} />);
    const bar = screen.getByRole("region", { name: "Status" });
    expect(bar.querySelector(".ns-statusbar-version")?.textContent).toBe(
      "v2.0.1",
    );
  });

  it("labels every count in words, never bare numbers", () => {
    render(
      <StatusBar
        version="v2.0.1"
        items={["1,267 datasets", "97 data reads"]}
      />,
    );
    expect(screen.getByText("1,267 datasets")).toBeTruthy();
    expect(screen.getByText("97 data reads")).toBeTruthy();
  });

  it("keeps longer detail behind a Details control", () => {
    render(
      <StatusBar
        version="v2.0.1"
        items={[]}
        details="19,484 HDF5 groups read through LINDI."
      />,
    );
    expect(screen.getByRole("button", { name: "About details" })).toBeTruthy();
  });
});
