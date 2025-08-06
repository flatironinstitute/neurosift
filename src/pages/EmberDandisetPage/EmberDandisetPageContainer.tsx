import { FC } from "react";
import LazyDandisetPage from "./LazyDandisetPage";
import EmberDandisetPage from "./index";

type DandisetPageContainerProps = {
  width: number;
  height: number;
  dandisetId?: string;
};

const EmberDandisetPageContainer: FC<DandisetPageContainerProps> = (props) => {
  const useLazy = true; // the new version is to use lazy, but we'll keep the old method around as a fallback

  // Use the lazy version if specified in URL params
  if (useLazy) {
    return <LazyDandisetPage {...props} />;
  }

  // Otherwise use the original version
  return <EmberDandisetPage {...props} />;
};

export default EmberDandisetPageContainer;
