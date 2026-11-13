import ViewError from "@components/ViewError/ViewError";
import AuthErrorNotification from "../NwbPage/components/AuthErrorNotification";
import type { DandisetFailure } from "./useQueryDandiset";

interface DandisetErrorProps {
  dandisetId: string;
  failure: DandisetFailure;
}

/** Shown in place of a Dandiset page when the archive won't give it: the API key notice, or what went wrong. */
const DandisetError = ({ dandisetId, failure }: DandisetErrorProps) => {
  const { access } = failure;
  if (!access || access === "open" || access === "failed")
    return (
      <ViewError what={`Dandiset ${dandisetId}`} error={failure.message} />
    );
  return (
    <AuthErrorNotification
      dandiUrl={failure.url}
      access={access}
      dandisetId={dandisetId}
      detail={access === "embargoed" ? undefined : failure.message}
    />
  );
};

export default DandisetError;
