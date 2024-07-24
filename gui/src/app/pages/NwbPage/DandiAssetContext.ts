import { createContext, useContext } from "react";

export type AssociatedDendroProject = {
  projectId: string;
  name: string;
  ownerId: string;
};

export type DandiAssetContextType = {
  assetUrl: string;
  dandisetId: string;
  dandisetVersion: string;
  assetId?: string;
  assetPath?: string;
  associatedDendroProjects?: AssociatedDendroProject[];
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
