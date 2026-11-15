import { Button, Dialog, Drawer, TextInput } from "@ui";
import { useState } from "react";

/** A destructive confirmation, as the Remove API key button in Settings would use. */
export function ConfirmDemo() {
  const [open, setOpen] = useState(false);
  const [removed, setRemoved] = useState(false);
  return (
    <div className="dialog-demo">
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Remove API key
      </Button>
      <p className="type-caption dialog-demo-status" role="status">
        {removed && "Key removed (demo)"}
      </p>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        kind="destructive"
        title="Remove the DANDI API key?"
        confirmLabel="Remove key"
        onConfirm={() => {
          setRemoved(true);
          setOpen(false);
        }}
      >
        Embargoed Dandisets will stop opening in this browser until you add a
        key again.
      </Dialog>
    </div>
  );
}

/** A short task with a field; focus starts in the field. */
export function ShareDemo() {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState(
    "neurosift.app/nwb?url=https://api.dandiarchive.org/…&tab=/units",
  );
  return (
    <div className="dialog-demo">
      <Button onClick={() => setOpen(true)}>Share this view</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Share this view"
        confirmLabel="Copy link"
        onConfirm={() => setOpen(false)}
      >
        <p>
          Anyone with the link opens this file on the tab you’re viewing.
          Embargoed data still needs their own API key.
        </p>
        <TextInput label="Link" value={link} onChange={setLink} />
      </Dialog>
    </div>
  );
}

/** An overlay drawer from the right: column info for a table. */
export function OverlayDrawerDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="dialog-demo">
      <Button onClick={() => setOpen(true)}>Column info</Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        side="right"
        mode="overlay"
        title="Column info"
      >
        <p>Each column of /units with its description and data type.</p>
      </Drawer>
    </div>
  );
}

/** A docked drawer beside a stand-in workspace; it leaves focus where it is. */
export function DockedDrawerDemo() {
  const [open, setOpen] = useState(true);
  return (
    <div className="docked-demo">
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        side="left"
        mode="docked"
        title="Session overview"
      >
        <p>
          Dandiset, session and subject details, as in the overview panel today.
        </p>
      </Drawer>
      <div className="docked-demo-workspace">
        {!open && (
          <Button size="sm" onClick={() => setOpen(true)}>
            Show overview
          </Button>
        )}
        <p className="type-body-sm">The plot stays in view.</p>
      </div>
    </div>
  );
}
