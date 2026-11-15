import { IconButton } from "../IconButton/IconButton";

interface PlotThemeSwitchProps {
  theme: "light" | "dark";
  onChange: (theme: "light" | "dark") => void;
}

/** A chart's Light/Dark switch: the moon turns charts dark, the sun turns them light. */
export function PlotThemeSwitch({ theme, onChange }: PlotThemeSwitchProps) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <IconButton
      size="sm"
      variant="ghost"
      icon={next === "dark" ? "asleep" : "light"}
      label={next === "dark" ? "Dark chart" : "Light chart"}
      tooltip
      onClick={() => onChange(next)}
    />
  );
}
