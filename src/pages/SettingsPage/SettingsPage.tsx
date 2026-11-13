import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { returnPath } from "./returnPath";
import { SettingsView, type ApiKeys } from "./SettingsView";

const readKeys = (): ApiKeys => ({
  dandiApiKey: localStorage.getItem("dandiApiKey") || "",
  dandiStagingApiKey: localStorage.getItem("dandiStagingApiKey") || "",
  emberApiKey: localStorage.getItem("emberApiKey") || "",
});

/** Keeps the API keys in this browser's localStorage, saving each as it's typed, then goes back to ?return= if given. */
export default function SettingsPage() {
  const back = returnPath(useSearchParams()[0].get("return"));
  const [keys, setKeys] = useState(readKeys);
  const [showReload, setShowReload] = useState(false);
  const [shown, setShown] = useState<Record<keyof ApiKeys, boolean>>({
    dandiApiKey: false,
    dandiStagingApiKey: false,
    emberApiKey: false,
  });
  const onChange = (key: keyof ApiKeys, value: string) => {
    localStorage.setItem(key, value);
    setKeys((current) => ({ ...current, [key]: value }));
    setShowReload(true);
  };
  return (
    <SettingsView
      keys={keys}
      onChange={onChange}
      shown={shown}
      onShownChange={(key, next) =>
        setShown((current) => ({ ...current, [key]: next }))
      }
      showReload={showReload}
      returning={!!back}
      onReload={() =>
        back
          ? window.location.assign(
              `${import.meta.env.BASE_URL}${back.slice(1)}`,
            )
          : window.location.reload()
      }
    />
  );
}
