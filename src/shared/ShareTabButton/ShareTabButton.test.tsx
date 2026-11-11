// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { ToastProvider } from "@ui";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import ShareTabButton from "./ShareTabButton";
import { shareLink } from "./shareLink";

// jsdom has no popover API; the toast region and tooltips only need these to exist.
beforeAll(() => {
  HTMLElement.prototype.showPopover = function () {};
  HTMLElement.prototype.hidePopover = function () {};
});
afterEach(cleanup);

describe("shareLink", () => {
  it("sets the parameters on the current address and leaves them readable", () => {
    expect(
      shareLink("https://neurosift.app/nwb?url=old&dandisetId=000231", {
        url: "https://api.dandiarchive.org/api/assets/abc/download/",
        tab: "/units",
      }),
    ).toBe(
      "https://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/abc/download/&dandisetId=000231&tab=/units",
    );
  });

  it("works with only a tab", () => {
    expect(
      shareLink("https://neurosift.app/dandiset/000231", {
        tab: "sub-01/file.nwb|abc",
      }),
    ).toBe("https://neurosift.app/dandiset/000231?tab=sub-01/file.nwb|abc");
  });
});

const setup = (writeText: (text: string) => Promise<void>) => {
  Object.assign(navigator, { clipboard: { writeText } });
  const onParentClick = vi.fn();
  render(
    <ToastProvider>
      <div onClick={onParentClick}>
        <ShareTabButton params={{ tab: "/units" }} />
      </div>
    </ToastProvider>,
  );
  return onParentClick;
};

describe("ShareTabButton", () => {
  it("copies the link to this tab and says so in a toast", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    const onParentClick = setup(writeText);
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Copy link to this tab" }),
      ),
    );
    expect(writeText).toHaveBeenCalledWith(
      shareLink(window.location.href, { tab: "/units" }),
    );
    expect(screen.getByRole("status", { hidden: true }).textContent).toContain(
      "Link copied",
    );
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it("says how to copy it by hand when the copy fails", async () => {
    setup(() => Promise.reject(new Error("denied")));
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Copy link to this tab" }),
      ),
    );
    expect(screen.getByRole("alert", { hidden: true }).textContent).toContain(
      "Couldn’t copy the link. Copy it from the address bar.",
    );
  });
});
