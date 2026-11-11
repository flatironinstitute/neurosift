import { FunctionComponent } from "react";
import ShareTabButton from "@shared/ShareTabButton/ShareTabButton";
import { DatasetFile } from "./plugins/pluginInterface";
import "./TabToolbar.css";

const TOOLBAR_HEIGHT = 32;

type TabToolbarProps = {
  width: number;
  file: DatasetFile;
};

/** The open file’s path, with a link that reopens this tab. */
const TabToolbar: FunctionComponent<TabToolbarProps> = ({ file }) => (
  <div className="dataset-tab-toolbar">
    <p className="dataset-tab-path" title={file.filepath}>
      {file.filepath}
    </p>
    <ShareTabButton params={{ tab: `${file.filepath}|${file.parentId}` }} />
  </div>
);

export { TOOLBAR_HEIGHT };
export default TabToolbar;
