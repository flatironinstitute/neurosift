/* eslint-disable @typescript-eslint/no-explicit-any */
import { SmallIconButton } from "@fi-sci/misc";
import { mean } from "mathjs";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaArrowDown,
  FaArrowLeft,
  FaArrowRight,
  FaArrowUp,
  FaMinus,
  FaPlus,
} from "react-icons/fa";
import { PGPlot, PlotGrid } from "../component-plot-grid";
import { VerticalScrollView } from "../component-vertical-scroll-view";
import {
  INITIALIZE_UNITS,
  idToNum,
  sortIds,
  useSelectedUnitIds,
} from "../../../contexts/context-unit-selection";
import { UnitsTableView } from "../view-units-table";
import { getUnitColor } from "../../../contexts/context-unit-selection/unitColors";
import AverageWaveformPlot, {
  AverageWaveformPlotProps,
} from "./AverageWaveformPlot";
import { AverageWaveformsViewData } from "./AverageWaveformsViewData";

type Props = {
  data: AverageWaveformsViewData;
  width: number;
  height: number;
};

const AverageWaveformsView: FunctionComponent<Props> = ({
  data,
  width,
  height,
}) => {
  const allChannelIds = useMemo(() => {
    const allChannelIds: (string | number)[] = [];
    for (const x of data.averageWaveforms) {
      for (const id of x.channelIds) {
        if (!allChannelIds.includes(id)) {
          allChannelIds.push(id);
        }
      }
    }
    return sortIds(allChannelIds);
  }, [data.averageWaveforms]);

  const [prefs, setPrefs] = useState<AverageWaveformsViewPrefs>(
    defaultAverageWaveformsViewPrefs,
  );
  const {
    showReferenceProbe,
    onlyShowSelected,
    waveformsMode,
    showWaveformStdev,
    showChannelIds,
    showOverlapping,
    ampScaleFactor,
    horizontalStretchFactor,
    hideElectrodes,
    useUnitColors,
    plotBoxScaleFactor,
  } = useMemo(() => prefs, [prefs]);

  const {
    selectedUnitIds,
    currentUnitId,
    orderedUnitIds,
    plotClickHandlerGenerator,
    unitIdSelectionDispatch,
  } = useSelectedUnitIds();

  useEffect(() => {
    unitIdSelectionDispatch({
      type: INITIALIZE_UNITS,
      newUnitOrder: sortIds(data.averageWaveforms.map((aw) => aw.unitId)),
    });
  }, [data.averageWaveforms, unitIdSelectionDispatch]);

  const peakAmplitude = useMemo(() => {
    let ret = 0;
    data.averageWaveforms.forEach((x) => {
      x.waveform.forEach((y) => {
        y.forEach((z) => {
          const abs = Math.abs(z);
          if (abs > ret) ret = abs;
        });
      });
    });
    return ret;
  }, [data.averageWaveforms]);

  const plots: PGPlot[] = useMemo(
    () =>
      data.averageWaveforms
        .filter((a) =>
          onlyShowSelected ? selectedUnitIds.has(a.unitId) : true,
        )
        .map((aw) => {
          const waveform = transpose(aw.waveform);
          const waveformStdev = aw.waveformStdDev
            ? transpose(aw.waveformStdDev)
            : undefined;
          const units: {
            channelIds: (number | string)[];
            waveform: number[][];
            waveformStdDev?: number[][];
            waveformColor: string;
          }[] = [
            {
              channelIds: aw.channelIds,
              waveform: subtractChannelMeans(waveform),
              waveformStdDev:
                showWaveformStdev && !showOverlapping
                  ? waveformStdev
                  : undefined,
              waveformColor: getUnitColor(idToNum(aw.unitId)),
            },
          ];

          const baseBoxWidth = 30;
          const baseBoxHeight = 100;

          const props: AverageWaveformPlotProps = {
            allChannelIds,
            channelIds: aw.channelIds,
            units,
            layoutMode: waveformsMode,
            hideElectrodes,
            channelLocations: data.channelLocations,
            samplingFrequency: data.samplingFrequency,
            peakAmplitude,
            ampScaleFactor,
            horizontalStretchFactor,
            showChannelIds,
            useUnitColors,
            width:
              baseBoxWidth * plotBoxScaleFactor +
              (showReferenceProbe
                ? (baseBoxWidth * plotBoxScaleFactor) / 4
                : 0),
            height: baseBoxHeight * plotBoxScaleFactor,
            showReferenceProbe,
            disableAutoRotate: true,
          };
          return {
            unitId: aw.unitId,
            key: aw.unitId,
            label: `Unit ${aw.unitId}`,
            labelColor: getUnitColor(idToNum(aw.unitId)),
            clickHandler: !onlyShowSelected
              ? plotClickHandlerGenerator(aw.unitId)
              : undefined,
            props,
          };
        }),
    [
      data.averageWaveforms,
      data.channelLocations,
      data.samplingFrequency,
      allChannelIds,
      peakAmplitude,
      waveformsMode,
      ampScaleFactor,
      plotClickHandlerGenerator,
      onlyShowSelected,
      selectedUnitIds,
      plotBoxScaleFactor,
      showWaveformStdev,
      showChannelIds,
      showReferenceProbe,
      showOverlapping,
      horizontalStretchFactor,
      hideElectrodes,
      useUnitColors,
    ],
  );

  const plots2: PGPlot[] = useMemo(() => {
    if (orderedUnitIds) {
      return orderedUnitIds
        .map((unitId) => plots.filter((a) => a.unitId === unitId)[0])
        .filter((p) => p !== undefined);
    } else return plots;
  }, [plots, orderedUnitIds]);

  const plots3: PGPlot[] = useMemo(() => {
    if (showOverlapping) {
      return combinePlotsForOverlappingView(plots2);
    }
    return plots2;
  }, [plots2, showOverlapping]);

  // const horizontalStretchToolbarEntries: ToolbarItem[] = useMemo(() => {
  //     const setHorizontalStretchFactor = (f: (x: number) => number) => {
  //         setPrefs(p => ({...p, horizontalStretchFactor: f(p.horizontalStretchFactor)}))
  //     }
  //     return [
  //         {
  //             type: 'button',
  //             callback: () => {setHorizontalStretchFactor(x => (x * 1.1))},
  //             title: 'Increase horizontal stretch [alt + mouse-wheel]',
  //             icon: <FaArrowRight />
  //         },
  //         // {
  //         //     type: 'button',
  //         //     callback: () => {setHorizontalStretchFactor(1)},
  //         //     title: 'Reset scale amplitude',
  //         //     icon: <FaRegTimesCircle />
  //         // },
  //         {
  //             type: 'button',
  //             callback: () => {setHorizontalStretchFactor(x => (x / 1.1))},
  //             title: 'Decrease horizontal stretch [alt + mouse-wheel]',
  //             icon: <FaArrowLeft />
  //         },
  //     ]
  // }, [])

  // const customToolbarActions = useMemo(() => {
  //     const amplitudeScaleToolbarEntries = AmplitudeScaleToolbarEntries({ampScaleFactor, setAmpScaleFactor})
  //     const showElectrodeGeometryAction: ToolbarItem = {
  //         type: 'toggle',
  //         subtype: 'checkbox',
  //         callback: () => setWaveformsMode(m => (m === 'geom' ? 'vertical' : 'geom')),
  //         title: 'Show electrode geometry',
  //         selected: waveformsMode === 'geom'
  //     }
  //     const showElectrodesAction: ToolbarItem = {
  //         type: 'toggle',
  //         subtype: 'checkbox',
  //         callback: () => setHideElectrodes(v => (!v)),
  //         title: 'Show electrodes',
  //         selected: !hideElectrodes
  //     }
  //     const boxSizeActions: ToolbarItem[] = [
  //         {
  //             type: 'button',
  //             callback: () => setPlotBoxScaleFactor(s => (s * 1.3)),
  //             title: 'Increase box size',
  //             icon: <FaPlus />
  //         },
  //         {
  //             type: 'button',
  //             callback: () => setPlotBoxScaleFactor(s => (s / 1.3)),
  //             title: 'Decrease box size',
  //             icon: <FaMinus />
  //         }
  //     ]
  //     const showWaveformStdevAction: ToolbarItem = {
  //         type: 'toggle',
  //         subtype: 'checkbox',
  //         callback: () => setShowWaveformStdev(a => (!a)),
  //         title: 'Show waveform stdev',
  //         selected: showWaveformStdev === true
  //     }
  //     const showChannelIdsAction: ToolbarItem = {
  //         type: 'toggle',
  //         subtype: 'checkbox',
  //         callback: () => setShowChannelIds(a => (!a)),
  //         title: 'Show channel IDs',
  //         selected: showChannelIds === true
  //     }
  //     const showReferenceProbeAction: ToolbarItem = {
  //         type: 'toggle',
  //         subtype: 'checkbox',
  //         callback: () => setShowReferenceProbe(a => (!a)),
  //         title: 'Show reference probes',
  //         selected: showReferenceProbe === true
  //     }
  //     const showOverlappingAction: ToolbarItem = {
  //         type: 'toggle',
  //         subtype: 'checkbox',
  //         callback: () => setShowOverlapping(a => (!a)),
  //         title: 'Show overlapping',
  //         selected: showOverlapping === true
  //     }
  //     const useUnitColorsAction: ToolbarItem = {
  //         type: 'toggle',
  //         subtype: 'checkbox',
  //         callback: () => setUseUnitColors(a => (!a)),
  //         title: 'Use unit colors',
  //         selected: useUnitColors === true
  //     }
  //     return [
  //         {type: 'divider'},
  //         ...boxSizeActions,
  //         {type: 'divider'},
  //         ...amplitudeScaleToolbarEntries,
  //         {type: 'divider'},
  //         ...horizontalStretchToolbarEntries,
  //         {type: 'divider'},
  //         showElectrodeGeometryAction,
  //         showElectrodesAction,
  //         {type: 'divider'},
  //         showWaveformStdevAction,
  //         {type: 'divider'},
  //         showChannelIdsAction,
  //         {type: 'divider'},
  //         showReferenceProbeAction,
  //         {type: 'divider'},
  //         showOverlappingAction,
  //         {type: 'divider'},
  //         useUnitColorsAction
  //     ]
  // }, [waveformsMode, ampScaleFactor, showWaveformStdev, showChannelIds, showOverlapping, showReferenceProbe, horizontalStretchToolbarEntries, hideElectrodes, useUnitColors])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const setAmpScaleFactor = (f: (x: number) => number) => {
      setPrefs((p) => ({ ...p, ampScaleFactor: f(p.ampScaleFactor) }));
    };
    const setHorizontalStretchFactor = (f: (x: number) => number) => {
      setPrefs((p) => ({
        ...p,
        horizontalStretchFactor: f(p.horizontalStretchFactor),
      }));
    };
    if (e.shiftKey && !e.altKey) {
      if (e.deltaY < 0) {
        setAmpScaleFactor((s) => s * 1.3);
      } else {
        setAmpScaleFactor((s) => s / 1.3);
      }
      // note: we cannot prevent default here, so that's done below in setupDivRef
    } else if (e.altKey && !e.shiftKey) {
      if (e.deltaY < 0) {
        setHorizontalStretchFactor((s) => s * 1.1);
      } else {
        setHorizontalStretchFactor((s) => s / 1.1);
      }
      // note: we cannot prevent default here, so that's done below in setupDivRef
    }
  }, []);

  const bottomToolbarHeight = 70;
  const unitsTableWidth = 120;

  const setupDivRef = useCallback((elmt: HTMLDivElement | null) => {
    if (!elmt) return;
    elmt.addEventListener("wheel", (e) => {
      if (e.shiftKey || e.altKey) {
        e.preventDefault();
      }
    });
  }, []);

  const unitsTableColumns = useMemo(() => [], []);

  const unitsTableRows = useMemo(
    () =>
      data.averageWaveforms.map((aw) => ({
        unitId: aw.unitId,
        values: {},
      })),
    [data.averageWaveforms],
  );

  return (
    <div ref={(elmt) => setupDivRef(elmt)} onWheel={handleWheel}>
      <div
        style={{ position: "absolute", top: 0, left: 0, width, height: height }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: unitsTableWidth,
            height: height,
          }}
        >
          <UnitsTableView
            width={unitsTableWidth}
            height={height}
            data={{
              type: "UnitsTable",
              columns: unitsTableColumns,
              rows: unitsTableRows,
              similarityScores: undefined,
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: unitsTableWidth,
            width: width - unitsTableWidth,
            height: height,
          }}
        >
          <VerticalScrollView
            width={width - unitsTableWidth}
            height={height - bottomToolbarHeight}
          >
            <PlotGrid
              plots={plots3}
              plotComponent={AverageWaveformPlot}
              selectedPlotKeys={!onlyShowSelected ? selectedUnitIds : undefined}
              currentPlotKey={currentUnitId}
            />
          </VerticalScrollView>
          <div
            style={{
              position: "absolute",
              top: height - bottomToolbarHeight,
              width: width - unitsTableWidth,
              height: bottomToolbarHeight,
              overflow: "hidden",
            }}
          >
            <BottomToolbar prefs={prefs} setPrefs={setPrefs} />
          </div>
        </div>
      </div>
    </div>
  );
};

