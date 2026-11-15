// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { neurodataIcon } from "./neurodataIcon";
import { ObjectRow, SelectionBar, SelectionList, ViewChip } from "./ObjectTree";

afterEach(cleanup);

const row = (overrides = {}) => {
  const props = {
    name: "LFPs",
    path: "/acquisition/LFPs",
    type: "ElectricalSeries",
    description:
      "These are LFP recordings that have spike potentials removed and is downsampled to 400Hz",
    level: 1,
    kind: "leaf" as const,
    onToggle: vi.fn(),
    checked: false,
    onCheck: vi.fn(),
    onOpen: vi.fn(),
    views: [
      { name: "Timeseries", checked: false, onCheck: vi.fn(), onOpen: vi.fn() },
      {
        name: "Spectrogram",
        checked: false,
        onCheck: vi.fn(),
        onOpen: vi.fn(),
      },
    ],
    ...overrides,
  };
  const { container } = render(
    <ul>
      <ObjectRow {...props} />
    </ul>,
  );
  return { ...props, container };
};

describe("ObjectRow", () => {
  it("opens the object from its name, a real button", () => {
    const { onOpen } = row();
    fireEvent.click(screen.getByRole("button", { name: "LFPs" }));
    expect(onOpen).toHaveBeenCalled();
  });

  it("has a checkbox named after the object, to add it to a combined view", () => {
    const { onCheck } = row();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Add LFPs to the combined view" }),
    );
    expect(onCheck).toHaveBeenCalledWith(true);
  });

  it("shows its type and description, the type in link blue when it has a view", () => {
    const { container } = row();
    expect(screen.getByText("ElectricalSeries").className).toBe(
      "ns-object-type ns-object-type--view",
    );
    expect(
      container.querySelector(".ns-object-description")?.textContent,
    ).toContain("LFP recordings");
  });

  it("puts the description on the first line after the type and badge, the views below", () => {
    const { container } = row({ badge: <span>Default units</span> });
    const head = container.querySelector(".ns-object-head")!;
    expect(
      [...head.children].map((child) => child.textContent?.slice(0, 16)),
    ).toEqual([
      "LFPs",
      "ElectricalSeries",
      "Default units",
      "These are LFP re",
    ]);
    expect(
      head.compareDocumentPosition(
        container.querySelector(".ns-object-views")!,
      ),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("keeps the full description in the DOM and on hover, however it’s cut", () => {
    const { container, description } = row();
    const text = container.querySelector(".ns-object-description")!;
    expect(text.textContent).toBe(description);
    expect(text.getAttribute("title")).toBe(description);
  });

  it("leaves the description out when there is none", () => {
    const { container } = row({ description: undefined });
    expect(container.querySelector(".ns-object-description")).toBeNull();
  });

  it("opens and closes a group from a chevron that says whether it’s open", () => {
    const { onToggle } = row({ kind: "collapsed", views: [] });
    const toggle = screen.getByRole("button", {
      name: "Show contents of LFPs",
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalled();
  });

  it("indents 16px a level, with the level as a class", () => {
    const { container } = render(
      <ul>
        <ObjectRow
          {...{
            name: "data",
            path: "/a/data",
            type: "",
            level: 3,
            kind: "leaf",
            onToggle: vi.fn(),
            checked: false,
            onCheck: vi.fn(),
            onOpen: vi.fn(),
            views: [],
          }}
        />
      </ul>,
    );
    expect(container.querySelector("li")?.className).toBe(
      "ns-object-row ns-object-row--level-3",
    );
  });

  it("shows the neurodata type icon, hidden from screen readers", () => {
    const { container } = row();
    expect(
      container
        .querySelector(".ns-object-icon svg")
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
  });
});

describe("ViewChip", () => {
  it("checks the view into the combined view, and opens it from its name", () => {
    const onCheck = vi.fn();
    const onOpen = vi.fn();
    render(
      <ViewChip
        object="LFPs"
        name="Spectrogram"
        checked={false}
        onCheck={onCheck}
        onOpen={onOpen}
      />,
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Add LFPs, Spectrogram to the combined view",
      }),
    );
    expect(onCheck).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Spectrogram" }));
    expect(onOpen).toHaveBeenCalled();
  });
});

describe("SelectionBar", () => {
  const bar = (names: string[]) => {
    const props = {
      names,
      onShowList: vi.fn(),
      onClear: vi.fn(),
      onViewTogether: vi.fn(),
    };
    render(<SelectionBar {...props} />);
    return props;
  };

  it("names up to two checked objects", () => {
    bar(["LFPs", "units"]);
    const region = screen.getByRole("region", {
      name: "Combined view selection",
    });
    expect(within(region).getByText("LFPs and units")).toBeTruthy();
    expect(within(region).queryByRole("button", { name: /more/ })).toBeNull();
  });

  it("names two and a count that opens the full list, past two", () => {
    const { onShowList } = bar(["LFPs", "units", "trials", "behavior"]);
    fireEvent.click(
      screen.getByRole("button", { name: "4 selected, show all" }),
    );
    expect(onShowList).toHaveBeenCalled();
  });

  it("clears everything, or opens the selection together in one tab", () => {
    const { onClear, onViewTogether } = bar(["LFPs", "units"]);
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    fireEvent.click(screen.getByRole("button", { name: "View together" }));
    expect(onClear).toHaveBeenCalled();
    expect(onViewTogether).toHaveBeenCalled();
  });
});

describe("SelectionList", () => {
  it("lists the selection in the order checked, each with its own ×", () => {
    const onRemove = vi.fn();
    render(
      <SelectionList
        items={[
          { id: "a", label: "LFPs", context: "/acquisition/LFPs" },
          { id: "b", label: "units" },
        ]}
        onRemove={onRemove}
      />,
    );
    const list = screen.getByRole("list", { name: "Selected objects" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Remove units" }));
    expect(onRemove).toHaveBeenCalledWith("b");
  });
});

describe("neurodataIcon", () => {
  it("picks one icon per kind of data, and a document for anything else", () => {
    expect(neurodataIcon("ElectricalSeries")).toBe("chart--multi-line");
    expect(neurodataIcon("Units")).toBe("chart--point");
    expect(neurodataIcon("TwoPhotonSeries")).toBe("microscope");
    expect(neurodataIcon("LabMetaData")).toBe("document");
  });
});
