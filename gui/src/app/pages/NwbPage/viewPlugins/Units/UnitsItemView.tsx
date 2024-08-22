import { FunctionComponent, useMemo } from "react";
import DynamicTableView from "../DynamicTable/DynamicTableView";
import { useSelectedUnitIds } from "app/package/context-unit-selection";

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;
};

const UnitsItemView: FunctionComponent<Props> = ({
  width,
  height,
  path,
  condensed,
}) => {
  const { selectedUnitIds, unitIdSelectionDispatch } = useSelectedUnitIds();
  const selectedUnitIdsList = useMemo(() => {
    return [...selectedUnitIds];
  }, [selectedUnitIds]);
  return (
    <DynamicTableView
      width={width}
      height={height}
      path={path}
      referenceColumnName={"id"}
      selectedRowIds={selectedUnitIdsList}
      setSelectedRowIds={(ids) => {
        unitIdSelectionDispatch({
          type: "SET_SELECTION",
          incomingSelectedUnitIds: ids,
        });
      }}
    />
  );
};

export default UnitsItemView;
