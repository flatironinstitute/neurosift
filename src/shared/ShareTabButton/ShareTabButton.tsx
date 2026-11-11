import { IconButton, useToast } from "@ui";
import { shareLink } from "./shareLink";

interface ShareTabButtonProps {
  /** The address parameters that reopen this tab, such as the file and the tab. */
  params: Record<string, string>;
}

const ShareTabButton = ({ params }: ShareTabButtonProps) => {
  const toast = useToast();
  const share = () =>
    navigator.clipboard.writeText(shareLink(window.location.href, params)).then(
      () => toast.show({ status: "success", message: "Link copied" }),
      () =>
        toast.show({
          status: "error",
          message: "Couldn’t copy the link. Copy it from the address bar.",
        }),
    );
  return (
    <IconButton
      icon="share"
      label="Copy link to this tab"
      size="sm"
      onClick={(event) => {
        event.stopPropagation(); // The button sits on the tab; don't switch tabs.
        share();
      }}
    />
  );
};

export default ShareTabButton;
