export type ChatContext =
  | {
      type: "main";
    }
  | {
      type: "dandiset";
      dandisetId: string;
    }
  | {
      type: "nwb";
      dandisetId?: string;
      nwbUrl: string;
    };
