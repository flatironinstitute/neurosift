// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PythonCode from "./PythonCode";

afterEach(cleanup);

describe("PythonCode", () => {
  it("shows the script with Copy when it isn't behind a button", () => {
    render(<PythonCode script="import lindi" />);
    expect(
      screen.getByRole("button", { name: "Copy Python code" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Load in Python" })).toBeNull();
  });

  it("expands and collapses behind its button", () => {
    render(
      <PythonCode
        script="import lindi"
        install="pip install --upgrade lindi"
        expandLabel="Load in Python"
      />,
    );
    const button = screen.getByRole("button", { name: "Load in Python" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("import")).toBeNull();
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getByRole("button", { name: "Copy Install code" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Copy Python code" }),
    ).toBeTruthy();
    fireEvent.click(button);
    expect(
      screen.queryByRole("button", { name: "Copy Python code" }),
    ).toBeNull();
  });
});
