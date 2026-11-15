import { FunctionComponent, ReactNode } from "react";
import "../FileViewer.css";

type ObjectHeaderBarProps = {
  path: string;
  /** Controls for this object, at the end of the row. */
  children?: ReactNode;
};

/** Names each object inside a combined view by its path. */
const ObjectHeaderBar: FunctionComponent<ObjectHeaderBarProps> = ({
  path,
  children,
}) => (
  <div className="file-object-header">
    <p className="file-object-header-path">{path}</p>
    {children}
  </div>
);

export default ObjectHeaderBar;
