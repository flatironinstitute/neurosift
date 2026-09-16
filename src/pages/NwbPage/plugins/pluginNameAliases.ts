// A plugin name appears in the ?tab= parameter of every link to that view, so
// renaming a plugin would break every link shared before the rename. Old names
// are kept here and resolved to the current one.
const legacyPluginNames: { [oldName: string]: string } = {
  // Renamed to make the view's purpose clearer.
  TimeAlignedSeries: "EventRelatedSignal",
};

export const resolvePluginName = (name: string): string =>
  legacyPluginNames[name] || name;
