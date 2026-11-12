export const getDandiApiHeaders = (
  useStaging: boolean,
): { headers: { [key: string]: string }; apiKeyProvided: boolean } => {
  const headers: { [key: string]: string } = {};
  const dandiApiKey = useStaging
    ? localStorage.getItem("dandiStagingApiKey") || ""
    : localStorage.getItem("dandiApiKey") || "";
  if (dandiApiKey) {
    headers["Authorization"] = `token ${dandiApiKey}`;
  }
  return { headers, apiKeyProvided: !!dandiApiKey };
};

export const getEmberApiHeaders = (): {
  headers: { [key: string]: string };
  apiKeyProvided: boolean;
} => {
  const headers: { [key: string]: string } = {};
  const emberApiKey = localStorage.getItem("emberApiKey") || "";
  if (emberApiKey) {
    headers["Authorization"] = `token ${emberApiKey}`;
  }
  return { headers, apiKeyProvided: !!emberApiKey };
};
