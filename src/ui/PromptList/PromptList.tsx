import "../base.css";
import "../row-list.css";
import "./PromptList.css";

export interface Prompt {
  id: string;
  text: string;
}

interface PromptListProps {
  /** The list's accessible name; the page shows its own heading. */
  label: string;
  items: Prompt[];
  onSelect: (item: Prompt) => void;
}

/** Prompts that send when chosen, in the rows Recently opened uses. */
export function PromptList({ label, items, onSelect }: PromptListProps) {
  return (
    <ul className="ns-row-list" aria-label={label}>
      {items.map((item) => (
        <li key={item.id} className="ns-row-list-row">
          <button
            type="button"
            className="ns-row-list-action ns-prompt-list-text"
            onClick={() => onSelect(item)}
          >
            {item.text}
          </button>
        </li>
      ))}
    </ul>
  );
}
