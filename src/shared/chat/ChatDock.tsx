import { useCallback, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChatPanel } from "./ChatPanel";
import {
  CHAT_DOCK_MIN,
  CHAT_PANEL_WIDTH,
  chatEmbedSrc,
  linkFolder,
  useChatOpen,
} from "./chatState";

type ChatDockProps = {
  width: number;
  dandisetId: string;
  version: string;
  /** The page, laid out at the width the panel leaves it. */
  children: (width: number) => ReactNode;
};

/** A Dandiset page with its Chat panel: docked on wide windows, over the page on narrow ones. */
export function ChatDock({
  width,
  dandisetId,
  version,
  children,
}: ChatDockProps) {
  const [open, setOpen] = useChatOpen();
  const { search } = useLocation();
  const navigate = useNavigate();
  const docked = width >= CHAT_DOCK_MIN;

  // An NWB file in this Dandiset opens its folder in Files; other links open a tab.
  const onOpenLink = useCallback(
    (href: string) => {
      const folder = linkFolder(href, dandisetId);
      if (folder === undefined) {
        window.open(href, "_blank", "noopener");
        return;
      }
      const params = new URLSearchParams(search);
      if (folder) params.set("location", folder);
      else params.delete("location");
      navigate({ search: `?${params.toString().replace(/%2F/gi, "/")}` });
    },
    [dandisetId, search, navigate],
  );

  return (
    <div className="chat-dock">
      <div className="chat-dock-page">
        {children(open && docked ? width - CHAT_PANEL_WIDTH : width)}
      </div>
      {open && (
        <ChatPanel
          src={chatEmbedSrc(dandisetId, version)}
          subject={`Dandiset ${dandisetId}`}
          mode={docked ? "docked" : "overlay"}
          onClose={() => setOpen(false)}
          onOpenLink={onOpenLink}
        />
      )}
    </div>
  );
}
