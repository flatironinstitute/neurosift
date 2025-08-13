import { FunctionComponent } from "react";
import BaseDandiPage from "../common/BaseDandiPage/BaseDandiPage.tsx";

type DandiPageProps = {
  width: number;
  height: number;
};

const DandiPage: FunctionComponent<DandiPageProps> = ({ width, height }) => {
  const staging = false; // TODO: make this a configurable setting
  const stagingStr = staging ? "-staging" : "";

  return (
    <BaseDandiPage
      width={width}
      height={height}
      title="DANDI Archive Browser"
      websiteUrl="https://dandiarchive.org/"
      websiteName="DANDI Archive"
      apiBaseUrl="https://api.dandiarchive.org"
      dandisetRoute="/dandiset"
      componentId="DandiPage"
    />
  );
};

export default DandiPage;