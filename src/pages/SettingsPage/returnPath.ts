/** The in-app path Settings was asked to return to, or undefined unless it stays on this site. */
export const returnPath = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : undefined;
