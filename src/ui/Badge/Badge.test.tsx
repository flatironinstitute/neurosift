// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Icon } from "../Icon/Icon";
import { Badge, Tag, TagLink } from "./Badge";

afterEach(cleanup);

describe("Badge", () => {
  it("is read-only text, with no React warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<Badge status="warning">Embargoed</Badge>);
    const badge = container.firstElementChild!;
    expect(badge.tagName).toBe("SPAN");
    expect(badge.textContent).toBe("Embargoed");
    expect(badge.getAttribute("role")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("shows its status icon only when asked, since most badges sit beside text that explains them", () => {
    const { container } = render(<Badge status="warning">Embargoed</Badge>);
    expect(container.querySelector("svg")).toBeNull();
    cleanup();
    const expected = render(<Icon name="warning--alt" />).container.innerHTML;
    cleanup();
    const withIcon = render(
      <Badge status="warning" icon>
        Embargoed
      </Badge>,
    );
    expect(withIcon.container.querySelector("svg")?.outerHTML).toBe(expected);
  });

  it("never gives a count badge an icon", () => {
    const { container } = render(
      <Badge status="count" icon>
        22 matching
      </Badge>,
    );
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("TagLink", () => {
  it("is a real link with its value in the code face", () => {
    render(<TagLink href="/dandiset/000673">000673</TagLink>);
    const link = screen.getByRole("link", { name: "000673" });
    expect(link.getAttribute("href")).toBe("/dandiset/000673");
    expect(link.className).toContain("ns-tag--link");
  });

  it("can lead with an icon", () => {
    render(
      <TagLink href="/dandiset/000673" icon="recently-viewed">
        000673
      </TagLink>,
    );
    expect(
      screen.getByRole("link", { name: "000673" }).querySelector("svg"),
    ).not.toBeNull();
  });
});

describe("Tag", () => {
  it("is a read-only value", () => {
    const { container } = render(<Tag>ElectricalSeries</Tag>);
    expect(container.firstElementChild?.tagName).toBe("SPAN");
    expect(container.textContent).toBe("ElectricalSeries");
  });
});
