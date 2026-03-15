import { FunctionComponent, useState } from "react";

interface ExpandableTableCellProps {
  content: string;
  maxLength?: number;
  preformatted?: boolean;
}

const ExpandableTableCell: FunctionComponent<ExpandableTableCellProps> = ({
  content,
  maxLength = 60,
  preformatted = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!content) return <span></span>;

  if (content.length <= maxLength) {
    return preformatted ? (
      <pre style={{ margin: 0, fontFamily: "monospace", fontSize: "0.9em" }}>
        {content}
      </pre>
    ) : (
      <span>{content}</span>
    );
  }

  if (isExpanded) {
    return (
      <div>
        {preformatted ? (
          <pre
            style={{ margin: 0, fontFamily: "monospace", fontSize: "0.9em" }}
          >
            {content}
          </pre>
        ) : (
          <span>{content}</span>
        )}
        <button
          onClick={() => setIsExpanded(false)}
          style={{
            marginTop: "4px",
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "3px",
            padding: "2px 5px",
            fontSize: "0.8em",
            cursor: "pointer",
          }}
        >
          Collapse
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <span
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          cursor: "pointer",
          color: "#0d47a1",
        }}
      >
        {`${content.slice(0, maxLength - 3)}...`}
      </span>
    </div>
  );
};

export default ExpandableTableCell;
