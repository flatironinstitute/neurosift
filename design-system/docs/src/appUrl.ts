// The published docs carry the app at PUBLIC_APP_BASE; elsewhere links go to the published app.
const PUBLISHED = "https://neurosift.app/";

export const appBase = import.meta.env.PUBLIC_APP_BASE as string | undefined;

export const appHref = (path = "") => `${appBase ?? PUBLISHED}${path}`;
