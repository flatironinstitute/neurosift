// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { TextInput } from "../TextInput/TextInput";
import { Dialog } from "./Dialog";
import { Drawer } from "./Drawer";

// jsdom has no modal dialogs; these stand in for showModal and close.
beforeAll(() => {
  HTMLElement.prototype.showPopover = function () {};
  HTMLElement.prototype.hidePopover = function () {};
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});
afterEach(cleanup);

function RemoveKey({ onConfirm = vi.fn() }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Remove API key
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Remove the DANDI API key?"
        kind="destructive"
        size="sm"
        confirmLabel="Remove key"
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
      >
        Embargoed Dandisets will stop opening in this browser until you add a
        key again.
      </Dialog>
    </>
  );
}

const openDialog = () => {
  const opener = screen.getByRole("button", { name: "Remove API key" });
  opener.focus();
  fireEvent.click(opener);
  return opener;
};

describe("Dialog", () => {
  it("is a modal dialog named by its title, with no React warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<RemoveKey />);
    openDialog();
    const dialog = screen.getByRole("dialog", {
      name: "Remove the DANDI API key?",
    });
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog.hasAttribute("open")).toBe(true);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("moves focus to the title when there is no field, and back to the opener on close", () => {
    render(<RemoveKey />);
    const opener = openDialog();
    expect(document.activeElement?.textContent).toBe(
      "Remove the DANDI API key?",
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes without changes from the ×, Cancel or Escape", () => {
    const onConfirm = vi.fn();
    render(<RemoveKey onConfirm={onConfirm} />);
    openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    openDialog();
    const dialog = screen.getByRole("dialog");
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    (dialog as HTMLDialogElement).close();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("puts the main action on the right, and makes it destructive when it removes something", () => {
    const onConfirm = vi.fn();
    render(<RemoveKey onConfirm={onConfirm} />);
    openDialog();
    const buttons = screen
      .getByRole("dialog")
      .querySelectorAll(".ns-dialog-footer .ns-button");
    expect([...buttons].map((b) => b.textContent)).toEqual([
      "Cancel",
      "Remove key",
    ]);
    expect(buttons[1].className).toContain("ns-button--destructive");
    fireEvent.click(buttons[1]);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("can disable its main action until the task is ready", () => {
    const onConfirm = vi.fn();
    const { rerender } = render(
      <Dialog
        open
        onClose={vi.fn()}
        title="Add an API key"
        confirmLabel="Save"
        onConfirm={onConfirm}
        confirmDisabled
      >
        Paste the key from your DANDI account.
      </Dialog>,
    );
    const save = screen.getByRole("button", { name: "Save" });
    expect((save as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(save);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(
      (screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    rerender(
      <Dialog
        open
        onClose={vi.fn()}
        title="Add an API key"
        confirmLabel="Save"
        onConfirm={onConfirm}
      >
        Paste the key from your DANDI account.
      </Dialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("closing a dialog opened from another one leaves the outer one open", () => {
    const outerClose = vi.fn();
    const innerClose = vi.fn();
    render(
      <Dialog
        open
        onClose={outerClose}
        title="Settings"
        confirmLabel="Save"
        onConfirm={vi.fn()}
      >
        <Dialog
          open
          onClose={innerClose}
          title="Add a server"
          confirmLabel="Add"
          onConfirm={vi.fn()}
        >
          The server's URL.
        </Dialog>
      </Dialog>,
    );
    const inner = screen.getByRole("dialog", { name: "Add a server" });
    fireEvent(inner, new Event("cancel", { cancelable: true }));
    (inner as HTMLDialogElement).close();
    expect(innerClose).toHaveBeenCalledTimes(2);
    expect(outerClose).not.toHaveBeenCalled();
  });

  it("moves focus to the first field when there is one", () => {
    render(
      <Dialog
        open
        onClose={vi.fn()}
        title="Share this view"
        confirmLabel="Copy link"
        onConfirm={vi.fn()}
      >
        <TextInput label="Link" value="neurosift.app/nwb" onChange={vi.fn()} />
      </Dialog>,
    );
    expect(document.activeElement).toBe(screen.getByLabelText("Link"));
  });
});

describe("Drawer", () => {
  it("as an overlay is a modal dialog that focuses its title and closes with the ×", () => {
    const onClose = vi.fn();
    render(
      <Drawer
        open
        onClose={onClose}
        title="Column info"
        side="right"
        mode="overlay"
      >
        Each column of /units.
      </Drawer>,
    );
    const drawer = screen.getByRole("dialog", { name: "Column info" });
    expect(drawer.tagName).toBe("DIALOG");
    expect(document.activeElement?.textContent).toBe("Column info");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("when docked is a labelled region beside the workspace that leaves focus alone", () => {
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    render(
      <Drawer open onClose={vi.fn()} title="Overview" side="left" mode="docked">
        Dandiset details.
      </Drawer>,
    );
    const region = screen.getByRole("complementary", { name: "Overview" });
    expect(region.tagName).toBe("ASIDE");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it("closing a dialog opened inside it leaves the drawer open", () => {
    const drawerClose = vi.fn();
    const dialogClose = vi.fn();
    render(
      <Drawer open onClose={drawerClose} title="Filters" mode="overlay">
        <Dialog
          open
          onClose={dialogClose}
          title="Save these filters?"
          confirmLabel="Save"
          onConfirm={vi.fn()}
        >
          Name the set.
        </Dialog>
      </Drawer>,
    );
    const dialog = screen.getByRole("dialog", { name: "Save these filters?" });
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    (dialog as HTMLDialogElement).close();
    expect(dialogClose).toHaveBeenCalledTimes(2);
    expect(drawerClose).not.toHaveBeenCalled();
  });

  it("closing it from inside a dialog leaves the dialog open", () => {
    const dialogClose = vi.fn();
    const drawerClose = vi.fn();
    render(
      <Dialog
        open
        onClose={dialogClose}
        title="Settings"
        confirmLabel="Save"
        onConfirm={vi.fn()}
      >
        <Drawer open onClose={drawerClose} title="Help" mode="overlay">
          What each setting does.
        </Drawer>
      </Dialog>,
    );
    const drawer = screen.getByRole("dialog", { name: "Help" });
    fireEvent(drawer, new Event("cancel", { cancelable: true }));
    (drawer as HTMLDialogElement).close();
    expect(drawerClose).toHaveBeenCalledTimes(2);
    expect(dialogClose).not.toHaveBeenCalled();
  });

  it("closes from Escape without letting the browser close it first", () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose} title="Filters" mode="overlay">
        Units with a firing rate above 5 Hz.
      </Drawer>,
    );
    const cancel = new Event("cancel", { cancelable: true });
    fireEvent(screen.getByRole("dialog", { name: "Filters" }), cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing while closed", () => {
    render(
      <Drawer
        open={false}
        onClose={vi.fn()}
        title="Overview"
        side="left"
        mode="docked"
      >
        Dandiset details.
      </Drawer>,
    );
    expect(screen.queryByText("Dandiset details.")).toBeNull();
  });
});
