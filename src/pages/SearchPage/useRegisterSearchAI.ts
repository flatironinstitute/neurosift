import { useEffect } from "react";
import { AIRegisteredComponent, useAIComponentRegistry } from "../../AIContext";

const CONTEXT = `
The user is viewing the dataset search, which searches DANDI, OpenNeuro and EMBER at once.
The "Search by" control has three modes. Keywords matches the words in each archive.
Meaning finds the 20 DANDI Dandisets closest in meaning, ranked by an AI model.
Neurodata types finds DANDI Dandisets with an NWB file holding every selected type.
The Archive filter picks which archives are searched.
`;

/** Tells the assistant what the search page offers. */
const useRegisterSearchAI = () => {
  const { registerComponentForAI, unregisterComponentForAI } =
    useAIComponentRegistry();
  useEffect(() => {
    const registration: AIRegisteredComponent = {
      id: "SearchPage",
      context: CONTEXT,
      callbacks: [],
    };
    registerComponentForAI(registration);
    return () => unregisterComponentForAI("SearchPage");
  }, [registerComponentForAI, unregisterComponentForAI]);
};

export default useRegisterSearchAI;
