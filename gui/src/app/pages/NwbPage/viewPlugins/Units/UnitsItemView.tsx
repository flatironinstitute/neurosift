import { FunctionComponent } from "react";
import DynamicTableView from "../DynamicTable/DynamicTableView";

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
  return (
    <DynamicTableView
      width={width}
      height={height}
      path={path}
      referenceColumnName={"id"}
    />
  );
};

export default UnitsItemView;
