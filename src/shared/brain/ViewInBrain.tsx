import { Button } from "@ui";
import "./ViewInBrain.css";

/** Opens Neurosift Brain on a dandiset or file. "Brain" is set in capitals, so screen readers say the word. */
export function ViewInBrain({
  href,
  size = "md",
}: {
  href: string;
  size?: "md" | "sm";
}) {
  return (
    <Button variant="secondary" size={size} icon="view" href={href}>
      View in <span className="brain-name">Brain</span>
    </Button>
  );
}
