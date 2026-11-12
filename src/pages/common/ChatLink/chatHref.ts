const DANDISET_CHAT = "https://dandiset-explorer.neurosift.app/chat";

/** The Dandiset explorer chat on a Dandiset version, or on one of its files. */
export function dandisetChatHref(
  dandisetId: string,
  version: string,
  assetPath?: string,
): string {
  const query = `dandisetId=${dandisetId}&dandisetVersion=${version}`;
  return assetPath
    ? `${DANDISET_CHAT}?${query}&assetPath=${encodeURIComponent(assetPath)}`
    : `${DANDISET_CHAT}?${query}`;
}

interface FileChatInput {
  nwbUrl: string;
  dandisetId?: string;
  version?: string;
  assetPath?: string;
}

/** The chat about a DANDI file; none for EMBER, the sandbox or a plain URL. */
export function fileChatHref({
  nwbUrl,
  dandisetId,
  version,
  assetPath,
}: FileChatInput): string | undefined {
  if (!dandisetId || !version || !assetPath) return undefined;
  if (!nwbUrl.startsWith("https://api.dandiarchive.org/")) return undefined;
  return dandisetChatHref(dandisetId, version, assetPath);
}