type AverageWaveformsViewPrefs = {
  showReferenceProbe: boolean;
  onlyShowSelected: boolean;
  waveformsMode: "geom" | "vertical";
  showWaveformStdev: boolean;
  showChannelIds: boolean;
  showOverlapping: boolean;
  ampScaleFactor: number;
  horizontalStretchFactor: number;
  hideElectrodes: boolean;
  useUnitColors: boolean;
  plotBoxScaleFactor: number;
};

const defaultAverageWaveformsViewPrefs: AverageWaveformsViewPrefs = {
  showReferenceProbe: false,
  onlyShowSelected: false,
  waveformsMode: "vertical",
  showWaveformStdev: false,
  showChannelIds: false,
  showOverlapping: false,
  ampScaleFactor: 5,
  horizontalStretchFactor: 1,
  hideElectrodes: false,
  useUnitColors: true,
  plotBoxScaleFactor: 4,
};

type BottomToolbarProps = {
  prefs: AverageWaveformsViewPrefs;
  setPrefs: (prefs: AverageWaveformsViewPrefs) => void;
};

const BottomToolbar: FunctionComponent<BottomToolbarProps> = ({
  prefs,
  setPrefs,
}) => {
  const { onlyShowSelected } = prefs;
  const setOnlyShowSelected = useCallback(
    (onlyShowSelected: boolean) => {
      setPrefs({
        ...prefs,
        onlyShowSelected,
      });
    },
    [prefs, setPrefs],
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        height: "100%",
        userSelect: "none",
      }}
    >
      {/* only show selected */}
      <div style={{ marginLeft: 10, marginRight: 10 }}>
        <input
          type="checkbox"
          checked={onlyShowSelected}
          onChange={(e) => setOnlyShowSelected(e.target.checked)}
        />
        Only show selected
      </div>
      {/* plot box scale factor */}
      <div style={{ marginLeft: 10, marginRight: 10 }}>
        Box size:
        <SmallIconButton
          icon={<FaMinus />}
          onClick={() =>
            setPrefs({
              ...prefs,
              plotBoxScaleFactor: prefs.plotBoxScaleFactor / 1.3,
            })
          }
        />
        <SmallIconButton
          icon={<FaPlus />}
          onClick={() =>
            setPrefs({
              ...prefs,
              plotBoxScaleFactor: prefs.plotBoxScaleFactor * 1.3,
            })
          }
        />
      </div>
      {/* horizontal stretch factor */}
      <div style={{ marginLeft: 10, marginRight: 10 }}>
        Horizontal stretch:
        <SmallIconButton
          icon={<FaArrowLeft />}
          onClick={() =>
            setPrefs({
              ...prefs,
              horizontalStretchFactor: prefs.horizontalStretchFactor / 1.1,
            })
          }
        />
        <SmallIconButton
          icon={<FaArrowRight />}
          onClick={() =>
            setPrefs({
              ...prefs,
              horizontalStretchFactor: prefs.horizontalStretchFactor * 1.1,
            })
          }
        />
      </div>
      {/* amplitude scale factor */}
      <div style={{ marginLeft: 10, marginRight: 10 }}>
        Amplitude scale:
        <SmallIconButton
          icon={<FaArrowDown />}
          onClick={() =>
            setPrefs({ ...prefs, ampScaleFactor: prefs.ampScaleFactor / 1.3 })
          }
        />
        <SmallIconButton
          icon={<FaArrowUp />}
          onClick={() =>
            setPrefs({ ...prefs, ampScaleFactor: prefs.ampScaleFactor * 1.3 })
          }
        />
      </div>
      {/* show waveform stdev */}
      {/* <div style={{ marginLeft: 10, marginRight: 10 }}>
            <input
                type="checkbox"
                checked={prefs.showWaveformStdev}
                onChange={(e) => setPrefs({ ...prefs, showWaveformStdev: e.target.checked })}
            />
            Show waveform stdev
        </div> */}
      {/* show channel ids */}
      {/* <div style={{ marginLeft: 10, marginRight: 10 }}>
            <input
                type="checkbox"
                checked={prefs.showChannelIds}
                onChange={(e) => setPrefs({ ...prefs, showChannelIds: e.target.checked })}
            />
            Show channel IDs
        </div> */}
      {/* show reference probe */}
      <div style={{ marginLeft: 10, marginRight: 10 }}>
        <input
          type="checkbox"
          checked={prefs.showReferenceProbe}
          onChange={(e) =>
            setPrefs({ ...prefs, showReferenceProbe: e.target.checked })
          }
        />
        Show reference probe
      </div>
      {/* show overlapping */}
      <div style={{ marginLeft: 10, marginRight: 10 }}>
        <input
          type="checkbox"
          checked={prefs.showOverlapping}
          onChange={(e) =>
            setPrefs({ ...prefs, showOverlapping: e.target.checked })
          }
        />
        Show overlapping
      </div>
      {/* use unit colors */}
      <div style={{ marginLeft: 10, marginRight: 10 }}>
        <input
          type="checkbox"
          checked={prefs.useUnitColors}
          onChange={(e) =>
            setPrefs({ ...prefs, useUnitColors: e.target.checked })
          }
        />
        Use unit colors
      </div>
      {/* Waveform mode */}
      {/* <div style={{ marginLeft: 10, marginRight: 10 }}>
            <input
                type="checkbox"
                checked={prefs.waveformsMode === 'geom'}
                onChange={(e) => setPrefs({ ...prefs, waveformsMode: e.target.checked ? 'geom' : 'vertical' })}
            />
            Show electrode geometry
        </div> */}
    </div>
  );
};

