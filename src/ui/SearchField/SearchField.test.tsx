// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchField } from "./SearchField";

afterEach(cleanup);

const noop = () => {};

describe("SearchField", () => {
  it("is a search landmark with a labelled search input", () => {
    render(
      <SearchField
        label="Search Dandisets"
        value=""
        onChange={noop}
        onSearch={noop}
      />,
    );
    expect(screen.getByRole("search")).not.toBeNull();
    const input = screen.getByRole("searchbox", { name: "Search Dandisets" });
    expect(input.getAttribute("type")).toBe("search");
  });

  it("is Large by default and Medium in dense places", () => {
    const { rerender } = render(
      <SearchField label="Search" value="" onChange={noop} onSearch={noop} />,
    );
    expect(screen.getByRole("search").className).toBe(
      "ns-search ns-search--lg",
    );
    rerender(
      <SearchField
        label="Search"
        value=""
        onChange={noop}
        onSearch={noop}
        size="md"
      />,
    );
    expect(screen.getByRole("search").className).toBe(
      "ns-search ns-search--md",
    );
  });

  it("searches on Enter with the current query", () => {
    const onSearch = vi.fn();
    render(
      <SearchField
        label="Search"
        value="hippocampus"
        onChange={noop}
        onSearch={onSearch}
      />,
    );
    fireEvent.submit(screen.getByRole("search"));
    expect(onSearch).toHaveBeenCalledWith("hippocampus");
  });

  it("offers a clear button only once there is text", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SearchField
        label="Search"
        value=""
        onChange={onChange}
        onSearch={noop}
      />,
    );
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
    rerender(
      <SearchField
        label="Search"
        value="place cells"
        onChange={onChange}
        onSearch={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("clears on Escape", () => {
    const onChange = vi.fn();
    render(
      <SearchField
        label="Search"
        value="place cells"
        onChange={onChange}
        onSearch={noop}
      />,
    );
    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Escape" });
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("shows a spinner in place of the clear button while results load, and says it's busy", () => {
    render(
      <SearchField
        label="Search"
        value="place cells"
        onChange={noop}
        onSearch={noop}
        loading
      />,
    );
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
    expect(screen.getByRole("search").getAttribute("aria-busy")).toBe("true");
    expect(
      screen.getByRole("search").querySelector(".ns-spinner"),
    ).not.toBeNull();
  });
});
