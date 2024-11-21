import {
  FunctionComponent
} from "react";
import CreateOrSelectDandiset from "./CreateOrSelectDandiset";

type ImportPageProps = {
  width: number;
  height: number;
};

const ImportPage: FunctionComponent<ImportPageProps> = ({
  width,
  height,
}) => {
  return (
    <CreateOrSelectDandiset
      width={width}
      height={height}
    />
  )
};

export default ImportPage;
