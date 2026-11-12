// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { ToastProvider } from "@ui";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ShareSettingsProvider } from "./ShareSettingsProvider";
import {
  useCopyLink,
  useLinkedSettings,
  useShareSettings,
} from "./useShareSettings";

beforeAll(() => {
  HTMLElement.prototype.showPopover = function () {};
  HTMLElement.prototype.hidePopover = function () {};
});
afterEach(cleanup);

let linked: URLSearchParams;
let copyLink: ReturnType<typeof useCopyLink>;

const View = ({ separation }: { separation: string }) => {
  linked = useLinkedSettings();
  copyLink = useCopyLink();
  useShareSettings([
    { key: "separation", value: separation, default: "0", label: "separation" },
  ]);
  return null;
};

const renderTab = (tab: string, separation: string) =>
  render(
    <ToastProvider>
      <ShareSettingsProvider tab={tab}>
        <View separation={separation} />
      </ShareSettingsProvider>
    </ToastProvider>,
  );

describe("share settings in a tab", () => {
  it("hands a view the link's settings only in the tab the link names", () => {
    window.history.replaceState(null, "", "/nwb?url=f&tab=/a&separation=2");
    renderTab("/a", "0");
    expect(linked.get("separation")).toBe("2");
    cleanup();
    renderTab("/b", "0");
    expect(linked.get("separation")).toBeNull();
  });

  it("copies a link with the changed settings", async () => {
    window.history.replaceState(null, "", "/nwb?url=f&tab=/a");
    const writeText = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });
    const { rerender } = renderTab("/a", "0");
    rerender(
      <ToastProvider>
        <ShareSettingsProvider tab="/a">
          <View separation="3" />
        </ShareSettingsProvider>
      </ToastProvider>,
    );
    expect(window.location.search).toBe("?url=f&tab=/a");
    await act(async () => {
      await copyLink({ url: "f", tab: "/a" });
    });
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/nwb?url=f&tab=/a&separation=3`,
    );
  });
});
