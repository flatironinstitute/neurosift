import { FunctionComponent, useState } from "react";

interface ExpandableTableCellProps {
  content: string;
  maxLength?: number;
}

const ExpandableTableCell: FunctionComponent<ExpandableTableCellProps> = ({
  content,
  maxLength = 60,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!content) return <span></span>;

  if (content.length <= maxLength || isExpanded) {
    return <span>{content}</span>;
  }

  return (
    <div style={{ position: "relative" }}>
      <span
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          cursor: "pointer",
          color: !isExpanded ? "#0d47a1" : undefined,
        }}
      >
        {isExpanded ? content : `${content.slice(0, maxLength - 3)}...`}
      </span>
      {isExpanded && (
        <button
          onClick={() => setIsExpanded(false)}
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "3px",
            padding: "2px 5px",
            fontSize: "0.8em",
            cursor: "pointer",
            zIndex: 1000,
          }}
        >
          Collapse
        </button>
      )}
    </div>
  );
};

export default ExpandableTableCell;
