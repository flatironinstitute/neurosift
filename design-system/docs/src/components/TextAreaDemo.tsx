import { TextArea } from "@ui";
import { useState, type ComponentProps } from "react";

type SampleProps = Omit<
  ComponentProps<typeof TextArea>,
  "value" | "onChange"
> & {
  initial?: string;
};

const NOTES = [
  "Mouse 3, session 2. Running wheel stalled at 412 s; the Units table starts after that.",
  "Sorted with Kilosort 4, then curated by hand.",
  "Spikes before 412 s are noise from the stall.",
  "LFP is clean throughout.",
  "Compare with session 1 before sharing.",
].join("\n");

function Sample({ initial = "", ...props }: SampleProps) {
  const [value, setValue] = useState(initial);
  return <TextArea {...props} value={value} onChange={setValue} />;
}

/** Every Text area state, editable, so the growth to maxRows can be tried. */
export default function TextAreaDemo() {
  return (
    <div className="field-grid">
      <Sample
        label="Session notes"
        placeholder="For example, which units you curated by hand"
      />
      <Sample
        label="Session notes"
        initial="Wheel stalled at 412 s."
        helper="Saved with this file in this browser only."
      />
      <Sample
        label="Session notes"
        error="Write a note before saving, or close without saving."
      />
      <Sample
        label="Session notes"
        initial="Wheel stalled at 412 s."
        helper="Notes open once the file has loaded."
        disabled
      />
      <Sample
        label="Session notes, Small"
        initial="Wheel stalled at 412 s."
        size="sm"
        rows={2}
      />
      <Sample
        label="Ask Neurosift Chat, Large"
        size="lg"
        rows={1}
        maxRows={6}
        placeholder="Ask about a Dandiset"
        helper="Enter to send, Shift+Enter for a new line"
      />
      <Sample
        label="Session notes, grown to 4 rows"
        initial={NOTES}
        rows={2}
        maxRows={4}
        helper="Starts at 2 rows, grows to 4, then scrolls."
      />
    </div>
  );
}
