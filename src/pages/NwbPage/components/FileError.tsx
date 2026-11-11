import ViewError from "@components/ViewError/ViewError";
import { hasAuthError } from "../hdf5Interface";
import AuthErrorNotification from "./AuthErrorNotification";

interface FileErrorProps {
  nwbUrl: string;
  error: string;
}

/** Shown in place of the NWB page when its file can't be opened: the embargo warning, or what went wrong. */
const FileError = ({ nwbUrl, error }: FileErrorProps) =>
  hasAuthError(nwbUrl) ? (
    <AuthErrorNotification dandiUrl={nwbUrl} />
  ) : (
    <ViewError
      what="this file"
      error={error}
      onRetry={() => window.location.reload()}
    />
  );

export default FileError;
