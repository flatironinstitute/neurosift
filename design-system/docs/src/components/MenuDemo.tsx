import { Menu, type IconName } from "@ui";
import { useState } from "react";

interface DemoItem {
  label: string;
  meta?: string;
  disabled?: boolean;
}

interface MenuDemoProps {
  label: string;
  items: DemoItem[];
  icon?: IconName;
  size?: "md" | "sm";
}

/** A live Menu for the docs: says which item ran, since the page has nothing to share or download. */
export default function MenuDemo({ label, items, icon, size }: MenuDemoProps) {
  const [picked, setPicked] = useState("");
  return (
    <div className="menu-demo">
      <Menu
        label={label}
        icon={icon}
        size={size}
        items={items.map((item) => ({
          ...item,
          onSelect: () => setPicked(item.label),
        }))}
      />
      <p className="type-caption menu-demo-status" role="status">
        {picked && `Ran “${picked}”`}
      </p>
    </div>
  );
}
