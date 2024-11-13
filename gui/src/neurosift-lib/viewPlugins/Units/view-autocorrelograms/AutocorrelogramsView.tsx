import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { FaMinus, FaPlus } from "react-icons/fa";
import { PGPlot, PlotGrid } from "../component-plot-grid";
import { VerticalScrollView } from "../component-vertical-scroll-view";
import {
  idToNum,
  INITIALIZE_UNITS,
  sortIds,
  useSelectedUnitIds,
} from "../../../contexts/context-unit-selection";
import { getUnitColor } from "../../../contexts/context-unit-selection/unitColors";
import {
  defaultUnitsTableBottomToolbarOptions,
  ToolbarItem,
  UnitsTableBottomToolbar,
  UnitsTableBottomToolbarOptions,
  ViewToolbar,
} from "../../../misc/ViewToolbar";
import { AutocorrelogramsViewData } from "./AutocorrelogramsViewData";
import CorrelogramPlot from "./CorrelogramPlot";
import Splitter from "../../../components/Splitter";

const viewToolbarWidth = 45;

type Props = {
  data: AutocorrelogramsViewData;
  width: number;
  height: number;
};

const AutocorrelogramsView: FunctionComponent<Props> = ({
  data,
  width,
  height,
}) => {
  const [toolbarOptions, setToolbarOptions] =
    useState<UnitsTableBottomToolbarOptions>(
      defaultUnitsTableBottomToolbarOptions,
    );
  const {
    selectedUnitIds,
    orderedUnitIds,
    plotClickHandlerGenerator,
    unitIdSelectionDispatch,
  } = useSelectedUnitIds();
  const [plotBoxScaleFactor, setPlotBoxScaleFactor] = useState<number>(1);
  const [showXAxis, setShowXAxis] = useState<boolean>(false);

  useEffect(() => {
    unitIdSelectionDispatch({
      type: INITIALIZE_UNITS,
      newUnitOrder: sortIds(data.autocorrelograms.map((aw) => aw.unitId)),
    });
  }, [data.autocorrelograms, unitIdSelectionDispatch]);

  const baseBoxWidth = 80;
  const baseBoxHeight = 80;

  const plots: PGPlot[] = useMemo(
    () =>
      data.autocorrelograms
        .filter((a) =>
          toolbarOptions.onlyShowSelected
            ? selectedUnitIds.has(a.unitId)
            : true,
        )
        .map((ac) => ({
          unitId: ac.unitId,
          key: ac.unitId,
          label: `Unit ${ac.unitId}`,
          labelColor: getUnitColor(idToNum(ac.unitId)),
          clickHandler: !toolbarOptions.onlyShowSelected
            ? plotClickHandlerGenerator(ac.unitId)
            : undefined,
          props: {
            binEdgesSec: ac.binEdgesSec,
            binCounts: ac.binCounts,
            color: getUnitColor(idToNum(ac.unitId)),
            width: baseBoxWidth * plotBoxScaleFactor,
            height: baseBoxHeight * plotBoxScaleFactor,
            hideXAxis: !showXAxis,
          },
        })),
    [
      data.autocorrelograms,
      plotClickHandlerGenerator,
      toolbarOptions.onlyShowSelected,
      selectedUnitIds,
      showXAxis,
      plotBoxScaleFactor,
    ],
  );
  const plots2: PGPlot[] = useMemo(() => {
    if (orderedUnitIds) {
      return orderedUnitIds
        .map((unitId) => plots.filter((a) => a.unitId === unitId)[0])
        .filter((p) => p !== undefined);
    } else return plots;
  }, [plots, orderedUnitIds]);

  const customToolbarActions = useMemo(() => {
    const boxSizeActions: ToolbarItem[] = [
      {
        type: "button",
        callback: () => setPlotBoxScaleFactor((s) => s * 1.3),
        title: "Increase box size",
        icon: <FaPlus />,
      },
      {
        type: "button",
        callback: () => setPlotBoxScaleFactor((s) => s / 1.3),
        title: "Decrease box size",
        icon: <FaMinus />,
      },
    ];
    const showXAxisAction: ToolbarItem = {
      type: "toggle",
      subtype: "checkbox",
      callback: () => setShowXAxis((a) => !a),
      title: "Show X Axis",
      selected: showXAxis === true,
    };
    return [...boxSizeActions, { type: "divider" }, showXAxisAction];
  }, [showXAxis]);

  const bottomToolbarHeight = 30;
  const TOOLBAR_WIDTH = viewToolbarWidth; // hard-coded for now
  return (
    <div>
      <Splitter
        width={width}
        height={height - bottomToolbarHeight}
        initialPosition={TOOLBAR_WIDTH}
        adjustable={false}
      >
        <ViewToolbar
          width={TOOLBAR_WIDTH}
          height={height}
          customActions={customToolbarActions}
        />
        <VerticalScrollView width={0} height={0}>
          <PlotGrid
            plots={plots2}
            plotComponent={CorrelogramPlot}
            selectedPlotKeys={
              toolbarOptions.onlyShowSelected ? undefined : selectedUnitIds
            }
          />
        </VerticalScrollView>
      </Splitter>
      <div
        style={{
          position: "absolute",
          top: height - bottomToolbarHeight,
          height: bottomToolbarHeight,
          overflow: "hidden",
        }}
      >
        <UnitsTableBottomToolbar
          options={toolbarOptions}
          setOptions={setToolbarOptions}
        />
      </div>
    </div>
  );
};

export default AutocorrelogramsView;
