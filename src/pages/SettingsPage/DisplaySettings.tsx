import { useId } from "react";
import { Section, SegmentedControl } from "@ui";
import type { Theme } from "../../theme";
import "./DisplaySettings.css";

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "high-contrast", label: "High contrast" },
];

interface DisplaySettingsProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
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
        onChange={(value) => onThemeChange(value as Theme)}
        describedBy={help}
      />
      <p className="display-settings-help" id={help}>
        Saved in this browser. Plots keep a white background in every theme.
      </p>
    </Section>
  );
}
