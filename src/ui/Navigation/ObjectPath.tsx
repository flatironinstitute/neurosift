import { IconButton } from "../IconButton/IconButton";
import "./Navigation.css";

interface ObjectPathProps {
  /** The neurodata type, such as ElectricalSeries. */
  type: string;
  path: string;
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
  return (
    <div className="ns-object-path">
      <span className="ns-object-path-type">{type}</span>
      <span className="ns-object-path-path">{path}</span>
      <IconButton
        icon="copy"
        label="Copy path"
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
