import { TextInput } from "@ui";
import { useState } from "react";

/** Two API key fields: one to show and hide, and one DANDI rejected. */
export default function ApiKeyDemo() {
  const [ember, setEmber] = useState("");
  const [emberShown, setEmberShown] = useState(false);
  const [dandi, setDandi] = useState("7f3a9c2e51d84b06a1c3");
  const [dandiShown, setDandiShown] = useState(false);
  return (
    <div className="section-demo">
      <TextInput
        type="password"
        label="EMBER API key"
        helper="Opens embargoed Dandisets on dandi.emberarchive.org. Saved in this browser only."
        value={ember}
        onChange={setEmber}
        reveal={{
          shown: emberShown,
          onShownChange: setEmberShown,
          name: "API key",
        }}
      />
      <TextInput
        type="password"
        label="DANDI API key"
        error="DANDI didn’t accept this key. Copy it again from your DANDI account page."
        value={dandi}
        onChange={setDandi}
        reveal={{
          shown: dandiShown,
          onShownChange: setDandiShown,
          name: "API key",
        }}
      />
    </div>
  );
}
