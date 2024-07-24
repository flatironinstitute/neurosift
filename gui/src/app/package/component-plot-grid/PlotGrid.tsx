import { Grid } from "@mui/material";
import React, { FunctionComponent, useMemo } from "react";
import IfVisible from "./IfVisible";

export const voidClickHandler = (evt: React.MouseEvent) => {};

export type PGPlot = {
  key: string | number;
  unitId: string | number;
  label: string | undefined;
  labelColor: string;
  clickHandler?: (evt: React.MouseEvent) => void;
  props: { [key: string]: any };
  hideBorderColor?: boolean;
};

type Props = {
  plots: PGPlot[];
  plotComponent: React.FunctionComponent<any>;
  selectedPlotKeys?: Set<number | string>;
  currentPlotKey?: number | string;
  numPlotsPerRow?: number;
};

type PlotGridRowData = {
  rowStart: number;
  maxItems?: number;
  selectedPlotKeys?: Set<number | string>;
  currentPlotKey?: number | string;
  hideBorderColorPlotKeys?: Set<number | string>;
  plotIds: (number | string)[];
  plotsDict: { [key: number | string]: JSX.Element };
};
const PlotRow: FunctionComponent<PlotGridRowData> = (
  props: PlotGridRowData,
) => {
  const {
    rowStart,
    maxItems,
    plotIds,
    selectedPlotKeys,
    currentPlotKey,
    plotsDict,
    hideBorderColorPlotKeys,
  } = props;
  const rowEnd = maxItems || plotIds.length;
  const idsThisRow = plotIds.slice(rowStart, rowStart + rowEnd);
  return (
    <Grid key={rowStart} container>
      {idsThisRow
        .filter((id) => plotsDict[id])
        .map((id) => {
          let className = `plotWrapperStyle`;
          if (!hideBorderColorPlotKeys?.has(id)) {
            className =
              className +
              " " +
              (currentPlotKey === id
                ? "plotCurrentStyle"
                : selectedPlotKeys?.has(id)
                  ? "plotSelectedStyle"
                  : "plotUnselectedStyle");
          } else {
            className = className + " plotUnselectableStyle";
          }
          return (
            <Grid key={id} item>
              <div className={className}>{plotsDict[id]}</div>
            </Grid>
          );
        })}
    </Grid>
  );
};

const PlotGrid: FunctionComponent<Props> = ({
  plots,
  plotComponent,
  selectedPlotKeys,
  currentPlotKey,
  numPlotsPerRow,
}) => {
  const Component = plotComponent;

  const hideBorderColorPlotKeys = useMemo(() => {
    const ret = new Set<string | number>();
    for (const p of plots) {
      if (p.hideBorderColor) {
        ret.add(p.key);
      }
    }
    return ret;
  }, [plots]);

  // Don't rerender the individual plots with every pass
  // This code renders the individual components, memoized based on Component type and plot data, and then
  // loads them into a dictionary mapping the ID to the rendered plot (with label and interactivity function).
  // TODO: keep items from previous iterations somehow?
  const _plotsDict = useMemo(() => {
    const contents = Object.assign(
      {},
      ...plots.map((p) => {
        const labelHeight = p.label !== undefined ? 20 : 0;
        const rendered = (
          <div data-key={p.key} onClick={p.clickHandler || voidClickHandler}>
            <IfVisible width={p.props.width} height={p.props.height}>
              <span>
                {p.label !== undefined && (
                  <div
                    className={"plotLabelStyle"}
                    style={{
                      maxWidth: p.props.width,
                      height: labelHeight,
                      userSelect: "none",
                    }}
                  >
                    <span style={{ color: p.labelColor }}>
                      {p.label || <span>&nbsp;</span>}
                    </span>
                  </div>
                )}
                <Component
                  {...{
                    ...p.props,
                    height: p.props.height
                      ? p.props.height - labelHeight
                      : p.props.height,
                  }}
                />
              </span>
            </IfVisible>
          </div>
        );
        return { [p.key]: rendered };
      }),
    );
    return contents as any as { [key: number]: JSX.Element };
  }, [plots, Component]);

  const rowStarts = Array(plots.length)
    .fill(0)
    .map((x, ii) => ii)
    .filter((i) => i % (numPlotsPerRow || plots.length) === 0);
  const plotIds = useMemo(() => {
    return plots.map((p) => p.key);
  }, [plots]);

  return (
    <Grid container spacing={0}>
      {rowStarts.map((start) => (
        <PlotRow
          key={`row-${start}`}
          rowStart={start}
          maxItems={numPlotsPerRow}
          plotIds={plotIds}
          selectedPlotKeys={selectedPlotKeys}
          currentPlotKey={currentPlotKey}
          hideBorderColorPlotKeys={hideBorderColorPlotKeys}
          plotsDict={_plotsDict}
        />
      ))}
    </Grid>
  );
};

export default PlotGrid;
