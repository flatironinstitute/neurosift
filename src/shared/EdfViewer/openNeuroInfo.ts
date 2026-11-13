export type OpenNeuroInfo = {
  datasetId: string;
  subjectId: string;
  sessionId: string;
  modality: string;
  fileName: string;
};

/** Where an OpenNeuro file sits, read from its S3 URL: dataset/subject/session/modality/file. */
export const openNeuroInfo = (url: string): OpenNeuroInfo | null => {
  if (!url.startsWith("https://s3.amazonaws.com/openneuro.org/")) return null;
  const parts = url.split("?")[0].split("/");
  if (parts.length !== 9) return null;
  return {
    datasetId: parts[4],
    subjectId: parts[5],
    sessionId: parts[6],
    modality: parts[7],
    fileName: parts[8],
  };
};
