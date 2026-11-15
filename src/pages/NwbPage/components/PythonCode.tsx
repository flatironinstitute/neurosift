import { Button, CodeBlock } from "@ui";
import { FunctionComponent, useId, useState } from "react";
import "./PythonCode.css";

type Props = {
  /** Python that loads the file or object, with Copy. */
  script: string;
  /** What to pip install first, such as "pip install --upgrade lindi". */
  install?: string;
  /** Hides the code behind a button with this label, such as "Load in Python". */
  expandLabel?: string;
};

const LINDI = "https://github.com/neurodatawithoutborders/lindi";

/** How to load a file or object in Python: what to install, then the script, each with Copy. */
const PythonCode: FunctionComponent<Props> = ({
  script,
  install,
  expandLabel,
}) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  const code = (
    <div className="python-code" id={id}>
      {install && (
        <CodeBlock code={`$ ${install}`} language="shell" title="Install" />
      )}
      <CodeBlock code={script} language="python" />
      {install && (
        <p className="python-code-note">
          {"Reads the file with "}
          <a href={LINDI} target="_blank" rel="noopener noreferrer">
            LINDI
          </a>
          .
        </p>
      )}
    </div>
  );
  if (!expandLabel) return <div className="python-code-frame">{code}</div>;
  return (
    <div className="python-code-frame">
      <div>
        <Button
          size="sm"
          icon={open ? "chevron--down" : "chevron--right"}
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          onClick={() => setOpen(!open)}
        >
          {expandLabel}
        </Button>
      </div>
      {open && code}
    </div>
  );
};

export default PythonCode;
