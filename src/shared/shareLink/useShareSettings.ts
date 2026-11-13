import { useToast } from "@ui";
import { useCallback, useContext, useEffect, useId, useMemo } from "react";
import {
  copiedMessage,
  prefixSettings,
  settingsLink,
  unprefixSettings,
  type Setting,
} from "./linkSettings";
import { tabSettings } from "./shareAddress";
import {
  ShareAddressContext,
  SharePrefixContext,
  ShareSettingsContext,
} from "./shareSettingsContext";

const NONE = new URLSearchParams();

/** The settings the link that opened this tab carries; empty for any other tab. */
export const useLinkedSettings = (): URLSearchParams => {
  const linked = useContext(ShareSettingsContext)?.linked ?? NONE;
  const prefix = useContext(SharePrefixContext);
  return useMemo(
    () => (prefix ? unprefixSettings(prefix, linked) : linked),
    [prefix, linked],
  );
};

/** Offers a view's settings to its tab's address and Copy link. */
export const useShareSettings = (settings: Setting[]) => {
  const registry = useContext(ShareSettingsContext);
  const address = useContext(ShareAddressContext);
  const prefix = useContext(SharePrefixContext);
  const id = useId();
  const json = JSON.stringify(
    prefix ? prefixSettings(prefix, settings) : settings,
  );
  useEffect(() => {
    if (!registry) return;
    registry.views.set(id, JSON.parse(json));
    address?.changed(registry.tab);
    return () => {
      registry.views.delete(id);
      address?.changed(registry.tab);
    };
  }, [registry, address, id, json]);
};

/** Copies text, saying so in a toast. */
export const useCopy = () => {
  const toast = useToast();
  return useCallback(
    (
      text: string,
      done: string,
      failed = "Couldn’t copy. Your browser blocked it.",
    ) =>
      navigator.clipboard.writeText(text).then(
        () => toast.show({ status: "success", message: done }),
        () => toast.show({ status: "error", message: failed }),
      ),
    [toast],
  );
};

/** Copies a link to this tab with the settings its views changed. */
export const useCopyLink = () => {
  const registry = useContext(ShareSettingsContext);
  const copy = useCopy();
  return useCallback(
    (params: Record<string, string>) => {
      const settings = registry ? tabSettings(registry) : [];
      return copy(
        settingsLink(window.location.href, params, settings),
        copiedMessage(settings),
        "Couldn’t copy the link. Copy it from the address bar instead.",
      );
    },
    [registry, copy],
  );
};
