import { Hyperlink } from "@fi-sci/misc";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import {
  useNeurodataItems,
  useNwbFile,
} from "neurosift-lib/misc/NwbFileContext";
import { useNwbOpenTabs } from "./pages/NwbPage/NwbOpenTabsContext";
import { useSelectedItemViews } from "./pages/NwbPage/SelectedItemViewsContext";
import { ViewPlugin } from "neurosift-lib/viewPlugins/viewPlugins";

type Props = {
  viewPlugin: ViewPlugin;
  path: string;
};

const ViewPluginButton: FunctionComponent<Props> = ({ viewPlugin, path }) => {
  const nwbFile = useNwbFile();
  if (!nwbFile) throw Error("Unexpected: no nwbFile");
  const neurodataItems = useNeurodataItems();
  const { name, buttonLabel } = viewPlugin;
  const { openTab } = useNwbOpenTabs();
  const { selectedItemViews, toggleSelectedItemView } = useSelectedItemViews();
  const [selectingSecondaryNeurodataItem, setSelectingSecondaryNeurodataItem] =
    useState<boolean>(false);
  const tabName = useMemo(() => {
    return `view:${viewPlugin.name}|${path}`;
  }, [viewPlugin, path]);
  const secondaryNeurodataItems = useMemo(() => {
    if (!viewPlugin.secondaryNeurodataType) return [];
    return neurodataItems.filter((x) =>
      (viewPlugin.secondaryNeurodataType || []).includes(x.neurodataType),
    );
  }, [viewPlugin, neurodataItems]);
  const handleClick = () => {
    if (viewPlugin.secondaryNeurodataType) {
      if (secondaryNeurodataItems.length === 0) {
        alert(
          `No neurodata items of type ${viewPlugin.secondaryNeurodataType.join(" | ")} found.`,
        );
        return;
      } else if (secondaryNeurodataItems.length === 1) {
        openTab(tabName + "^" + secondaryNeurodataItems[0].path);
        return;
      } else {
        setSelectingSecondaryNeurodataItem(true);
      }
    } else {
      openTab(tabName);
    }
  };
  const [enabled, setEnabled] = useState<boolean>(false);
  useEffect(() => {
    if (!viewPlugin.checkEnabled) {
      setEnabled(true);
      return;
    }
    let canceled = false;
    setEnabled(false);
    viewPlugin.checkEnabled(nwbFile, path).then((enabled) => {
      if (canceled) return;
      setEnabled(enabled);
    });
    return () => {
      canceled = true;
    };
  }, [viewPlugin, path, nwbFile]);

  if (!enabled) return <span />;

  if (selectingSecondaryNeurodataItem) {
    return (
      <div>
        {secondaryNeurodataItems.map((x) => (
          <div key={x.path}>
            <Hyperlink
              onClick={() => {
                openTab(tabName + "^" + x.path);
                setSelectingSecondaryNeurodataItem(false);
              }}
            >
              {buttonLabel || name}: {x.path}
            </Hyperlink>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        border: "solid 1px lightgray",
        paddingLeft: 3,
        paddingRight: 8,
        paddingTop: 3,
        paddingBottom: 3,
      }}
    >
      {!viewPlugin.secondaryNeurodataType && (
        <>
          <input
            type="checkbox"
            checked={
              !!selectedItemViews.find(
                (a) =>
                  // used to be startsWith(...), not sure why
                  a === tabName,
              )
            }
            onChange={() => {}}
            onClick={() => toggleSelectedItemView(tabName)}
          />
          &nbsp;
        </>
      )}
      <Hyperlink
        onClick={handleClick}
        color={viewPlugin.usesDendro ? "darkgreen" : undefined}
      >
        {buttonLabel || name}
        {viewPlugin.usesDendro ? "*" : ""}
      </Hyperlink>
    </div>
  );
};

export default ViewPluginButton;
