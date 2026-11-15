// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NwbObjectViewPlugin } from "./plugins/pluginInterface";

const plugin = (
  name: string,
  component: NwbObjectViewPlugin["component"],
): NwbObjectViewPlugin => ({ name, canHandle: async () => true, component });

// An object that two plugins can show, one of which throws while rendering.
const brokenPlugin = plugin("Raster", () => {
  throw new Error("spike_times is not a ragged array");
});
const workingPlugin = plugin("default", () => <div>attributes of /units</div>);

vi.mock("./plugins/registry", () => ({
  findSuitablePlugins: async () => [brokenPlugin, workingPlugin],
}));
vi.mock("./SpecificationsView/SetupNwbFileSpecificationsProvider", () => ({
  useNwbFileSpecifications: () => undefined,
}));
vi.mock("../../util/sendLog", () => ({ sendLog: vi.fn() }));
const objectExists = vi.fn(async (_url: string, path: string) =>
  path.startsWith("/units"),
);
vi.mock("./ObjectTypeUtils", () => ({ objectExists }));

const { default: NwbObjectView } = await import("./NwbObjectView");

const preventDefault = (event: Event) => event.preventDefault();

beforeEach(() => {
  // React logs every error a boundary catches, and in development also
  // rethrows it as a window error event, which jsdom prints.
  vi.spyOn(console, "error").mockImplementation(() => {});
  window.addEventListener("error", preventDefault);
});

afterEach(() => {
  window.removeEventListener("error", preventDefault);
  cleanup();
  vi.restoreAllMocks();
});

describe("NwbObjectView", () => {
  it("keeps showing the other views of an object when one of them throws", async () => {
    render(
      <div>
        <div>tab bar</div>
        <NwbObjectView
          nwbUrl="https://example.org/a.nwb"
          path="/units"
          objectType="group"
          width={800}
          height={600}
        />
      </div>,
    );

    await waitFor(() =>
      expect(screen.getByText("attributes of /units")).toBeTruthy(),
    );
    expect(screen.getByText("tab bar")).toBeTruthy();
    expect(
      screen.getByText("The Raster view of /units couldn’t be shown"),
    ).toBeTruthy();
    expect(screen.getByText("spike_times is not a ragged array")).toBeTruthy();
  });

  it("says when the file has no object at the path, instead of loading forever", async () => {
    render(
      <NwbObjectView
        nwbUrl="https://example.org/a.nwb"
        path="/acquisition/does_not_exist"
        objectType="group"
        width={800}
        height={600}
      />,
    );
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(
      "/acquisition/does_not_exist couldn’t be shown",
    );
    expect(alert.textContent).toContain(
      "This file has no object at /acquisition/does_not_exist.",
    );
  });
});
