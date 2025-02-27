import { useEffect } from "react";
import { useAIComponentRegistry } from "../../AIContext";

const useRegisterNwbAIComponent = ({
  nwbUrl,
  dandisetId,
  dandisetVersion,
}: {
  nwbUrl: string;
  dandisetId?: string;
  dandisetVersion: string;
}) => {
  const { registerComponentForAI, unregisterComponentForAI } =
    useAIComponentRegistry();

  useEffect(() => {
    const context = `
The user is viewing an NWB file in the NwbPage.
- URL: ${nwbUrl}
${dandisetId ? `- This file is from DANDI dataset ${dandisetId} version ${dandisetVersion}` : ""}

The user can:
- Exploring the NWB file hierarchy
- Click to open neurodata objects
`;

    const registration = {
      id: "NwbPage",
      context,
      callbacks: [],
    };
    registerComponentForAI(registration);
    return () => unregisterComponentForAI("NwbPage");
  }, [
    registerComponentForAI,
    unregisterComponentForAI,
    nwbUrl,
    dandisetId,
    dandisetVersion,
  ]);
};

export default useRegisterNwbAIComponent;
