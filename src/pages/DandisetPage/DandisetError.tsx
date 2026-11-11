import ViewError from "@components/ViewError/ViewError";
import AuthErrorNotification from "../NwbPage/components/AuthErrorNotification";
import type { DandisetFailure } from "./useQueryDandiset";

interface DandisetErrorProps {
  dandisetId: string;
  failure: DandisetFailure;
}

/** Shown in place of a Dandiset page when the archive won't give it: the embargo warning, or what went wrong. */
const DandisetError = ({ dandisetId, failure }: DandisetErrorProps) =>
  failure.status === 401 || failure.status === 403 ? (
    <AuthErrorNotification dandiUrl={failure.url} />
  ) : (
    <ViewError what={`Dandiset ${dandisetId}`} error={failure.message} />
  );

export default DandisetError;
