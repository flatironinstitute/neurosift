/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useEffect, useState } from "react";

type NeurosiftAnnotationsContextType = {
  neurosiftAnnotationsAccessToken?: string;
  setNeurosiftAnnotationsAccessToken: (accessToken: string) => void;
  neurosiftAnnotationsUserId?: string;
};

const defaultNeurosiftAnnotationsContext: NeurosiftAnnotationsContextType = {
  setNeurosiftAnnotationsAccessToken: () => {
    throw new Error("setNeurosiftAnnotationsAccessToken not implemented");
  },
};

export const NeurosiftAnnotationsContext =
  createContext<NeurosiftAnnotationsContextType>(
    defaultNeurosiftAnnotationsContext,
  );

const useNeurosiftAnnotations = () => {
  const cc = useContext(NeurosiftAnnotationsContext);
  return {
    neurosiftAnnotationsAccessToken: cc.neurosiftAnnotationsAccessToken,
    setNeurosiftAnnotationsAccessToken: cc.setNeurosiftAnnotationsAccessToken,
    neurosiftAnnotationsUserId: cc.neurosiftAnnotationsUserId,
  };
};

export const SetupNeurosiftAnnotationsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [neurosiftAnnotationsAccessToken, setNeurosiftAnnotationsAccessToken] =
    useState<string | undefined>(undefined);
  useEffect(() => {
    const at = localStorage.getItem("neurosift-annotations-access-token");
    if (at) {
      setNeurosiftAnnotationsAccessToken(at);
    }
  }, []);

  const [neurosiftAnnotationsUserId, setNeurosiftAnnotationsUserId] = useState<
    string | undefined
  >(undefined);
  useEffect(() => {
    let canceled = false;
    setNeurosiftAnnotationsUserId(undefined);
    if (!neurosiftAnnotationsAccessToken) {
      return;
    }
    (async () => {
      const url = "https://api.github.com/user";
      const response = await fetch(url, {
        headers: {
          Authorization: `token ${neurosiftAnnotationsAccessToken}`,
        },
      });
      if (canceled) return;
      if (!response.ok) {
        console.error("Failed to fetch user info", response);
        return;
      }
      const resp = await response.json();
      const userId = "github|" + resp.login;
      setNeurosiftAnnotationsUserId(userId);
    })();
    return () => {
      canceled = true;
    };
  }, [neurosiftAnnotationsAccessToken]);

  return (
    <NeurosiftAnnotationsContext.Provider
      value={{
        neurosiftAnnotationsAccessToken,
        setNeurosiftAnnotationsAccessToken,
        neurosiftAnnotationsUserId,
      }}
    >
      {children}
    </NeurosiftAnnotationsContext.Provider>
  );
};

export default useNeurosiftAnnotations;
