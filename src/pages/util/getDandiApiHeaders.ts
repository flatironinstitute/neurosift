import {
  ARCHIVES,
  getAuthorizationHeaderForUrl,
  type Archive,
} from "./apiKeys";

const headersFor = (name: Archive["name"]) => {
  const archive = ARCHIVES.find((a) => a.name === name)!;
  const authorization = getAuthorizationHeaderForUrl(archive.apiPrefix);
  const headers: { [key: string]: string } = authorization
    ? { Authorization: authorization }
    : {};
  return { headers, apiKeyProvided: !!authorization };
};

export const getDandiApiHeaders = (useStaging: boolean) =>
  headersFor(useStaging ? "DANDI sandbox" : "DANDI");

export const getEmberApiHeaders = () => headersFor("EMBER");
