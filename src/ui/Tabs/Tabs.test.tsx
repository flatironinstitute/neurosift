// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { TabPanel, Tabs, type TabItem } from "./Tabs";

// jsdom has no popover API; object tabs show their path in a tooltip.
beforeAll(() => {
  HTMLElement.prototype.showPopover = function () {};
  HTMLElement.prototype.hidePopover = function () {};
  Element.prototype.scrollIntoView = function () {};
});
afterEach(cleanup);

const SECTIONS: TabItem[] = [
  { id: "widgets", label: "Widgets" },
  { id: "alignment", label: "Timeseries alignment" },
  { id: "python", label: "Python usage" },
];

function Sections() {
  const [selected, setSelected] = useState("widgets");
  return (
    <>
      <Tabs
        id="file"
        label="File views"
        tabs={SECTIONS}
        selected={selected}
        onSelect={setSelected}
      />
      {SECTIONS.map((t) => (
        <TabPanel
          key={t.id}
          tabsId="file"
          tabId={t.id}
          selected={t.id === selected}
        >
          {t.label} panel
        </TabPanel>
      ))}
    </>
  );
}

function Objects({ onClose = vi.fn() }: { onClose?: (id: string) => void }) {
  const [tabs, setTabs] = useState<TabItem[]>([
    { id: "main", label: "Main" },
    { id: "lfps", label: "LFPs", closable: true, tooltip: "/acquisition/LFPs" },
    { id: "units", label: "units", closable: true, tooltip: "/units" },
  ]);
  const [selected, setSelected] = useState("lfps");
  return (
    <Tabs
      id="objects"
      label="Open objects"
      kind="object"
      tabs={tabs}
      selected={selected}
      onSelect={setSelected}
      onClose={(id) => {
        onClose(id);
        const index = tabs.findIndex((t) => t.id === id);
        const rest = tabs.filter((t) => t.id !== id);
        setTabs(rest);
        if (id === selected)
          setSelected(rest[Math.min(index, rest.length - 1)].id);
      }}
    />
  );
}

describe("Tabs", () => {
  it("is a labelled tab list whose tabs control their panels, with no React warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Sections />);
    const list = screen.getByRole("tablist", { name: "File views" });
    const tabs = screen.getAllByRole("tab");
    expect(list.contains(tabs[0])).toBe(true);
    expect(tabs.map((t) => t.textContent)).toEqual([
      "Widgets",
      "Timeseries alignment",
      "Python usage",
    ]);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    const panel = screen.getByRole("tabpanel");
    expect(panel.textContent).toBe("Widgets panel");
    expect(panel.getAttribute("aria-labelledby")).toBe(tabs[0].id);
    expect(tabs[0].getAttribute("aria-controls")).toBe(panel.id);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("is one stop in the tab order: only the selected tab is focusable", () => {
    render(<Sections />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1]);
  });

  it("selects on click", () => {
    render(<Sections />);
    fireEvent.click(screen.getByRole("tab", { name: "Python usage" }));
    expect(screen.getByRole("tabpanel").textContent).toBe("Python usage panel");
  });

  it("moves and selects with the arrow keys, wrapping, and Home and End", () => {
    render(<Sections />);
    const key = (k: string) =>
      fireEvent.keyDown(document.activeElement!, { key: k });
    screen.getByRole("tab", { name: "Widgets" }).focus();
    key("ArrowRight");
    expect(document.activeElement?.textContent).toBe("Timeseries alignment");
    expect(screen.getByRole("tabpanel").textContent).toBe(
      "Timeseries alignment panel",
    );
    key("End");
    expect(document.activeElement?.textContent).toBe("Python usage");
    key("ArrowRight");
    expect(document.activeElement?.textContent).toBe("Widgets");
    key("ArrowLeft");
    expect(document.activeElement?.textContent).toBe("Python usage");
    key("Home");
    expect(document.activeElement?.textContent).toBe("Widgets");
  });
});

describe("Object tabs", () => {
  it("say which can be closed with Delete; Main can't", () => {
    render(<Objects />);
    expect(
      screen
        .getByRole("tab", { name: "Main" })
        .getAttribute("aria-keyshortcuts"),
    ).toBeNull();
    expect(
      screen
        .getByRole("tab", { name: "LFPs" })
        .getAttribute("aria-keyshortcuts"),
    ).toBe("Delete");
  });

  it("closes the focused tab with Delete and moves focus to the tab that takes its place", () => {
    const onClose = vi.fn();
    render(<Objects onClose={onClose} />);
    const lfps = screen.getByRole("tab", { name: "LFPs" });
    lfps.focus();
    fireEvent.keyDown(lfps, { key: "Delete" });
    expect(onClose).toHaveBeenCalledWith("lfps");
    expect(screen.queryByRole("tab", { name: "LFPs" })).toBeNull();
    expect(document.activeElement?.textContent).toBe("units");
  });

  it("closes from the × without selecting the tab, and never closes Main", () => {
    const onClose = vi.fn();
    render(<Objects onClose={onClose} />);
    const close = screen
      .getByRole("tab", { name: "units" })
      .closest(".ns-tab-item")!
      .querySelector(".ns-tab-close")!;
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledWith("units");
    expect(
      screen.getByRole("tab", { name: "LFPs" }).getAttribute("aria-selected"),
    ).toBe("true");
    const main = screen.getByRole("tab", { name: "Main" });
    main.focus();
    fireEvent.keyDown(main, { key: "Delete" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("pushes the first end tab, and the ones after it, to the end of the bar", () => {
    const { container } = render(
      <Tabs
        id="sections"
        label="File views"
        tabs={[
          { id: "widgets", label: "Widgets" },
          { id: "schema", label: "Schema", end: true },
          { id: "hdf5", label: "HDF5", end: true },
        ]}
        selected="widgets"
        onSelect={() => {}}
      />,
    );
    expect(
      [...container.querySelectorAll(".ns-tab-item")].map(
        (item) => item.className,
      ),
    ).toEqual(["ns-tab-item", "ns-tab-item ns-tab-item--end", "ns-tab-item"]);
  });
});
