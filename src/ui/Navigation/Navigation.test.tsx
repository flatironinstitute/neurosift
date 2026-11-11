// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AppBar } from "./AppBar";
import { Breadcrumbs } from "./Breadcrumbs";
import { ObjectPath } from "./ObjectPath";

beforeAll(() => {
  HTMLElement.prototype.showPopover = function () {};
  HTMLElement.prototype.hidePopover = function () {};
});
afterEach(cleanup);

describe("AppBar", () => {
  const setup = () =>
    render(
      <AppBar
        homeHref="/"
        logo={<img src="/logo.png" alt="" />}
        actions={[
          { label: "Guide", href: "/guide", icon: "help" },
          {
            label: "GitHub",
            href: "https://github.com/",
            icon: "logo--github",
            iconOnly: true,
            external: true,
          },
          {
            label: "Settings",
            href: "/settings",
            icon: "settings",
            iconOnly: true,
          },
          { label: "Open in v1", href: "https://v1.neurosift.app" },
        ]}
      />,
    );

  it("is the page's banner, with the name linking home and no React warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    setup();
    const banner = screen.getByRole("banner");
    const home = within(banner).getByRole("link", { name: "Neurosift" });
    expect(home.getAttribute("href")).toBe("/");
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("gives every action a name, visible or not, and opens external links in a new tab", () => {
    setup();
    expect(
      screen.getByRole("link", { name: "Guide" }).getAttribute("href"),
    ).toBe("/guide");
    expect(screen.getByRole("link", { name: "Settings" })).toBeTruthy();
    const github = screen.getByRole("link", { name: "GitHub" });
    expect(github.getAttribute("target")).toBe("_blank");
    expect(github.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByRole("link", { name: "Open in v1" })).toBeTruthy();
  });
});

describe("Breadcrumbs", () => {
  const ITEMS = [
    { label: "DANDI", href: "/dandi?search=memory" },
    { label: "000673 · Control of working memory", href: "/dandiset/000673" },
    { label: "sub-1", href: "/dandiset/000673?folder=sub-1", code: true },
    { label: "sub-1_ses-1_ecephys+image.nwb", code: true },
  ];

  it("is a labelled navigation landmark with an ordered list", () => {
    render(<Breadcrumbs items={ITEMS} />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    const list = within(nav).getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
  });

  it("links every level above the current page, which is named but not a link", () => {
    render(<Breadcrumbs items={ITEMS} />);
    expect(
      screen.getAllByRole("link").map((a) => a.getAttribute("href")),
    ).toEqual([
      "/dandi?search=memory",
      "/dandiset/000673",
      "/dandiset/000673?folder=sub-1",
    ]);
    const current = screen.getByText("sub-1_ses-1_ecephys+image.nwb");
    expect(current.closest("a")).toBeNull();
    expect(current.getAttribute("aria-current")).toBe("page");
  });

  it("hides separators from screen readers", () => {
    const { container } = render(<Breadcrumbs items={ITEMS} />);
    for (const svg of container.querySelectorAll("svg"))
      expect(svg.getAttribute("aria-hidden")).toBe("true");
  });

  it("can show every level again after a narrow window folds the middle", () => {
    render(<Breadcrumbs items={ITEMS} />);
    const nav = screen.getByRole("navigation");
    const more = screen.getByRole("button", { name: "Show all levels" });
    expect(nav.dataset.expanded).toBeUndefined();
    fireEvent.click(more);
    expect(nav.dataset.expanded).toBe("");
  });
});

describe("ObjectPath", () => {
  it("names the object's type and path, with Copy path and Copy link", () => {
    const onCopyPath = vi.fn();
    const onCopyLink = vi.fn();
    render(
      <ObjectPath
        type="ElectricalSeries"
        path="/acquisition/LFPs"
        onCopyPath={onCopyPath}
        onCopyLink={onCopyLink}
      />,
    );
    expect(screen.getByText("ElectricalSeries")).toBeTruthy();
    expect(screen.getByText("/acquisition/LFPs")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Copy path" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Copy link to this tab" }),
    );
    expect(onCopyPath).toHaveBeenCalledTimes(1);
    expect(onCopyLink).toHaveBeenCalledTimes(1);
  });
});
