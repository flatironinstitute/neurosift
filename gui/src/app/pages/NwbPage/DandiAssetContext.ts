import { createContext, useContext } from "react";

export type DandiAssetContextType = {
  assetUrl: string;
  dandisetId: string;
  dandisetVersion: string;
  assetId?: string;
  assetPath?: string;
};

export const defaultDandiAssetContext: DandiAssetContextType = {
  assetUrl: "",
  dandisetId: "",
  dandisetVersion: "",
};

export const DandiAssetContext = createContext<DandiAssetContextType>({
  assetUrl: "",
  dandisetId: "",
  dandisetVersion: "",
});

export const useDandiAssetContext = () => {
  return useContext(DandiAssetContext);
};
