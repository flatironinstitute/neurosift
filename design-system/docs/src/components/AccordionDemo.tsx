import { AccordionItem, Checkbox, Disclosure, Select, TextInput } from "@ui";
import { useState } from "react";

const UNITS = ["Unit 3", "Unit 7", "Unit 12", "Unit 15"];

/** The PSTH control panel rebuilt from accordion items; each remembers whether it's open. */
export function ControlPanelDemo() {
  const [open, setOpen] = useState<Record<string, boolean>>({
    units: true,
    align: true,
    controls: false,
    categories: false,
  });
  const [checked, setChecked] = useState(["Unit 3", "Unit 7", "Unit 12"]);
  const [start, setStart] = useState("-0.5");
  const [end, setEnd] = useState("1");
  const [bins, setBins] = useState("50");
  const [group, setGroup] = useState("");
  const toggle = (key: string) => (next: boolean) =>
    setOpen((o) => ({ ...o, [key]: next }));
  return (
    <div className="accordion-demo">
      <AccordionItem
        title="Units"
        summary={`${checked.length} of 46 selected`}
        open={open.units}
        onToggle={toggle("units")}
      >
        {UNITS.map((unit) => (
          <Checkbox
            key={unit}
            label={unit}
            checked={checked.includes(unit)}
            onChange={(on) =>
              setChecked((c) =>
                on ? [...c, unit] : c.filter((u) => u !== unit),
              )
            }
          />
        ))}
      </AccordionItem>
      <AccordionItem
        title="Align to"
        summary="start_time"
        open={open.align}
        onToggle={toggle("align")}
      >
        <p className="type-body-sm accordion-demo-note">
          Trials are aligned to their start time.
        </p>
      </AccordionItem>
      <AccordionItem
        title="Controls"
        summary={`${start} to ${end} s · ${bins} bins`}
        open={open.controls}
        onToggle={toggle("controls")}
      >
        <TextInput
          label="Window start"
          unit="s"
          size="sm"
          value={start}
          onChange={setStart}
        />
        <TextInput
          label="Window end"
          unit="s"
          size="sm"
          value={end}
          onChange={setEnd}
        />
        <TextInput label="Bins" size="sm" value={bins} onChange={setBins} />
      </AccordionItem>
      <AccordionItem
        title="Categories"
        summary={group || "Not grouped"}
        open={open.categories}
        onToggle={toggle("categories")}
      >
        <Select
          label="Group trials by"
          size="sm"
          value={group}
          onChange={setGroup}
          options={[
            { value: "", label: "None" },
            { value: "trial_type", label: "Trial type" },
            { value: "response", label: "Response" },
          ]}
        />
      </AccordionItem>
    </div>
  );
}

/** A Dandiset description that shows its full text on request. */
export function DisclosureDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="disclosure-demo type-body-sm">
      <p>
        Extracellular electrophysiology recordings performed on mouse anterior
        lateral motor cortex (ALM) in a delay response task.
      </p>
      <Disclosure
        label="Show full description"
        expandedLabel="Show less"
        open={open}
        onToggle={setOpen}
      >
        <p>
          Neural activity from two neuron populations, pyramidal track upper and
          lower, was characterized in relation to movement execution.
        </p>
      </Disclosure>
    </div>
  );
}