const combinePlotsForOverlappingView = (plots: PGPlot[]): PGPlot[] => {
  if (plots.length === 0) return plots;
  const thePlot: PGPlot = { ...plots[0], props: { ...plots[0].props } };

  const plotProps: AverageWaveformPlotProps =
    thePlot.props as any as AverageWaveformPlotProps;
  thePlot.key = "overlapping";
  thePlot.label = "Overlapping";
  thePlot.labelColor = "black";
  thePlot.unitId = "overlapping";
  plotProps.height *= 3;
  // plotProps.width *= 2

  const allChannelIdsSet = new Set<number | string>();
  for (const plot of plots) {
    for (const id of plot.props.channelIds) {
      allChannelIdsSet.add(id);
    }
  }
  const allChannelIds = sortIds([...allChannelIdsSet]);
  plotProps.channelIds = allChannelIds;

  plotProps.units = plots.map((p) => p.props.units[0]);

  return [thePlot];
};

const subtractChannelMeans = (waveform: number[][]): number[][] => {
  return waveform.map((W) => {
    const mean0 = computeMean(W);
    return W.map((a) => a - mean0);
  });
};

const computeMean = (ary: number[]) => (ary.length > 0 ? mean(ary) : 0);

export const transpose = (x: number[][]) => {
  const M = x.length;
  const N = x[0].length;
  const ret: number[][] = [];
  for (let j = 0; j < N; j++) {
    const row: number[] = [];
    for (let i = 0; i < M; i++) {
      row.push(x[i][j]);
    }
    ret.push(row);
  }
  return ret;
};

export default AverageWaveformsView;
