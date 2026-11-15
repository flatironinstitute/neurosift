import { Button } from "../Button/Button";
import { Checkbox } from "../Checkbox/Checkbox";
import { Icon } from "../Icon/Icon";
import { IconButton } from "../IconButton/IconButton";
import "../base.css";
import { neurodataIcon } from "./neurodataIcon";
import "./ObjectTree.css";
import type { ReactNode } from "react";

export interface ObjectView {
  name: string;
  checked: boolean;
  onCheck: (checked: boolean) => void;
  onOpen: () => void;
}

interface ViewChipProps extends ObjectView {
  /** The object the view belongs to, so the checkbox is named in full. */
  object: string;
}

/** One view of an object: a checkbox adds it to a combined view, the name opens it. */
export function ViewChip({
  object,
  name,
  checked,
  onCheck,
  onOpen,
}: ViewChipProps) {
  return (
    <span className="ns-view-chip">
      <Checkbox
        label={`Add ${object}, ${name} to the combined view`}
        hideLabel
        checked={checked}
        onChange={onCheck}
      />
      <button type="button" className="ns-view-chip-name" onClick={onOpen}>
        {name}
      </button>
    </span>
  );
}

interface ObjectRowProps {
  name: string;
  path: string;
  /** The neurodata type, empty for plain groups. */
  type: string;
  description?: string;
  /** 1 for top-level objects; each level indents 16px. */
  level: number;
  kind: "collapsed" | "expanded" | "leaf";
  onToggle: () => void;
  checked: boolean;
  onCheck: (checked: boolean) => void;
  onOpen: () => void;
  views: ObjectView[];
  /** After the type, such as the default units badge. */
  badge?: ReactNode;
  /** Whether the type shows in link blue; by default, when the row has views. */
  hasView?: boolean;
  /** The rows inside an expanded group. */
  children?: ReactNode;
}

/** A neurodata object in the Main tab: chevron, checkbox, name, type and description, then views. */
export function ObjectRow({
  name,
  path,
  type,
  description,
  level,
  kind,
  onToggle,
  checked,
  onCheck,
  onOpen,
  views,
  badge,
  hasView = views.length > 0,
  children,
}: ObjectRowProps) {
  return (
    <li className={`ns-object-row ns-object-row--level-${Math.min(level, 6)}`}>
      <div className="ns-object-line">
        {kind === "leaf" ? (
          <span className="ns-object-toggle" />
        ) : (
          <IconButton
            icon={kind === "expanded" ? "chevron--down" : "chevron--right"}
            label={`Show contents of ${name}`}
            variant="ghost"
            size="sm"
            tooltip={false}
            aria-expanded={kind === "expanded"}
            onClick={onToggle}
          />
        )}
        <Checkbox
          label={`Add ${name} to the combined view`}
          hideLabel
          checked={checked}
          onChange={onCheck}
        />
        <span className="ns-object-icon">
          <Icon name={neurodataIcon(type)} />
        </span>
        <span className="ns-object-main">
          <span className="ns-object-head">
            <button type="button" className="ns-object-name" onClick={onOpen}>
              {name}
            </button>
            {type && (
              <span
                className={
                  hasView
                    ? "ns-object-type ns-object-type--view"
                    : "ns-object-type"
                }
              >
                {type}
              </span>
            )}
            {badge}
            {description && (
              <span className="ns-object-description" title={description}>
                {description}
              </span>
            )}
          </span>
          {views.length > 0 && (
            <span className="ns-object-views">
              {views.map((view) => (
                <ViewChip key={view.name} object={name} {...view} />
              ))}
            </span>
          )}
          <span className="ns-visually-hidden">{path}</span>
        </span>
      </div>
      {kind === "expanded" && children && (
        <ul className="ns-object-children">{children}</ul>
      )}
    </li>
  );
}

interface SelectionBarProps {
  names: string[];
  onShowList: () => void;
  onClear: () => void;
  onViewTogether: () => void;
}

const join = (names: string[]) =>
  names.length === 2 ? `${names[0]} and ${names[1]}` : names[0];

/** Above the object tree while anything is checked: what is checked, Clear and View together. */
export function SelectionBar({
  names,
  onShowList,
  onClear,
  onViewTogether,
}: SelectionBarProps) {
  const many = names.length > 2;
  return (
    <section className="ns-selection-bar" aria-label="Combined view selection">
      <span className="ns-selection-names">
        {many ? `${names[0]}, ${names[1]}` : join(names)}
      </span>
      {!many && (
        <span className="ns-selection-total">{`${names.length} selected`}</span>
      )}
      {many && (
        <Button variant="ghost" size="sm" onClick={onShowList}>
          {`${names.length} selected, show all`}
        </Button>
      )}
      <span className="ns-selection-actions">
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
        <Button variant="primary" size="sm" onClick={onViewTogether}>
          View together
        </Button>
      </span>
    </section>
  );
}

interface SelectionItem {
  id: string;
  label: string;
  /** The path or view, when the label alone is ambiguous. */
  context?: string;
}

/** The full selection, in the order checked; each × unchecks one. */
export function SelectionList({
  items,
  onRemove,
}: {
  items: SelectionItem[];
  onRemove: (id: string) => void;
}) {
  return (
    <ul className="ns-selection-list" aria-label="Selected objects">
      {items.map((item) => (
        <li className="ns-selection-item" key={item.id}>
          <span className="ns-selection-item-text">
            <span>{item.label}</span>
            {item.context && (
              <span className="ns-selection-item-context">{item.context}</span>
            )}
          </span>
          <IconButton
            icon="close"
            label={`Remove ${item.label}`}
            variant="ghost"
            size="sm"
            tooltip={false}
            onClick={() => onRemove(item.id)}
          />
        </li>
      ))}
    </ul>
  );
}
