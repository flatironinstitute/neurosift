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
