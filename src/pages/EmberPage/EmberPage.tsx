import { FunctionComponent } from "react";
import BaseDandiPage from "../common/BaseDandiPage/BaseDandiPage.tsx";

type EmberPageProps = {
  width: number;
  height: number;
};

const EmberPage: FunctionComponent<EmberPageProps> = ({ width, height }) => {
  return (
    <BaseDandiPage
      width={width}
      height={height}
      title="EMBER Archive Browser"
      websiteUrl="https://emberarchive.org/"
      websiteName="EMBER Archive"
      apiBaseUrl="https://api-dandi.emberarchive.org/api"
      dandisetRoute="/ember-dandiset"
      componentId="EmberPage"
    />
  );
};

export default EmberPage;