import { ObjectPath } from "@ui";
import { useCopy, useCopyLink } from "@shared/shareLink/useShareSettings";
import { FunctionComponent, useEffect, useState } from "react";
import { getHdf5Group } from "./hdf5Interface";
import "./FileViewer.css";

// The object path row, 32px (layout/objectpath-height in the File viewer specs).
const TOOLBAR_HEIGHT = 32;

type TabToolbarProps = {
  tabId: string;
  nwbUrl: string;
  /** “Combined view” or “Videos”; a single object’s neurodata type is read from the file. */
  type?: string;
  /** The object’s HDF5 path, a count for a combined view, or the paths a tab shows. */
  path: string | string[];
};

/** Above an open tab: its type and path, with Copy path and Copy link. */
const TabToolbar: FunctionComponent<TabToolbarProps> = ({
  tabId,
  nwbUrl,
  type,
  path,
}) => {
  const copy = useCopy();
  const copyLink = useCopyLink();
  const [neurodataType, setNeurodataType] = useState<string>();
  useEffect(() => {
    if (type || typeof path !== "string") return;
    let canceled = false;
    getHdf5Group(nwbUrl, path).then((group) => {
      if (!canceled)
        setNeurodataType(group?.attrs.neurodata_type as string | undefined);
    });
    return () => {
      canceled = true;
    };
  }, [nwbUrl, path, type]);
  const paths = typeof path === "string" ? [path] : path;
  return (
    <div className="file-object-path">
      <ObjectPath
        type={type ?? neurodataType ?? ""}
        path={path}
        onCopyPath={() =>
          copy(
            paths.join("\n"),
            paths.length > 1 ? "Paths copied" : "Path copied",
          )
        }
        onCopyLink={() => copyLink({ url: nwbUrl, tab: tabId })}
      />
    </div>
  );
};

export { TOOLBAR_HEIGHT };
export default TabToolbar;
