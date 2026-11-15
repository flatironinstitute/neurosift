// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ShareAddress } from "@shared/shareLink/shareAddress";
import { ShareAddressContext } from "@shared/shareLink/shareSettingsContext";
import {
  ShareSettingsPrefix,
  ShareSettingsProvider,
} from "@shared/shareLink/ShareSettingsProvider";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NwbObjectViewPlugin } from "./plugins/pluginInterface";

const plugin = (name: string, text: string): NwbObjectViewPlugin => ({
  name,
  canHandle: async () => true,
  component: () => <div>{text}</div>,
  showInMultiView: true,
});

// A TimeIntervals table: the table, the intervals on the timeline, and Load in Python.
const suitable = [
  plugin("dynamic-table", "the trials table"),
  plugin("TimeIntervals", "the trials as intervals"),
  { ...plugin("PythonScript", "Load in Python"), showInMultiView: false },
];

vi.mock("./plugins/registry", () => ({
  findSuitablePlugins: async () => suitable,
}));
vi.mock("./SpecificationsView/SetupNwbFileSpecificationsProvider", () => ({
  useNwbFileSpecifications: () => undefined,
}));
vi.mock("./ObjectTypeUtils", () => ({ objectExists: async () => true }));

const { default: NwbObjectView } = await import("./NwbObjectView");

afterEach(cleanup);

const TAB = "/intervals/trials";

// The address is kept by the share address; each test's link is the page's address.
const renderView = (o: {
  inMultiView?: boolean;
  link?: string;
  prefix?: string;
}) => {
  window.history.replaceState(null, "", `/nwb?url=f&tab=${TAB}${o.link ?? ""}`);
  const address = new ShareAddress({ url: "f" });
  const view = (
    <NwbObjectView
      nwbUrl="u"
      path="/intervals/trials"
      objectType="group"
      width={800}
      height={600}
      inMultiView={o.inMultiView}
    />
  );
  render(
    <ShareAddressContext.Provider value={address}>
      <ShareSettingsProvider tab={TAB}>
        {o.prefix ? (
          <ShareSettingsPrefix prefix={o.prefix}>{view}</ShareSettingsPrefix>
        ) : (
          view
        )}
      </ShareSettingsProvider>
    </ShareAddressContext.Provider>,
  );
  address.activate(TAB);
};

const switchNamed = () =>
  screen.getByRole("radiogroup", { name: "Show /intervals/trials as" });

describe("NwbObjectView table or chart switch", () => {
  it("shows the intervals in a combined tab, under the path with the switch", async () => {
    renderView({ inMultiView: true });
    await screen.findByText("the trials as intervals");
    expect(screen.queryByText("the trials table")).toBeNull();
    expect(screen.getByText("/intervals/trials")).toBeTruthy();
    const checked = switchNamed().querySelector('[aria-checked="true"]');
    expect(checked?.textContent).toBe("Intervals");
  });

  it("shows the table in the object's own tab, keeping its other views", async () => {
    renderView({});
    await screen.findByText("the trials table");
    expect(screen.queryByText("the trials as intervals")).toBeNull();
    expect(screen.getByText("Load in Python")).toBeTruthy();
    expect(
      switchNamed().querySelector('[aria-checked="true"]')?.textContent,
    ).toBe("Table");
  });

  it("follows the view in the link", async () => {
    renderView({
      inMultiView: true,
      link: "&trials.view=table",
      prefix: "trials",
    });
    await screen.findByText("the trials table");
    expect(screen.queryByText("the trials as intervals")).toBeNull();
  });

  it("writes view= in an object's own tab, replacing the entry and nothing for the default", async () => {
    const length = window.history.length;
    renderView({});
    await screen.findByText("the trials table");
    fireEvent.click(screen.getByRole("radio", { name: "Intervals" }));
    await waitFor(() =>
      expect(window.location.search).toContain("view=intervals"),
    );
    expect(window.history.length).toBe(length);
    fireEvent.click(screen.getByRole("radio", { name: "Table" }));
    await waitFor(() => expect(window.location.search).not.toContain("view="));
  });

  it("writes <name>.view= in a combined tab, nothing for the default", async () => {
    renderView({ inMultiView: true, prefix: "trials" });
    await screen.findByText("the trials as intervals");
    expect(window.location.search).not.toContain("view");
    fireEvent.click(screen.getByRole("radio", { name: "Table" }));
    await waitFor(() =>
      expect(window.location.search).toContain("trials.view=table"),
    );
    fireEvent.click(screen.getByRole("radio", { name: "Intervals" }));
    await waitFor(() => expect(window.location.search).not.toContain("view"));
  });

  it("names a combined view's objects by path even with no switch", async () => {
    suitable.splice(1, 1);
    renderView({ inMultiView: true });
    await waitFor(() => screen.getByText("the trials table"));
    expect(screen.getByText("/intervals/trials")).toBeTruthy();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });
});
