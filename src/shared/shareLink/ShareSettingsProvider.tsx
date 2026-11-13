import { PropsWithChildren, useContext, useEffect, useState } from "react";
import { linkedSettings } from "./linkSettings";
import type { ShareRegistry } from "./shareAddress";
import {
  ShareAddressContext,
  SharePrefixContext,
  ShareSettingsContext,
} from "./shareSettingsContext";

/** Collects the settings of the views in one tab for the address and Copy link, and hands them the link's settings. */
export const ShareSettingsProvider = ({
  tab,
  opensAs = tab,
  children,
}: PropsWithChildren<{
  /** The tab as links name it. */
  tab: string;
  /** The tab parameter that opens this tab, when the address names it another way. */
  opensAs?: string;
}>) => {
  const address = useContext(ShareAddressContext);
  const [registry] = useState<ShareRegistry>(() => ({
    tab,
    linked: linkedSettings(window.location.search, opensAs),
    views: new Map(),
  }));
  useEffect(() => {
    address?.add(registry);
    return () => address?.remove(registry);
  }, [address, registry]);
  return (
    <ShareSettingsContext.Provider value={registry}>
      {children}
    </ShareSettingsContext.Provider>
  );
};

/** One view in a combined tab: its settings go under the object's name, such as LFPs.channels. */
export const ShareSettingsPrefix = ({
  prefix,
  children,
}: PropsWithChildren<{ prefix: string }>) => (
  <SharePrefixContext.Provider value={prefix}>
    {children}
  </SharePrefixContext.Provider>
);
