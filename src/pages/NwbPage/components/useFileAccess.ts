import { useEffect, useState } from "react";
import { keyRefusedFor } from "../../util/apiKeys";
import { getAuthError, type AuthError } from "../hdf5Interface";

const readFileAccess = (nwbUrl: string): AuthError | undefined =>
  getAuthError(nwbUrl) ??
  (keyRefusedFor(nwbUrl)
    ? { access: "keyRefusedOpen", status: 401 }
    : undefined);

/** The file's API key state, checked each second while its reads go out. */
export const useFileAccess = (nwbUrl: string) => {
  const [access, setAccess] = useState(() => readFileAccess(nwbUrl));
  useEffect(() => {
    const check = () => {
      const next = readFileAccess(nwbUrl);
      setAccess((current) =>
        current?.access === next?.access && current?.status === next?.status
          ? current
          : next,
      );
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [nwbUrl]);
  return access;
};
