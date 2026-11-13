// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CodeBlock, InlineCode } from "./CodeBlock";

const SCRIPT = `import lindi

# Load the remote file
url = 'https://api.dandiarchive.org/api/assets/abc/download/'
rate = X['starting_time'].attrs['rate'] * 2.5`;

let writeText: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers();
  writeText = vi.fn(() => Promise.resolve());
  Object.assign(navigator, { clipboard: { writeText } });
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

const copy = async (name: RegExp | string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
};

describe("CodeBlock", () => {
  it("is real text in pre and code, with no React warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<CodeBlock language="python" code={SCRIPT} />);
    const code = container.querySelector("pre > code")!;
    const text = [...code.querySelectorAll(".ns-code-text")]
      .map((l) => l.textContent)
      .join("\n");
    expect(text).toBe(SCRIPT);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("numbers each real line for a script, hidden from screen readers", () => {
    const { container } = render(<CodeBlock language="python" code={SCRIPT} />);
    const numbers = [...container.querySelectorAll(".ns-code-line-number")];
    expect(numbers.map((n) => n.textContent)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    for (const n of numbers) expect(n.getAttribute("aria-hidden")).toBe("true");
  });

  it("colors keywords, strings, numbers and comments from the code tokens", () => {
    const { container } = render(<CodeBlock language="python" code={SCRIPT} />);
    const of = (kind: string) =>
      [...container.querySelectorAll(`.ns-code-${kind}`)].map(
        (t) => t.textContent,
      );
    expect(of("keyword")).toEqual(["import"]);
    expect(of("comment")).toEqual(["# Load the remote file"]);
    expect(of("string")).toContain(
      "'https://api.dandiarchive.org/api/assets/abc/download/'",
    );
    expect(of("number")).toEqual(["2.5"]);
  });

  it("copies the code, says Copied for 2 seconds, and announces it", async () => {
    render(<CodeBlock language="python" code={SCRIPT} />);
    await copy("Copy Python code");
    expect(writeText).toHaveBeenCalledWith(SCRIPT);
    expect(screen.getByRole("status").textContent).toBe("Copied");
    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();
    act(() => vi.advanceTimersByTime(2000));
    expect(
      screen.getByRole("button", { name: "Copy Python code" }),
    ).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("shows a shell command's $ prompt without numbers, and leaves the prompt out of the copy", async () => {
    const { container } = render(
      <CodeBlock language="shell" code="$ pip install --upgrade lindi" />,
    );
    expect(container.querySelector(".ns-code-line-number")).toBeNull();
    expect(container.querySelector("pre")!.textContent).toBe(
      "$ pip install --upgrade lindi",
    );
    await copy("Copy Shell code");
    expect(writeText).toHaveBeenCalledWith("pip install --upgrade lindi");
  });

  it("names the block by its title when it has one", () => {
    render(
      <CodeBlock
        language="python"
        title="sub-1_ses-1_ecephys.nwb"
        code="x = 1"
      />,
    );
    expect(screen.getByText("sub-1_ses-1_ecephys.nwb")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Copy sub-1_ses-1_ecephys.nwb code" }),
    ).toBeTruthy();
  });

  it("shows any other language, or output, as plain text named by its title", async () => {
    const json = `{\n  "dandiset": "000728",\n  "files": 12\n}`;
    const { container } = render(<CodeBlock title="JSON" code={json} />);
    expect(screen.getByText("JSON")).toBeTruthy();
    expect(container.querySelector(".ns-code-line-number")).toBeNull();
    expect(
      container.querySelector(
        ".ns-code-keyword, .ns-code-string, .ns-code-number, .ns-code-comment",
      ),
    ).toBeNull();
    expect(container.querySelectorAll(".ns-code-line")).toHaveLength(4);
    await copy("Copy JSON");
    expect(writeText).toHaveBeenCalledWith(json);
    cleanup();
    render(<CodeBlock title="Output" code="$ not a prompt" />);
    await copy("Copy Output");
    expect(writeText).toHaveBeenLastCalledWith("$ not a prompt");
  });

  it("says so when the browser won't copy", async () => {
    writeText.mockImplementation(() => Promise.reject(new Error("denied")));
    render(<CodeBlock language="python" code={SCRIPT} />);
    await copy("Copy Python code");
    expect(screen.getByRole("status").textContent).toBe(
      "Couldn’t copy. Select the code and copy it.",
    );
  });
});

describe("InlineCode", () => {
  it("is a code element", () => {
    const { container } = render(<InlineCode>/acquisition/LFPs</InlineCode>);
    expect(container.firstElementChild?.tagName).toBe("CODE");
    expect(container.textContent).toBe("/acquisition/LFPs");
  });
});
