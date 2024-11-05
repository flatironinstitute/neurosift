import { SmallIconButton } from "@fi-sci/misc";
import { FunctionComponent } from "react";
import { FaEnvelope, FaRegThumbsDown, FaRegThumbsUp } from "react-icons/fa";

type HelpfulUnhelpfulButtonsProps = {
  onClick: (response: "helpful" | "unhelpful" | "neutral") => void;
};

const HelpfulUnhelpfulButtons: FunctionComponent<
  HelpfulUnhelpfulButtonsProps
> = ({ onClick }) => {
  return (
    <div>
      <span>
        <SmallIconButton
          onClick={() => onClick("helpful")}
          fontSize={12}
          icon={<FaRegThumbsUp />}
          title="This was helpful, provide feedback"
        />
      </span>
      <span>&nbsp;</span>
      <span>
        <SmallIconButton
          onClick={() => onClick("unhelpful")}
          fontSize={12}
          icon={<FaRegThumbsDown />}
          title="Not helpful or incorrect, provide feedback"
        />
      </span>
      <span>&nbsp;</span>
      <span>
        <SmallIconButton
          onClick={() => onClick("neutral")}
          fontSize={12}
          icon={<FaEnvelope />}
          title="Provide feedback"
        />
      </span>
    </div>
  );
};

export default HelpfulUnhelpfulButtons;
