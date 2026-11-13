export const dandisetIdFromUrl = (url: string): string => {
  const urlObj = new URL(url);
  return urlObj.searchParams.get("dandisetId") || "";
};
