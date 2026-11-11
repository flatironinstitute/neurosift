import { Alert, Page, Section, TextInput } from "@ui";

/** The keys, by the localStorage names the API requests read them from. */
export interface ApiKeys {
  dandiApiKey: string;
  dandiStagingApiKey: string;
  emberApiKey: string;
}

interface SettingsViewProps {
  keys: ApiKeys;
  onChange: (key: keyof ApiKeys, value: string) => void;
  shown: Record<keyof ApiKeys, boolean>;
  onShownChange: (key: keyof ApiKeys, shown: boolean) => void;
  showReload: boolean;
  onReload: () => void;
}

export function SettingsView({
  keys,
  onChange,
  shown,
  onShownChange,
  showReload,
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
          actions={[{ label: "Reload page", onClick: onReload }]}
        >
          Neurosift reads API keys when a page opens.
        </Alert>
      )}
    </Page>
  );
}
