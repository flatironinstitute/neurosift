import { Disclosure } from "@ui";
import { useState } from "react";
import "./TextPreview.css";

const PREVIEW_LINES = 200;

/** A file's text in the code face; past PREVIEW_LINES, the rest waits behind Show all. */
const TextPreview = ({ text }: { text: string }) => {
  const [open, setOpen] = useState(false);
  const lines = text.split("\n");
  if (lines.length <= PREVIEW_LINES)
    return (
      <div className="text-preview-view">
        <pre className="text-preview">{text}</pre>
      </div>
    );
  return (
    <div className="text-preview-view">
      <pre className="text-preview">
        {lines.slice(0, PREVIEW_LINES).join("\n")}
      </pre>
      <Disclosure
        label={`Show all ${lines.length.toLocaleString("en-US")} lines`}
        expandedLabel={`Hide the last ${(lines.length - PREVIEW_LINES).toLocaleString("en-US")} lines`}
        open={open}
        onToggle={setOpen}
      >
        <pre className="text-preview">
          {lines.slice(PREVIEW_LINES).join("\n")}
        </pre>
      </Disclosure>
    </div>
  );
};

export default TextPreview;
