import { useLocation, useNavigate } from "react-router-dom";

/** The link parameter that keeps the Chat panel open: ?chat=open. */
export const CHAT_PARAM = "chat";

/** --layout-panel-wide in pixels, for the layouts that size themselves in script. */
export const CHAT_PANEL_WIDTH = 360;

/** From this window width the panel docks beside the page; narrower, it slides over it. */
export const CHAT_DOCK_MIN = 1280;

/** A preview build of the chat that can sit in a panel (qp's ?embed=1 mode). */
const CHAT_EMBED_URL =
  import.meta.env.VITE_CHAT_EMBED_URL ||
  "https://jguerrero-prog.github.io/qp/chat";

/** The Dandiset explorer for one Dandiset version, embedded. */
export const chatEmbedSrc = (dandisetId: string, version: string) => {
  const params = new URLSearchParams({
    app: "dandiset-explorer",
    dandisetId,
    dandisetVersion: version,
    embed: "1",
  });
  return `${CHAT_EMBED_URL}?${params}`;
};

/** Whether the Chat panel is open, kept in the address so a shared link opens it too. */
export function useChatOpen(): [boolean, (open: boolean) => void] {
  const { search, hash } = useLocation();
  const navigate = useNavigate();
  const open = new URLSearchParams(search).get(CHAT_PARAM) === "open";
  const setOpen = (next: boolean) => {
    const params = new URLSearchParams(search);
    if (next) params.set(CHAT_PARAM, "open");
    else params.delete(CHAT_PARAM);
    // Slashes read better unencoded and are allowed in a query.
    const query = params.toString().replace(/%2F/gi, "/");
    navigate({ search: query ? `?${query}` : "", hash }, { replace: true });
  };
  return [open, setOpen];
}

/**
 * The folder on this Dandiset's page that a link from the chat points into:
 * an NWB file's folder ("" for the top), or undefined for anything else.
 */
export function linkFolder(href: string, dandisetId: string) {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return undefined;
  }
  const params = url.searchParams;
  if (params.get("dandisetId") !== dandisetId) return undefined;
  const path = params.get("path");
  if (!url.pathname.endsWith("/nwb") || !path) return undefined;
  return path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
}
