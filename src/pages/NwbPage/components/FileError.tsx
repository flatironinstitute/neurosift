import ViewError from "@components/ViewError/ViewError";
import { getAuthError } from "../hdf5Interface";
import FileAccessNotice from "./FileAccessNotice";

interface FileErrorProps {
  nwbUrl: string;
  dandisetId?: string;
  error: string;
}

/** Shown in place of the NWB page when its file can't be opened: the API key notice, or what went wrong. */
const FileError = ({ nwbUrl, dandisetId, error }: FileErrorProps) => {
  const authError = getAuthError(nwbUrl);
  return authError ? (
    <FileAccessNotice
      nwbUrl={nwbUrl}
      dandisetId={dandisetId}
      authError={authError}
    />
  ) : (
    <ViewError
      what="this file"
      error={error}
      onRetry={() => window.location.reload()}
    />
  );
};

export default FileError;
