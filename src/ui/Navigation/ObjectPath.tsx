import { IconButton } from "../IconButton/IconButton";
import { Tooltip } from "../Tooltip/Tooltip";
import "./Navigation.css";

interface ObjectPathProps {
  /** The neurodata type, such as ElectricalSeries, or what the tab shows, such as Videos. */
  type: string;
  /** One path, or several when the tab shows several objects. */
  path: string | string[];
  onCopyPath: () => void;
  onCopyLink: () => void;
}

/** Above an open object: what exactly is on screen, with Copy path and Copy link. */
export function ObjectPath({
  type,
  path,
  onCopyPath,
  onCopyLink,
}: ObjectPathProps) {
  const paths = typeof path === "string" ? [path] : path;
  const text = paths.join(", ");
  return (
    <div className="ns-object-path">
      <span className="ns-object-path-type">{type}</span>
      {paths.length > 1 ? (
        <Tooltip label={text} placement="bottom">
          <span className="ns-object-path-path" tabIndex={0}>
            {text}
          </span>
        </Tooltip>
      ) : (
        <span className="ns-object-path-path">{text}</span>
      )}
      <IconButton
        icon="copy"
        label={paths.length > 1 ? "Copy paths" : "Copy path"}
        variant="ghost"
        size="sm"
        tooltipPlacement="bottom"
        onClick={onCopyPath}
      />
      <IconButton
        icon="link"
        label="Copy link to this tab"
        variant="ghost"
        size="sm"
        tooltipPlacement="left"
        onClick={onCopyLink}
      />
    </div>
  );
}
