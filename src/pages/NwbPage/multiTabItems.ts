// A multi-object tab is opened from a list of item strings collected by the
// hierarchy view's checkboxes. Each is either a plain object path, or
// "<pluginName>|<path>^<secondaryPath>^..." for a launchable plugin view.
export type MultiTabItem = {
  path: string;
  pluginName?: string;
  secondaryPaths?: string[];
};

export const parseMultiTabItem = (itemString: string): MultiTabItem => {
  const bar = itemString.indexOf("|");
  if (bar < 0) {
    return { path: itemString };
  }
  const pluginName = itemString.slice(0, bar);
  const [path, ...secondaryPaths] = itemString.slice(bar + 1).split("^");
  return { path, pluginName, secondaryPaths };
};

export const parseMultiTabItems = (itemStrings: string[]): MultiTabItem[] =>
  itemStrings.map(parseMultiTabItem);
