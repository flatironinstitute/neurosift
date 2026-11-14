import { useId } from "react";
import { Section, SegmentedControl } from "@ui";
import type { PlotThemeChoice } from "@shared/plotTheme";
import type { ThemeChoice } from "../../theme";
import "./DisplaySettings.css";

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "high-contrast", label: "High contrast" },
  { value: "system", label: "Match system" },
];

const CHART_THEMES = [
  { value: "auto", label: "Match theme" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

interface DisplaySettingsProps {
  theme: ThemeChoice;
  onThemeChange: (theme: ThemeChoice) => void;
  chartTheme: PlotThemeChoice;
  onChartThemeChange: (theme: PlotThemeChoice) => void;
}

/** The app and chart themes; a choice applies at once and is kept in this browser. */
export function DisplaySettings({
  theme,
  onThemeChange,
  chartTheme,
  onChartThemeChange,
}: DisplaySettingsProps) {
  const help = useId();
  const chartHelp = useId();
  return (
    <>
      <Section title="Theme">
        <SegmentedControl
          label="Theme"
          options={THEMES}
          value={theme}
          onChange={(value) => onThemeChange(value as ThemeChoice)}
          describedBy={help}
        />
        <p className="display-settings-help" id={help}>
          Match system follows your computer’s dark mode and increased contrast
          settings. Saved in this browser.
        </p>
      </Section>
      <Section title="Charts">
        <SegmentedControl
          label="Charts"
          options={CHART_THEMES}
          value={chartTheme}
          onChange={(value) => onChartThemeChange(value as PlotThemeChoice)}
          describedBy={chartHelp}
        />
        <p className="display-settings-help" id={chartHelp}>
          Match theme draws charts dark in Dark and High contrast. Every chart
          also has its own Light and Dark switch, which changes this setting.
        </p>
      </Section>
    </>
  );
}
