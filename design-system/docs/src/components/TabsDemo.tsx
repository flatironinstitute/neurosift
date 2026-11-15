import { Button, TabPanel, Tabs, type TabItem } from "@ui";
import { useState } from "react";

const SECTIONS: TabItem[] = [
  { id: "widgets", label: "Widgets" },
  { id: "alignment", label: "Timeseries alignment" },
  { id: "python", label: "Python usage" },
  { id: "schema", label: "Schema" },
  { id: "hdf5", label: "HDF5" },
];

const OBJECTS: TabItem[] = [
  { id: "main", label: "Main" },
  { id: "lfps", label: "LFPs", closable: true, tooltip: "/acquisition/LFPs" },
  { id: "units", label: "units", closable: true, tooltip: "/units" },
  {
    id: "trials",
    label: "trials",
    closable: true,
    tooltip: "/intervals/trials",
  },
];

/** Live section tabs with their panels. */
export function SectionTabsDemo() {
  const [selected, setSelected] = useState("widgets");
  return (
    <div className="tabs-demo">
      <Tabs
        id="demo-sections"
        label="File views"
        tabs={SECTIONS}
        selected={selected}
        onSelect={setSelected}
      />
      {SECTIONS.map((tab) => (
        <TabPanel
          key={tab.id}
          tabsId="demo-sections"
          tabId={tab.id}
          selected={tab.id === selected}
        >
          <p className="tabs-demo-panel">The {tab.label} view of the file.</p>
        </TabPanel>
      ))}
    </div>
  );
}

/** Live object tabs: close any but Main, with the × or Delete; closing the open tab opens its neighbor. */
export function ObjectTabsDemo() {
  const [tabs, setTabs] = useState(OBJECTS);
  const [selected, setSelected] = useState("lfps");
  const close = (id: string) => {
    const index = tabs.findIndex((t) => t.id === id);
    const rest = tabs.filter((t) => t.id !== id);
    setTabs(rest);
    if (id === selected) setSelected(rest[Math.min(index, rest.length - 1)].id);
  };
  return (
    <div className="tabs-demo">
      <Tabs
        id="demo-objects"
        label="Open objects"
        kind="object"
        tabs={tabs}
        selected={selected}
        onSelect={setSelected}
        onClose={close}
      />
      {tabs.map((tab) => (
        <TabPanel
          key={tab.id}
          tabsId="demo-objects"
          tabId={tab.id}
          selected={tab.id === selected}
        >
          <p className="tabs-demo-panel">
            {tab.tooltip ?? "The file overview"}
          </p>
        </TabPanel>
      ))}
      {tabs.length < OBJECTS.length && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setTabs(OBJECTS);
            setSelected("lfps");
          }}
        >
          Reopen all
        </Button>
      )}
    </div>
  );
}
