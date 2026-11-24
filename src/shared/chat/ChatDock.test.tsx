// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ChatDock } from "./ChatDock";
import { chatEmbedSrc, linkFolder, useChatOpen } from "./chatState";

afterEach(cleanup);

// jsdom has no modal dialogs or popovers; these stand in for them, as in Dialog.test.
beforeAll(() => {
  HTMLElement.prototype.showPopover = function () {};
  HTMLElement.prototype.hidePopover = function () {};
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

const Search = () => <output>{useLocation().search}</output>;
const Toggle = () => {
  const [open, setOpen] = useChatOpen();
  return (
    <button type="button" onClick={() => setOpen(!open)}>
      Ask about this dataset
    </button>
  );
};

const setup = (search: string, width = 1440) => {
  const widths: number[] = [];
  render(
    <MemoryRouter initialEntries={[`/dandiset/000673${search}`]}>
      <ChatDock width={width} dandisetId="000673" version="draft">
        {(pageWidth) => {
          widths.push(pageWidth);
          return <Toggle />;
        }}
      </ChatDock>
      <Search />
    </MemoryRouter>,
  );
  return { widths };
};

const ORIGIN = new URL(chatEmbedSrc("000673", "draft")).origin;
const fromChat = (data: object) => {
  const frame = screen.getByTitle(
    "Chat about Dandiset 000673",
  ) as HTMLIFrameElement;
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { source: "neurosift-chat", ...data },
        origin: ORIGIN,
        source: frame.contentWindow,
      }),
    );
  });
};

describe("ChatDock", () => {
  it("opens Chat beside the page, keeps it in the address, and narrows the page", () => {
    const { widths } = setup("?location=sub-1");
    expect(screen.queryByRole("complementary", { name: "Chat" })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Ask about this dataset" }),
    );
    expect(screen.getByRole("complementary", { name: "Chat" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(
      "?location=sub-1&chat=open",
    );
    expect(widths[widths.length - 1]).toBe(1440 - 360);
    const frame = screen.getByTitle("Chat about Dandiset 000673");
    expect(frame.getAttribute("src")).toContain("dandisetId=000673");
    expect(frame.getAttribute("src")).toContain("embed=1");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("status").textContent).toBe("?location=sub-1");
  });

  it("slides over the page on narrow windows", () => {
    const { widths } = setup("?chat=open", 1024);
    expect(screen.getByRole("dialog", { name: "Chat" })).toBeTruthy();
    expect(widths[widths.length - 1]).toBe(1024);
  });

  it("enables New chat and Open in full page once the chat says where it lives", () => {
    setup("?chat=open");
    const newChat = screen.getByRole("button", { name: "New chat" });
    expect((newChat as HTMLButtonElement).disabled).toBe(true);
    fromChat({ type: "chat", href: `${ORIGIN}/qp/chat/abc`, empty: false });
    expect((newChat as HTMLButtonElement).disabled).toBe(false);
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    fireEvent.click(screen.getByRole("button", { name: "Open in full page" }));
    expect(open).toHaveBeenCalledWith(
      `${ORIGIN}/qp/chat/abc`,
      "_blank",
      "noopener",
    );
    open.mockRestore();
  });

  it("opens a linked NWB file's folder in Files, and other links in a tab", () => {
    setup("?chat=open");
    fromChat({
      type: "open-link",
      href: "https://neurosift.app/nwb?dandisetId=000673&dandisetVersion=draft&path=sub-3/sub-3_ses-1_ecephys+image.nwb",
    });
    expect(screen.getByRole("status").textContent).toBe(
      "?chat=open&location=sub-3",
    );
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    fromChat({
      type: "open-link",
      href: "https://neurosift.app/dandiset/000021",
    });
    expect(open).toHaveBeenCalledWith(
      "https://neurosift.app/dandiset/000021",
      "_blank",
      "noopener",
    );
    open.mockRestore();
  });

  it("ignores messages that don't come from the chat's frame", () => {
    setup("?chat=open");
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            source: "neurosift-chat",
            type: "chat",
            href: "x",
            empty: false,
          },
          origin: ORIGIN,
        }),
      );
    });
    expect(
      (screen.getByRole("button", { name: "New chat" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});

describe("linkFolder", () => {
  it("finds an NWB file's folder in this Dandiset only", () => {
    const nwb = (id: string, path: string) =>
      `https://neurosift.app/nwb?dandisetId=${id}&dandisetVersion=draft&path=${path}`;
    expect(linkFolder(nwb("000673", "sub-1/ses-1/a.nwb"), "000673")).toBe(
      "sub-1/ses-1",
    );
    expect(linkFolder(nwb("000673", "a.nwb"), "000673")).toBe("");
    expect(linkFolder(nwb("000021", "sub-1/a.nwb"), "000673")).toBeUndefined();
    expect(linkFolder("not a link", "000673")).toBeUndefined();
  });
});
