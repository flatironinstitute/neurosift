import React, { FunctionComponent, PropsWithChildren, useState } from "react";
import { useWindowDimensions } from "@fi-sci/misc";
import { ReactElement } from "react-markdown/lib/react-markdown";

type Props = {
  visible: boolean;
  position: Position;
  setPosition: (position: Position) => void;
};

type Position =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "full";

const PopupChatWindow: FunctionComponent<PropsWithChildren<Props>> = ({
  visible,
  children,
  position,
}) => {
  const { width, height } = useWindowDimensions();
  let W, H, left, top;
  if (position === "full") {
    left = 15;
    top = 15;
    W = width - 30;
    H = height - 30;
  } else {
    W = Math.max(300, Math.min(width / 2, 500));
    H = Math.max(300, Math.min(height / 2, 500));
    left = position.includes("left") ? 15 : width - W - 15;
    top = position.includes("top") ? 15 : height - H - 15;
  }
  const childElement: ReactElement = React.Children.only(
    children,
  ) as ReactElement;
  if (!visible) return <span />;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: W,
        height: H,
        background: "gray",
        zIndex: 5001,
        backgroundColor: "gray",
        opacity: 0.97,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          width: W - 20,
          height: H - 20,
          background: "white",
          opacity: 0.97,
        }}
      >
        {childElement ? (
          <childElement.type
            {...childElement.props}
            width={W - 20}
            height={H - 20}
          />
        ) : (
          <span>No child element</span>
        )}
      </div>
    </div>
  );
};

export default PopupChatWindow;
