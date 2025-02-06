/* eslint-disable @typescript-eslint/no-explicit-any */
export type NwbFileOverview = {
  items: {
    name: string;
    path: string;
    renderer?: (val: any) => string;
  }[];
  nwbVersion: string;
};

export type GeneralLabelMapItem = {
  name: string;
  newName: string;
  renderer?: (val: any) => string;
};
