// The DANDI archive API (and EMBER's DANDI-compatible API) list endpoint
// for dandisets, with the free-text search encoded so that characters such
// as "&", "#", "+" and spaces reach the server intact.
export const buildDandisetsSearchUrl = (o: {
  apiBaseUrl: string; // e.g. https://api.dandiarchive.org
  searchQuery: string;
  embargoed: boolean;
  pageSize?: number;
}): string => {
  const params = new URLSearchParams({
    page: "1",
    page_size: String(o.pageSize ?? 50),
    ordering: "-modified",
    search: o.searchQuery,
    draft: "true",
    // an empty search lists everything, so hide empty dandisets then
    empty: o.searchQuery ? "true" : "false",
    embargoed: o.embargoed ? "true" : "false",
  });
  return `${o.apiBaseUrl}/api/dandisets/?${params.toString()}`;
};
