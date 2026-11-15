import { Button } from "@ui";
import { useState } from "react";

type Rating = "helpful" | "not-helpful" | null;

/** Helpful and Not helpful as toggle buttons: pressing one again clears it. */
export default function FeedbackDemo() {
  const [rating, setRating] = useState<Rating>(null);
  const toggle = (next: Rating) =>
    setRating((current) => (current === next ? null : next));
  return (
    <div className="demo-row" role="group" aria-label="Rate this answer">
      <Button
        size="sm"
        variant="ghost"
        pressed={rating === "helpful"}
        onClick={() => toggle("helpful")}
      >
        Helpful
      </Button>
      <Button
        size="sm"
        variant="ghost"
        pressed={rating === "not-helpful"}
        onClick={() => toggle("not-helpful")}
      >
        Not helpful
      </Button>
    </div>
  );
}
