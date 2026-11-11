import { useEffect } from "react";
import { AIRegisteredComponent, useAIComponentRegistry } from "../../AIContext";

const CONTEXT = `
The user is viewing the dataset search, which searches DANDI, OpenNeuro and EMBER at once.
Basic search matches the text in each archive. Semantic search finds DANDI Dandisets close in meaning.
Neurodata types search finds DANDI Dandisets with a file holding every selected type.
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
