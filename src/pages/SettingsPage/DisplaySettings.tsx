import { useId } from "react";
import { Section, SegmentedControl } from "@ui";
import { PLOT_THEME_OPTIONS, type PlotThemeChoice } from "@shared/plotTheme";
import { THEME_OPTIONS, type ThemeChoice } from "../../theme";
import "./DisplaySettings.css";

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
          options={THEME_OPTIONS}
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
          options={PLOT_THEME_OPTIONS}
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
