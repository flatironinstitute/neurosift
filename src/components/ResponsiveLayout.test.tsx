// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import ResponsiveLayout from "./ResponsiveLayout";

afterEach(cleanup);

const Panel = ({ name }: { name: string; width?: number; height?: number }) => (
  <p>{name}</p>
);
const Search = () => <output>{useLocation().search}</output>;

const setup = (search: string) =>
  render(
    <MemoryRouter initialEntries={[`/dandiset/000026${search}`]}>
      <ResponsiveLayout width={1200} height={600} initialSplitterPosition={400}>
        <Panel name="Overview content" />
        <Panel name="Files" />
      </ResponsiveLayout>
      <Search />
    </MemoryRouter>,
  );

describe("ResponsiveLayout", () => {
  it("folds the overview to a rail with a labelled toggle, and keeps that in the address", () => {
    setup("?location=sub-I38/ses-MRI");
    const hide = screen.getByRole("button", { name: "Hide overview" });
    expect(hide.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(hide);
    expect(screen.queryByText("Overview content")).toBeNull();
    expect(screen.getByText("Files")).toBeTruthy();
    const show = screen.getByRole("button", { name: "Show overview" });
    expect(show.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("status").textContent).toBe(
      "?location=sub-I38/ses-MRI&overview=hidden",
    );
    fireEvent.click(show);
    expect(screen.getByText("Overview content")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(
      "?location=sub-I38/ses-MRI",
    );
  });

  it("opens folded from a link with overview=hidden", () => {
    setup("?overview=hidden");
    expect(screen.queryByText("Overview content")).toBeNull();
    expect(screen.getByRole("button", { name: "Show overview" })).toBeTruthy();
  });
});
