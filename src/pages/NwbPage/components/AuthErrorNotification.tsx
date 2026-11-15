import { Alert, type AlertAction } from "@ui";
import { useLocation, useNavigate } from "react-router-dom";
import { ARCHIVES, archiveForUrl, type NoticeAccess } from "../../util/apiKeys";
import "./AuthErrorNotification.css";

interface AuthErrorNotificationProps {
  /** The archive url that was asked, which names the archive. */
  dandiUrl?: string;
  access: NoticeAccess;
  dandisetId?: string;
  /** The notice is about a file rather than a whole Dandiset. */
  file?: boolean;
  /** The archive's answer, with its status code, as the Alert's detail line. */
  detail?: string;
}

const DANDI = ARCHIVES.find((a) => a.name === "DANDI")!;

/** What a page says when an archive's API key decides access: embargoed, refused, or opened without it. */
const AuthErrorNotification = ({
  dandiUrl,
  access,
  dandisetId,
  file,
  detail,
}: AuthErrorNotificationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const archive = archiveForUrl(dandiUrl) ?? DANDI;
  const openSettings = (label: string): AlertAction => ({
    label,
    onClick: () =>
      navigate(
        `/settings?return=${encodeURIComponent(location.pathname + location.search + location.hash)}`,
      ),
  });
  const getKey: AlertAction = {
    label: `Get a key on ${archive.on}`,
    href: archive.site,
    newTab: true,
  };
  const inDandiset = dandisetId ? `Dandiset ${dandisetId}` : "a Dandiset";
  const refused = `${archive.subject} didn’t accept your API key`;

  const notice = {
    embargoed: {
      status: "warning",
      title: file
        ? `This file needs ${archive.aKey} API key`
        : "This Dandiset is embargoed",
      body: `${file ? `It is in ${inDandiset}, which is embargoed. ` : ""}Add ${archive.aKey} API key from an account with access to open it.`,
      actions: [openSettings("Add API key"), getKey],
    },
    notPublic: {
      status: "warning",
      title:
        `${archive.subject} has no public Dandiset ${dandisetId ?? ""}`.trim(),
      body: `It may be embargoed. If your ${archive.name} account has access, add its API key and Neurosift will look again.`,
      actions: [openSettings("Add API key"), getKey],
    },
    keyRefused: {
      status: "error",
      title: refused,
      body: `Embargoed data needs a working key. Replace the key saved in Settings with your current one from ${archive.on}.`,
      actions: [
        openSettings("Replace API key"),
        { ...getKey, label: `Get your key on ${archive.on}` },
      ],
    },
    keyRefusedOpen: {
      status: "warning",
      title: refused,
      body: "Public data still opens; embargoed data needs a working key.",
      actions: [openSettings("Replace API key")],
    },
  } as const;
  const { status, title, body, actions } = notice[access];

  return (
    <div className="auth-error-notification">
      <Alert
        status={status}
        title={title}
        detail={detail}
        actions={actions as [AlertAction] | [AlertAction, AlertAction]}
      >
        {body}
      </Alert>
    </div>
  );
};

export default AuthErrorNotification;
