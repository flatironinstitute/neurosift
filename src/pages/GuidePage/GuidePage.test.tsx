// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GuidePage from "./GuidePage";

afterEach(cleanup);

describe("GuidePage", () => {
  it("is a page titled Neurosift Guide with its three sections, and no React warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<GuidePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Neurosift Guide" }),
    ).toBeTruthy();
    for (const name of ["Overview", "Using Neurosift", "Getting Help"])
      expect(screen.getByRole("region", { name })).toBeTruthy();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("lists each way of using Neurosift under its own heading", () => {
    render(<GuidePage />);
    const using = screen.getByRole("region", { name: "Using Neurosift" });
    expect(
      within(using)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual([
      "Exploring DANDI Archive",
      "Exploring EMBER Archive",
      "Using OpenNeuro",
      "Viewing Remote NWB Files",
      "Viewing Local Files",
    ]);
    expect(within(using).getAllByRole("list")).toHaveLength(5);
  });

  it("links to the archives, both versions and the issue tracker", () => {
    render(<GuidePage />);
    const links: [string, string][] = [
      ["DANDI Archive", "https://dandiarchive.org/"],
      ["OpenNeuro", "https://openneuro.org/"],
      ["https://neurosift.app", "https://neurosift.app"],
      ["https://neurosift2.vercel.app", "https://neurosift2.vercel.app"],
      [
        "GitHub issue tracker",
        "https://github.com/flatironinstitute/neurosift/issues",
      ],
    ];
    for (const [name, href] of links)
      expect(screen.getByRole("link", { name }).getAttribute("href")).toBe(
        href,
      );
  });

  it("shows the commands as copyable shell code and the URL format as inline code", () => {
    render(<GuidePage />);
    expect(
      screen.getAllByRole("button", { name: "Copy Shell code" }),
    ).toHaveLength(2);
    expect(
      screen
        .getAllByRole("figure")
        .map((figure) => figure.querySelector("pre")?.textContent),
    ).toEqual([
      "pip install --upgrade neurosift",
      "neurosift view-nwb /path/to/file.nwb",
    ]);
    expect(
      screen.getByText("https://neurosift2.vercel.app/nwb?url=YOUR_FILE_URL")
        .tagName,
    ).toBe("CODE");
  });
});
