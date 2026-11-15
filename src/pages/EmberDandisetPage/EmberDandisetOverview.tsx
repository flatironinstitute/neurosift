import { FunctionComponent } from "react";
import DatasetOverview from "../common/DatasetOverview/DatasetOverview";
import { dandisetContent } from "../common/DatasetOverview/dandiOverview";
import { DandisetVersionInfo } from "../DandiPage/dandi-types";

type DandisetOverviewProps = {
  width: number;
  height: number;
  dandisetVersionInfo: DandisetVersionInfo;
};

/** An EMBER Dandiset in the shared dataset overview. */
const EmberDandisetOverview: FunctionComponent<DandisetOverviewProps> = ({
  dandisetVersionInfo: info,
}) => {
  const id = info.dandiset.identifier;
  return (
    <DatasetOverview
      archive={{ name: "EMBER", href: `${import.meta.env.BASE_URL}ember` }}
      itemName="Dandiset"
      id={id}
      title={info.metadata.name}
      version={info.version}
      external={{
        label: "View on EMBER",
        href: `https://dandi.emberarchive.org/dandiset/${id}/${info.version}`,
      }}
      {...dandisetContent(info)}
    />
  );
};

export default EmberDandisetOverview;
