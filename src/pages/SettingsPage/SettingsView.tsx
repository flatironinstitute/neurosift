import { Alert, Page, Section, TabPanel, Tabs, TextInput } from "@ui";
import { McpGuide } from "./McpGuide";
import "./SettingsView.css";

/** The keys, by the localStorage names the API requests read them from. */
export interface ApiKeys {
  dandiApiKey: string;
  dandiStagingApiKey: string;
  emberApiKey: string;
}

/** The Settings tabs, by the ?tab= value that opens each. */
export type SettingsTab = "keys" | "mcp";

const TABS = [
  { id: "keys", label: "API keys" },
  { id: "mcp", label: "MCP" },
];

interface SettingsViewProps {
  tab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  keys: ApiKeys;
  onChange: (key: keyof ApiKeys, value: string) => void;
  shown: Record<keyof ApiKeys, boolean>;
  onShownChange: (key: keyof ApiKeys, shown: boolean) => void;
  showReload: boolean;
  /** Settings was opened from a page that wants the new key, so the reload goes back there. */
  returning?: boolean;
  onReload: () => void;
}

export function SettingsView({
  tab,
  onTabChange,
  keys,
  onChange,
  shown,
  onShownChange,
  showReload,
  returning,
  onReload,
}: SettingsViewProps) {
  const field = (key: keyof ApiKeys, label: string, helper: string) => (
    <TextInput
      type="password"
      label={label}
      helper={helper}
      value={keys[key]}
      onChange={(value) => onChange(key, value)}
      reveal={{
        shown: shown[key],
        onShownChange: (next) => onShownChange(key, next),
        name: "API key",
      }}
    />
  );
  return (
    <Page title="Settings">
      <Tabs
        id="settings-tabs"
        label="Settings"
        tabs={TABS}
        selected={tab}
        onSelect={(id) => onTabChange(id as SettingsTab)}
      />
      <TabPanel tabsId="settings-tabs" tabId="keys" selected={tab === "keys"}>
        <div className="settings-panel">
          <Section title="DANDI API keys">
            {field(
              "dandiApiKey",
              "DANDI API key",
              "From your account on dandiarchive.org. Opens embargoed Dandisets.",
            )}
            {field(
              "dandiStagingApiKey",
              "DANDI sandbox API key",
              "From your account on sandbox.dandiarchive.org.",
            )}
          </Section>
          <Section title="EMBER API keys">
            {field(
              "emberApiKey",
              "EMBER API key",
              "From your account on the EMBER archive.",
            )}
          </Section>
          {showReload && (
            <Alert
              status="info"
              title="Reload to use the new key"
              actions={[
                {
                  label: returning ? "Back to the page" : "Reload page",
                  onClick: onReload,
                },
              ]}
            >
              Neurosift reads API keys when a page opens.
            </Alert>
          )}
        </div>
      </TabPanel>
      <TabPanel tabsId="settings-tabs" tabId="mcp" selected={tab === "mcp"}>
        <McpGuide />
      </TabPanel>
    </Page>
  );
}
