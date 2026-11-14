import { useId } from "react";
import { Section, SegmentedControl } from "@ui";
import type { ThemeChoice } from "../../theme";
import "./DisplaySettings.css";

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "high-contrast", label: "High contrast" },
  { value: "system", label: "Match system" },
];

interface DisplaySettingsProps {
  theme: ThemeChoice;
  onThemeChange: (theme: ThemeChoice) => void;
}

/** The theme picker; a choice applies at once and is kept in this browser. */
export function DisplaySettings({
  theme,
  onThemeChange,
}: DisplaySettingsProps) {
  const help = useId();
  return (
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
        settings. Saved in this browser. Plots keep a white background in every
        theme.
      </p>
    </Section>
  );
}
