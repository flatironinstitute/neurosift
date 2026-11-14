// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PythonCode from "./PythonCode";
import * as notebook from "./notebook";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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

  it("offers no notebook unless the view asks for one", () => {
    render(<PythonCode script="import lindi" />);
    expect(
      screen.queryByRole("button", { name: "Download notebook (.ipynb)" }),
    ).toBeNull();
  });

  it("downloads the shown script as a notebook named after the file", () => {
    const download = vi
      .spyOn(notebook, "downloadNotebook")
      .mockImplementation(() => {});
    render(
      <PythonCode
        script="import lindi"
        install="pip install --upgrade lindi"
        notebook={{
          file: "sub-35/sub-35_ses-1.nwb",
          objectPath: "/units",
          title: "/units in sub-35_ses-1.nwb",
          intro: "Loads the file.",
        }}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Download notebook (.ipynb)" }),
    );
    expect(download).toHaveBeenCalledWith("sub-35_ses-1-units.ipynb", {
      title: "/units in sub-35_ses-1.nwb",
      intro: "Loads the file.",
      install: "pip install --upgrade lindi",
      script: "import lindi",
    });
  });
});
