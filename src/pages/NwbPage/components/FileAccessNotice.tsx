import { archiveForUrl } from "../../util/apiKeys";
import type { AuthError } from "../hdf5Interface";
import AuthErrorNotification from "./AuthErrorNotification";

interface FileAccessNoticeProps {
  nwbUrl: string;
  dandisetId?: string;
  authError: AuthError;
}

/** The API key notice for a file, with the archive's status when a refused key blocks it. */
const FileAccessNotice = ({
  nwbUrl,
  dandisetId,
  authError: { access, status },
}: FileAccessNoticeProps) => (
  <AuthErrorNotification
    dandiUrl={nwbUrl}
    access={access}
    dandisetId={dandisetId}
    file
    detail={
      access === "keyRefused"
        ? `${archiveForUrl(nwbUrl)?.name ?? "The archive"} answered ${status} for this file.`
        : undefined
    }
  />
);

export default FileAccessNotice;
