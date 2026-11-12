import { ObjectPath } from "@ui";
import { useCopy, useCopyLink } from "@shared/shareLink/useShareSettings";
import { FunctionComponent } from "react";
import { DatasetFile } from "./plugins/pluginInterface";

const TOOLBAR_HEIGHT = 32;

type TabToolbarProps = {
  file: DatasetFile;
};

/** The open file’s type and path, with Copy path and Copy link. */
const TabToolbar: FunctionComponent<TabToolbarProps> = ({ file }) => {
  const copy = useCopy();
  const copyLink = useCopyLink();
  return (
    <ObjectPath
      type={file.filename.split(".").slice(1).join(".").toUpperCase()}
      path={file.filepath}
      onCopyPath={() => copy(file.filepath, "Path copied")}
      onCopyLink={() => copyLink({ tab: `${file.filepath}|${file.parentId}` })}
    />
  );
};

export { TOOLBAR_HEIGHT };
export default TabToolbar;
