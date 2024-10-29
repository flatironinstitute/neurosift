import useNeurosiftSavedChats from "app/NeurosiftSavedChats/useNeurosiftSavedChats";
import {
  AddSavedChatRequest,
  DeleteSavedChatRequest,
  GetSavedChatsRequest,
  isAddSavedChatResponse,
  isDeleteSavedChatResponse,
  isGetSavedChatsResponse,
  NeurosiftSavedChat,
} from "./types";
import { useCallback, useEffect, useMemo, useState } from "react";

export const neurosiftSavedChatsApiUrl =
  "https://neurosift-saved-chats.vercel.app";

export const getSavedChats = async (a: {
  chatId?: string;
  dandisetId?: string;
  userId?: string;
}) => {
  const req: GetSavedChatsRequest = {
    type: "GetSavedChats",
    chatId: a.chatId,
    dandiSetId: a.dandisetId,
    userId: a.userId,
  };
  const url = `${neurosiftSavedChatsApiUrl}/api/getSavedChats`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });
  if (r.status !== 200) {
    console.error("Error fetching saved chats", r);
    return [];
  }
  const data = await r.json();
  if (!isGetSavedChatsResponse(data)) {
    console.warn(data);
    console.error("Unexpected response");
    return [];
  }
  const savedChats: NeurosiftSavedChat[] = data.savedChats;
  return savedChats.sort((a, b) => a.timestampCreated - b.timestampCreated);
};

export const addSavedChat = async (a: {
  chatTitle: string;
  messages: any[];
  userId: string;
  dandisetId?: string;
  neurosiftSavedChatsAccessToken: string;
}) => {
  const url = `${neurosiftSavedChatsApiUrl}/api/addSavedChat`;
  const req: AddSavedChatRequest = {
    type: "AddSavedChat",
    chatTitle: a.chatTitle,
    messages: a.messages,
    userId: a.userId,
    dandisetId: a.dandisetId,
  };
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${a.neurosiftSavedChatsAccessToken}`,
    },
    body: JSON.stringify(req),
  });
  if (r.status !== 200) {
    console.error("Error adding saved chat", r);
    return;
  }
  const data = await r.json();
  if (!isAddSavedChatResponse(data)) {
    console.warn(data);
    console.error("Unexpected response");
    return;
  }
  return data.chatId;
};

export const deleteSavedChat = async (a: {
  chatId: string;
  neurosiftSavedChatsAccessToken: string;
}) => {
  const url = `${neurosiftSavedChatsApiUrl}/api/deleteSavedChat`;
  const req: DeleteSavedChatRequest = {
    type: "DeleteSavedChat",
    chatId: a.chatId,
  };
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${a.neurosiftSavedChatsAccessToken}`,
    },
    body: JSON.stringify(req),
  });
  if (r.status !== 200) {
    console.error("Error deleting saved chat", r);
    return;
  }
  const data = await r.json();
  if (!isDeleteSavedChatResponse(data)) {
    console.warn(data);
    console.error("Unexpected response");
    return;
  }
};

export const useSavedChats = (a: {
  load: boolean;
  chatId?: string;
  dandisetId?: string;
  userId?: string;
}) => {
  const { neurosiftSavedChatsAccessToken, neurosiftSavedChatsUserId } =
    useNeurosiftSavedChats();
  const [savedChats, setSavedChats] = useState<
    NeurosiftSavedChat[] | undefined
  >(undefined);
  const [savedChatsRefreshCode, setSavedChatsRefreshCode] = useState(0);
  const refreshSavedChats = useCallback(() => {
    setSavedChatsRefreshCode((c) => c + 1);
  }, []);
  useEffect(() => {
    if (!a.load) return;
    let canceled = false;
    const load0 = async () => {
      const savedChats = await getSavedChats({
        chatId: a.chatId,
        dandisetId: a.dandisetId,
        userId: a.userId,
      });
      if (canceled) return;
      setSavedChats(savedChats);
    };
    load0();
    return () => {
      canceled = true;
    };
  }, [savedChatsRefreshCode, a.load, a.chatId, a.dandisetId, a.userId]);
  const handleAddSavedChat = useMemo(
    () =>
      neurosiftSavedChatsAccessToken && neurosiftSavedChatsUserId
        ? async (a: {
            chatTitle: string;
            messages: any[];
            dandisetId?: string;
          }) => {
            const chatId = await addSavedChat({
              chatTitle: a.chatTitle,
              messages: a.messages,
              userId: neurosiftSavedChatsUserId!,
              dandisetId: a.dandisetId,
              neurosiftSavedChatsAccessToken,
            });
            refreshSavedChats();
            return chatId;
          }
        : undefined,
    [
      neurosiftSavedChatsAccessToken,
      neurosiftSavedChatsUserId,
      refreshSavedChats,
    ],
  );
  const handleDeleteSavedChat = useMemo(
    () =>
      neurosiftSavedChatsAccessToken
        ? async (a: { chatId: string }) => {
            await deleteSavedChat({
              chatId: a.chatId,
              neurosiftSavedChatsAccessToken,
            });
            refreshSavedChats();
          }
        : undefined,
    [neurosiftSavedChatsAccessToken, refreshSavedChats],
  );
  return {
    savedChats,
    addSavedChat: handleAddSavedChat,
    deleteSavedChat: handleDeleteSavedChat,
    refreshSavedChats,
  };
};
