import { ObjectPath, useToast } from "@ui";
import { FunctionComponent, useEffect, useState } from "react";
import { getHdf5Group } from "./hdf5Interface";
import { shareLink } from "@shared/ShareTabButton/shareLink";
import "./FileViewer.css";

// The object path row, 32px (layout/objectpath-height in the File viewer specs).
const TOOLBAR_HEIGHT = 32;

type TabToolbarProps = {
  tabId: string;
  nwbUrl: string;
  /** “Combined view” for several objects; a single object’s neurodata type is read from the file. */
  type?: string;
  /** The object’s HDF5 path, or a count for a combined view. */
  path: string;
};

/** Above an open object: its type and path, with Copy path and Copy link. */
const TabToolbar: FunctionComponent<TabToolbarProps> = ({
  tabId,
  nwbUrl,
  type,
  path,
}) => {
  const toast = useToast();
  const [neurodataType, setNeurodataType] = useState<string>();
  useEffect(() => {
    if (type) return;
    let canceled = false;
    getHdf5Group(nwbUrl, path).then((group) => {
      if (!canceled)
        setNeurodataType(group?.attrs.neurodata_type as string | undefined);
    });
    return () => {
      canceled = true;
    };
  }, [nwbUrl, path, type]);
  const copy = (text: string, done: string) =>
    navigator.clipboard.writeText(text).then(
      () => toast.show({ status: "success", message: done }),
      () =>
        toast.show({
          status: "error",
          message: "Couldn’t copy. Your browser blocked it.",
        }),
    );
  return (
    <div className="file-object-path">
      <ObjectPath
        type={type ?? neurodataType ?? ""}
        path={path}
        onCopyPath={() => copy(path, "Path copied")}
        onCopyLink={() =>
          copy(
            shareLink(window.location.href, { url: nwbUrl, tab: tabId }),
            "Link copied",
          )
        }
      />
    </div>
  );
};

export { TOOLBAR_HEIGHT };
export default TabToolbar;
