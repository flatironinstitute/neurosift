/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent } from "react";

type Props = {
  attrs: { [key: string]: any };
};

const formatAttributeValue = (value: any): string => {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "string") {
    return `"${value}"`;
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "boolean") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    // Show full array
    if (value.length === 0) {
      return "[]";
    }
    return `[${value.map(formatAttributeValue).join(", ")}]`;
  }
  if (typeof value === "object") {
    // For objects, try to show a meaningful representation
    try {
      const keys = Object.keys(value);
      if (keys.length === 0) {
        return "{}";
      }
      // Handle special compound types
      if (value.compound_type !== undefined) {
        return `{compound_type: ${value.compound_type}}`;
      }
      // For small objects, show key-value pairs
      if (keys.length <= 2) {
        const pairs = keys
          .map((k) => `${k}: ${formatAttributeValue(value[k])}`)
          .join(", ");
        if (pairs.length < 40) {
          return `{${pairs}}`;
        }
      }
      return `{${keys.length} keys}`;
    } catch {
      // Fallback for circular references or other issues
      return "{object}";
    }
  }
  // Ensure we always return a string
  try {
    return String(value);
  } catch {
    return "{unrenderable}";
  }
};

const AttributesDisplay: FunctionComponent<Props> = ({ attrs }) => {
  const attrKeys = Object.keys(attrs);

  if (attrKeys.length === 0) {
    return <span style={{ color: "#999", fontStyle: "italic" }}>-</span>;
  }

  return (
    <div className="slp-tree-attributes">
      {attrKeys.map((key, i) => (
        <span key={key} className="slp-tree-attributes-item">
          <span className="slp-tree-attributes-key">{key}</span>
          <span>: </span>
          <span className="slp-tree-attributes-value">
            {formatAttributeValue(attrs[key])}
          </span>
          {i < attrKeys.length - 1 && ", "}
        </span>
      ))}
    </div>
  );
};

export default AttributesDisplay;
