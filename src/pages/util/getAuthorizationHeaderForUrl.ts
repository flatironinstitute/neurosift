const getAuthorizationHeaderForUrl = (url?: string) => {
  if (!url) return "";
  let key = "";
  if (url.startsWith("https://api-staging.dandiarchive.org/")) {
    key = localStorage.getItem("dandiStagingApiKey") || "";
  } else if (url.startsWith("https://api.dandiarchive.org/")) {
    key = localStorage.getItem("dandiApiKey") || "";
  } else if (url.startsWith("https://api-dandi.emberarchive.org")) {
    key = localStorage.getItem("emberApiKey") || "";
  }
  if (key) return "token " + key;
  else return "";
};

export default getAuthorizationHeaderForUrl;
