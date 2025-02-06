import TrialAlignedSeriesItemView from "./TrialAlignedSeriesItemView/TrialAlignedSeriesItemView";

type Props = {
  nwbUrl: string;
  path: string;
  secondaryPaths?: string[];
  width?: number;
  height?: number;
};

const TrialAlignedPluginView = ({
  nwbUrl,
  path,
  secondaryPaths,
  width,
  height,
}: Props) => {
  return (
    <TrialAlignedSeriesItemView
      width={width || 800}
      height={height || 800}
      nwbUrl={nwbUrl}
      path={path}
      additionalPaths={secondaryPaths}
    />
  );
};

export default TrialAlignedPluginView;
