// Collect every result of a paginated DANDI API listing. The API returns
// at most a page of results at a time and points to the rest with `next`,
// so a listing that stops at the first page silently loses everything past
// it (a directory with more than a thousand files, for example).
export type PaginatedResponse<T> = {
  results: T[];
  next?: string | null;
};

// The page count is bounded so that a misbehaving server cannot keep a
// client looping; a directory of this many pages is not a realistic case.
export const MAX_PAGES = 200;

export const fetchAllPages = async <T>(
  firstUrl: string,
  headers?: { [key: string]: string },
): Promise<T[]> => {
  const results: T[] = [];
  let url: string | null | undefined = firstUrl;
  for (let page = 0; url && page < MAX_PAGES; page++) {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Request failed (${response.status}) for ${url}`);
    }
    const data = (await response.json()) as PaginatedResponse<T>;
    results.push(...data.results);
    url = data.next;
  }
  if (url) {
    console.warn(`Stopped following pages after ${MAX_PAGES}: ${url}`);
  }
  return results;
};
