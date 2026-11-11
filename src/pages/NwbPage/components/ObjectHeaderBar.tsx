import { FunctionComponent } from "react";
import "../FileViewer.css";

type ObjectHeaderBarProps = {
  path: string;
};

/** Names each object inside a combined view by its path. */
const ObjectHeaderBar: FunctionComponent<ObjectHeaderBarProps> = ({ path }) => (
  <p className="file-object-header">{path}</p>
);

export default ObjectHeaderBar;
