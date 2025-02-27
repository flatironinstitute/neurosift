import { useEffect } from "react";
import { useAIComponentRegistry } from "../../AIContext";
import { DandisetVersionInfo } from "../DandiPage/dandi-types";

const useRegisterAIComponent = ({
  dandisetId,
  dandisetVersionInfo,
  nwbFilesOwnlyControlVisible,
}: {
  dandisetId: string | undefined;
  dandisetVersionInfo: DandisetVersionInfo | null;
  nwbFilesOwnlyControlVisible: boolean;
}) => {
  const { registerComponentForAI, unregisterComponentForAI } =
    useAIComponentRegistry();
  useEffect(() => {
    const context = `
The user is viewing the DandisetPage for dandiset ${dandisetId} version ${dandisetVersionInfo?.version}.

The user can
- Clicking on a file to view it.
${nwbFilesOwnlyControlVisible ? "- Toggling the 'Show NWB files only' checkbox." : ""}
- Clicking on a file with the ".nwb" extension to view it in the NWB viewer.
`;
    const registration = {
      id: "DandisetPage",
      context,
      callbacks: [],
    };
    registerComponentForAI(registration);
    return () => unregisterComponentForAI("DandisetPage");
  }, [
    registerComponentForAI,
    unregisterComponentForAI,
    dandisetId,
    dandisetVersionInfo,
    nwbFilesOwnlyControlVisible,
  ]);
};

export default useRegisterAIComponent;
