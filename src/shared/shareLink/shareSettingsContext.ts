import { createContext } from "react";
import type { ShareAddress, ShareRegistry } from "./shareAddress";

export const ShareSettingsContext = createContext<ShareRegistry | undefined>(
  undefined,
);

export const ShareAddressContext = createContext<ShareAddress | undefined>(
  undefined,
);

/** The object's name that prefixes a view's settings in a combined tab. */
export const SharePrefixContext = createContext<string | undefined>(undefined);
