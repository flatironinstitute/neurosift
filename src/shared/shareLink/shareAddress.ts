import { PAGE_PARAMS, settingsLink, type Setting } from "./linkSettings";

/** One tab's views and the settings of the link that opened it. */
export type ShareRegistry = {
  tab: string;
  linked: URLSearchParams;
  views: Map<string, Setting[]>;
};

/** A tab's settings: its views', and the link's own for any a view hasn't taken up yet, such as while it loads. */
export const tabSettings = (registry: ShareRegistry): Setting[] => {
  const offered = [...registry.views.values()].flat();
  const keys = new Set(offered.map((s) => s.key));
  const carried = [...registry.linked]
    .filter(([key]) => key !== "tab" && !PAGE_PARAMS.includes(key))
    .filter(([key]) => !keys.has(key))
    .map(([key, value]) => ({
      key,
      value,
      default: "",
      label: "the link’s settings",
    }));
  // Views sharing a setting, such as speed, give one value; a changed one wins.
  const byKey = new Map<string, Setting>();
  for (const s of [...offered, ...carried]) {
    const seen = byKey.get(s.key);
    if (!seen || (seen.value === seen.default && s.value !== s.default))
      byKey.set(s.key, s);
  }
  return [...byKey.values()];
};

const DELAY_MS = 300;

/** Keeps the address bar on the active tab and its changed settings, replacing the history entry. */
export class ShareAddress {
  private tabs = new Map<string, ShareRegistry>();
  private active: string | null | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private base: Record<string, string> = {}) {}

  add(registry: ShareRegistry) {
    this.tabs.set(registry.tab, registry);
  }

  remove(registry: ShareRegistry) {
    if (this.tabs.get(registry.tab) === registry)
      this.tabs.delete(registry.tab);
  }

  settings(tab: string): Setting[] {
    const registry = this.tabs.get(tab);
    return registry ? tabSettings(registry) : [];
  }

  /** The link to a tab with its settings, or to the page itself when tab is null. */
  link(tab: string | null, href = window.location.href) {
    return settingsLink(
      href,
      tab === null ? this.base : { ...this.base, tab },
      tab === null ? [] : this.settings(tab),
    );
  }

  /** Shows a tab in the address now; null for the page's main view. */
  activate(tab: string | null) {
    this.active = tab;
    this.write();
  }

  /** A tab's settings changed: the address follows shortly if it's the active tab. */
  changed(tab: string) {
    if (tab !== this.active) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.write(), DELAY_MS);
  }

  private write() {
    clearTimeout(this.timer);
    if (this.active === undefined) return;
    const next = this.link(this.active);
    if (next !== window.location.href)
      window.history.replaceState(window.history.state, "", next);
  }
}
