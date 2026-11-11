import { Alert } from "@ui";
import { useNavigate } from "react-router-dom";
import "./AuthErrorNotification.css";

interface AuthErrorNotificationProps {
  dandiUrl?: string;
}

const ARCHIVES = [
  {
    host: "api.sandbox.dandiarchive.org",
    key: "a DANDI sandbox",
    on: "the DANDI sandbox",
    site: "https://gui-staging.dandiarchive.org",
  },
  {
    host: "emberarchive.org",
    key: "an EMBER",
    on: "EMBER",
    site: "https://dandi.emberarchive.org",
  },
];
const DANDI = { key: "a DANDI", on: "DANDI", site: "https://dandiarchive.org" };

/** Shown when the archive refuses a file or Dandiset because it's embargoed and no key, or the wrong key, was sent. */
const AuthErrorNotification = ({ dandiUrl }: AuthErrorNotificationProps) => {
  const navigate = useNavigate();
  const archive = ARCHIVES.find((a) => dandiUrl?.includes(a.host)) ?? DANDI;
  return (
    <div className="auth-error-notification">
      <Alert
        status="warning"
        title="This Dandiset is embargoed"
        actions={[
          { label: "Add API key", onClick: () => navigate("/settings") },
          {
            label: `Get a key on ${archive.on}`,
            href: archive.site,
            newTab: true,
          },
        ]}
      >
        Add {archive.key} API key from an account with access to open its files.
      </Alert>
    </div>
  );
};

export default AuthErrorNotification;
