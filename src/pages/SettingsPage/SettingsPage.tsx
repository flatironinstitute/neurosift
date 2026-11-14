import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { setPlotTheme, usePlotThemeChoice } from "@shared/plotTheme";
import { applyTheme, readTheme } from "../../theme";
import { returnPath } from "./returnPath";
import { SettingsView, type ApiKeys, type SettingsTab } from "./SettingsView";

const readKeys = (): ApiKeys => ({
  dandiApiKey: localStorage.getItem("dandiApiKey") || "",
  dandiStagingApiKey: localStorage.getItem("dandiStagingApiKey") || "",
  emberApiKey: localStorage.getItem("emberApiKey") || "",
});

/** Keeps the API keys in this browser's localStorage; ?tab=display and ?tab=mcp open those tabs. Saves each key as it's typed, then goes back to ?return= if given. */
export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const back = returnPath(searchParams.get("return"));
  const asked = searchParams.get("tab");
  const tab: SettingsTab =
    asked === "mcp" || asked === "display" ? asked : "keys";
  const [theme, setTheme] = useState(readTheme);
  const chartTheme = usePlotThemeChoice();
  const onTabChange = (next: SettingsTab) =>
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === "keys") params.delete("tab");
        else params.set("tab", next);
        return params;
      },
      { replace: true },
    );
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
      tab={tab}
      onTabChange={onTabChange}
      theme={theme}
      chartTheme={chartTheme}
      onChartThemeChange={setPlotTheme}
      onThemeChange={(next) => {
        applyTheme(next);
        setTheme(next);
      }}
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
