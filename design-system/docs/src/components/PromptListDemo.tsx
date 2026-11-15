import { PromptList, type Prompt } from "@ui";
import { useState } from "react";

const PROMPTS: Prompt[] = [
  { id: "published", text: "How many Dandisets are published?" },
  { id: "modality", text: "Break down OpenNeuro datasets by modality" },
  {
    id: "hippocampus",
    text: "Find Dandisets with hippocampal recordings in mice",
  },
  { id: "units", text: "Show the units table in Dandiset 000673" },
];

/** Suggested prompts under a page heading; choosing one says what would be sent. */
export default function PromptListDemo() {
  const [sent, setSent] = useState("");
  return (
    <section
      className="prompt-list-demo"
      aria-labelledby="prompt-list-demo-title"
    >
      <h3 id="prompt-list-demo-title" className="prompt-list-demo-title">
        Suggested prompts
      </h3>
      <PromptList
        label="Suggested prompts"
        items={PROMPTS}
        onSelect={(item) => setSent(item.text)}
      />
      <p className="doc-note" aria-live="polite">
        {sent ? `Sent: “${sent}”` : "Choose a prompt to send it."}
      </p>
    </section>
  );
}
