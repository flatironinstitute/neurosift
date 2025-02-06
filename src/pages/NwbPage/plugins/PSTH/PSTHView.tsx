import PSTHItemView from "./PSTHItemView/PSTHItemView";

type Props = {
  nwbUrl: string;
  path: string;
  secondaryPaths?: string[];
  width?: number;
  height?: number;
};

const PSTHView = ({ nwbUrl, path, secondaryPaths, width, height }: Props) => {
  return (
    <PSTHItemView
      width={width || 800}
      height={height || 800}
      nwbUrl={nwbUrl}
      path={path}
      additionalPaths={secondaryPaths}
    />
  );
};

export default PSTHView;
