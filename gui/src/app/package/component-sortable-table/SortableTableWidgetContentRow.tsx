import { TableCell, TableRow } from "@mui/material";
import React, { FunctionComponent } from "react";
import "./SortableTableWidget.css";
import SortableTableWidgetCheckbox from "./SortableTableWidgetCheckbox";

type RowProps = {
  rowId: string | number;
  selected: boolean;
  current: boolean;
  onClick?: (evt: React.MouseEvent) => void;
  isDisabled: boolean;
  contentRepository: { [key: string]: JSX.Element[] };
};

const SortableTableWidgetContentRow: FunctionComponent<RowProps> = (
  props: RowProps,
) => {
  const { rowId, selected, current, onClick, isDisabled, contentRepository } =
    props;
  const content = contentRepository[rowId];
  return (
    <TableRow
      key={rowId}
      className={current ? "currentRow" : selected ? "selectedRow" : ""}
    >
      {onClick && (
        <TableCell key="_checkbox">
          <SortableTableWidgetCheckbox
            rowId={rowId}
            selected={selected}
            onClick={onClick}
            isDisabled={isDisabled}
          />
        </TableCell>
      )}
      {content}
    </TableRow>
  );
};

export default SortableTableWidgetContentRow;
