import useNeurosiftSavedChats from "./useNeurosiftSavedChats";
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
  dandisetVersion?: string;
  nwbFileUrl?: string;
  feedback?: boolean;
  userId?: string;
}) => {
  const req: GetSavedChatsRequest = {
    type: "GetSavedChats",
    chatId: a.chatId,
    dandisetId: a.dandisetId,
    dandisetVersion: a.dandisetVersion,
    nwbFileUrl: a.nwbFileUrl,
    feedback: a.feedback,
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
  return savedChats.sort((a, b) => b.timestampCreated - a.timestampCreated);
};

export const addSavedChat = async (a: {
  chatTitle: string;
  messages: any[];
  userId?: string;
  dandisetId?: string;
  dataVersion?: string;
  nwbFileUrl?: string;
  feedbackResponse?: "helpful" | "unhelpful" | "neutral";
  feedbackNotes?: string;
  feedbackOnly?: boolean;
  neurosiftSavedChatsAccessToken?: string;
  images: { name: string; dataUrl: string }[];
  figureDataFiles: { name: string; content: string }[];
}) => {
  const url = `${neurosiftSavedChatsApiUrl}/api/addSavedChat`;
  const req: AddSavedChatRequest = {
    type: "AddSavedChat",
    chatTitle: a.chatTitle,
    messages: a.messages,
    userId: a.userId,
    dandisetId: a.dandisetId,
    dandisetVersion: a.dataVersion,
    nwbFileUrl: a.nwbFileUrl,
    feedbackResponse: a.feedbackResponse,
    feedbackNotes: a.feedbackNotes,
    feedbackOnly: a.feedbackOnly,
  };
  let authorizationHeader: string | undefined;
  if (a.neurosiftSavedChatsAccessToken) {
    authorizationHeader = `Bearer ${a.neurosiftSavedChatsAccessToken}`;
  } else {
    if (!a.feedbackOnly) {
      console.error("Missing access token for adding saved chat");
      return;
    }
    authorizationHeader = undefined;
  }
  const headers: { [key: string]: string } = {
    "Content-Type": "application/json",
  };
  if (authorizationHeader) {
    headers.Authorization = authorizationHeader;
  }
  const r = await fetch(url, {
    method: "POST",
    headers,
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
  for (const sub of data.imageSubstitutions) {
    const { name, uploadUrl } = sub;
    const x = a.images.find((x) => x.name === name);
    if (!x) {
      console.error("Unexpected: image not found", name);
      continue;
    }
    const buf = arrayBufferFromDataUrl(x.dataUrl);
    const r2 = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "image/png",
      },
      body: buf,
    });
    if (r2.status !== 200) {
      console.error("Error uploading image", r2);
      continue;
    }
  }
  for (const sub of data.figureDataSubstitutions || []) {
    const { name, uploadUrl } = sub;
    const x = a.figureDataFiles.find((x) => x.name === name);
    if (!x) {
      console.error("Unexpected: figure data file not found", name);
      continue;
    }
    const r2 = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: x.content,
    });
    if (r2.status !== 200) {
      console.error("Error uploading figure data file", r2);
      continue;
    }
  }
  return data.chatId;
};

const arrayBufferFromDataUrl = (dataUrl: string) => {
  const parts = dataUrl.split(",");
  if (parts.length !== 2) {
    throw new Error("Invalid data URL");
  }
  const mime = parts[0].split(":")[1].split(";")[0];
  if (mime !== "image/png") {
    throw new Error("Unexpected MIME type: " + mime);
  }
  const data = parts[1];
  return Uint8Array.from(atob(data), (c) => c.charCodeAt(0)).buffer;
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
  dandisetVersion?: string;
  nwbFileUrl?: string;
  feedback?: boolean;
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
        dandisetVersion: a.dandisetVersion,
        nwbFileUrl: a.nwbFileUrl,
        feedback: a.feedback,
        userId: a.userId,
      });
      if (canceled) return;
      setSavedChats(savedChats);
    };
    load0();
    return () => {
      canceled = true;
    };
  }, [
    savedChatsRefreshCode,
    a.load,
    a.chatId,
    a.dandisetId,
    a.dandisetVersion,
    a.nwbFileUrl,
    a.feedback,
    a.userId,
  ]);
  const handleAddSavedChat = useMemo(
    () =>
      neurosiftSavedChatsAccessToken && neurosiftSavedChatsUserId
        ? async (a: {
            chatTitle: string;
            messages: any[];
            dandisetId?: string;
            nwbFileUrl?: string;
            images: { name: string; dataUrl: string }[];
            figureDataFiles: { name: string; content: string }[];
          }) => {
            const chatId = await addSavedChat({
              chatTitle: a.chatTitle,
              messages: a.messages,
              userId: neurosiftSavedChatsUserId!,
              dandisetId: a.dandisetId,
              nwbFileUrl: a.nwbFileUrl,
              neurosiftSavedChatsAccessToken,
              images: a.images,
              figureDataFiles: a.figureDataFiles,
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
