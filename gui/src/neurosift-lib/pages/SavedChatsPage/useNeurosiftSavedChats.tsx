/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useEffect, useState } from "react";
import React from "react";

type NeurosiftSavedChatsContextType = {
  neurosiftSavedChatsAccessToken?: string;
  setNeurosiftSavedChatsAccessToken: (accessToken: string) => void;
  neurosiftSavedChatsUserId?: string;
};

const defaultNeurosiftSavedChatsContext: NeurosiftSavedChatsContextType = {
  setNeurosiftSavedChatsAccessToken: () => {
    throw new Error("setNeurosiftSavedChatsAccessToken not implemented");
  },
};

export const NeurosiftSavedChatsContext =
  createContext<NeurosiftSavedChatsContextType>(
    defaultNeurosiftSavedChatsContext,
  );

const useNeurosiftSavedChats = () => {
  const cc = useContext(NeurosiftSavedChatsContext);
  return {
    neurosiftSavedChatsAccessToken: cc.neurosiftSavedChatsAccessToken,
    setNeurosiftSavedChatsAccessToken: cc.setNeurosiftSavedChatsAccessToken,
    neurosiftSavedChatsUserId: cc.neurosiftSavedChatsUserId,
  };
};

export const SetupNeurosiftSavedChatsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [neurosiftSavedChatsAccessToken, setNeurosiftSavedChatsAccessToken] =
    useState<string | undefined>(undefined);
  useEffect(() => {
    const at = localStorage.getItem("neurosift-saved-chats-access-token");
    if (at) {
      setNeurosiftSavedChatsAccessToken(at);
    }
  }, []);

  const [neurosiftSavedChatsUserId, setNeurosiftSavedChatsUserId] = useState<
    string | undefined
  >(undefined);
  useEffect(() => {
    let canceled = false;
    setNeurosiftSavedChatsUserId(undefined);
    if (!neurosiftSavedChatsAccessToken) {
      return;
    }
    (async () => {
      const url = "https://api.github.com/user";
      const response = await fetch(url, {
        headers: {
          Authorization: `token ${neurosiftSavedChatsAccessToken}`,
        },
      });
      if (canceled) return;
      if (!response.ok) {
        console.error("Failed to fetch user info", response);
        localStorage.setItem("neurosift-saved-chats-access-token", "");
        return;
      }
      const resp = await response.json();
      const userId = "github|" + resp.login;
      setNeurosiftSavedChatsUserId(userId);
    })();
    return () => {
      canceled = true;
    };
  }, [neurosiftSavedChatsAccessToken]);

  return (
    <NeurosiftSavedChatsContext.Provider
      value={{
        neurosiftSavedChatsAccessToken,
        setNeurosiftSavedChatsAccessToken,
        neurosiftSavedChatsUserId,
      }}
    >
      {children}
    </NeurosiftSavedChatsContext.Provider>
  );
};

export default useNeurosiftSavedChats;
