import {
  AccordionItem,
  Checkbox,
  Select,
  SettingPair,
  TextInput,
  TimeOverview,
  TimeWindow,
  ViewPanel,
  type TimeWindowValue,
} from "@ui";
import { useState } from "react";

const SESSION = { start: 0, end: 1375.28 };

/** A spectrogram’s frame: summary, time controls, overview, settings, and a stand-in for the chart. */
export default function ViewPanelDemo() {
  const [view, setView] = useState<TimeWindowValue>({
    start: 412,
    duration: 30,
  });
  const [open, setOpen] = useState({
    channels: true,
    preprocessing: false,
    readouts: true,
  });
  const [channel, setChannel] = useState("0");
  const [highPass, setHighPass] = useState("");
  const [lowPass, setLowPass] = useState("");
  const [zeroPhase, setZeroPhase] = useState(true);
  const filters = [
    highPass && `high-pass ${highPass} Hz`,
    lowPass && `low-pass ${lowPass} Hz`,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <div className="view-panel-demo">
      <ViewPanel
        label="Spectrogram of LFPs"
        summary="LFPs: 70 channels at 400 Hz, 1,375.28 s. Showing channel 0, Hann window, 1 s segments."
        controls={
          <TimeWindow
            value={view}
            session={SESSION}
            cursor={view.start}
            onChange={setView}
          />
        }
        overview={
          <TimeOverview
            session={SESSION}
            value={view}
            cursor={view.start}
            onChange={setView}
          />
        }
        chartTitle="Spectrogram"
        settings={
          <>
            <AccordionItem
              title="Channels"
              summary={`Channel ${channel}`}
              open={open.channels}
              onToggle={(o) => setOpen({ ...open, channels: o })}
            >
              <Select
                label="Channel"
                size="sm"
                value={channel}
                onChange={setChannel}
                options={["0", "1", "2", "3"].map((c) => ({
                  value: c,
                  label: `Channel ${c}`,
                }))}
              />
            </AccordionItem>
            <AccordionItem
              title="Preprocessing"
              summary={filters || "Off"}
              open={open.preprocessing}
              onToggle={(o) => setOpen({ ...open, preprocessing: o })}
            >
              <SettingPair>
                <TextInput
                  label="High-pass (Hz)"
                  size="sm"
                  value={highPass}
                  onChange={setHighPass}
                />
                <TextInput
                  label="Low-pass (Hz)"
                  size="sm"
                  value={lowPass}
                  onChange={setLowPass}
                />
              </SettingPair>
              <Checkbox
                label="Zero-phase"
                checked={zeroPhase}
                onChange={setZeroPhase}
              />
            </AccordionItem>
            <AccordionItem
              title="Readouts"
              open={open.readouts}
              onToggle={(o) => setOpen({ ...open, readouts: o })}
            >
              <p className="type-caption">
                Frequency resolution{" "}
                <span className="type-code-sm">1.00 Hz</span>
              </p>
            </AccordionItem>
          </>
        }
      >
        <div className="view-panel-demo-chart type-caption">
          Neurosift’s spectrogram chart, unchanged: a placeholder here
        </div>
      </ViewPanel>
    </div>
  );
}
