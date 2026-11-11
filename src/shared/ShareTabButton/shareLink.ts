/** The address with these parameters set, written out unencoded so a shared link stays readable. */
export const shareLink = (href: string, params: Record<string, string>) => {
  const url = new URL(href);
  for (const [key, value] of Object.entries(params))
    url.searchParams.set(key, value);
  let link = url.toString();
  for (const [key, value] of Object.entries(params))
    link = link.replace(
      new URLSearchParams({ [key]: value }).toString(),
      `${key}=${value}`,
    );
  return link;
};
