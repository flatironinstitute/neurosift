import React, { FunctionComponent, PropsWithChildren, useState } from "react";
import { useWindowDimensions } from "@fi-sci/misc";
import { ReactElement } from "react-markdown/lib/react-markdown";

type Props = {
  visible: boolean;
};

const PopupChatWindow: FunctionComponent<PropsWithChildren<Props>> = ({
  visible,
  children,
}) => {
  const { width, height } = useWindowDimensions();
  const W = 500;
  const H = 500;
  const childElement: ReactElement = React.Children.only(
    children,
  ) as ReactElement;
  if (!visible) return <span />;
  return (
    <div
      style={{
        position: "absolute",
        left: width - W - 50,
        top: height - H - 50,
        width: W + 20,
        height: H + 20,
        background: "gray",
        zIndex: 2001,
        backgroundColor: "gray",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          width: W,
          height: H,
          background: "white",
        }}
      >
        {childElement ? (
          <childElement.type {...childElement.props} width={W} height={H} />
        ) : (
          <span>No child element</span>
        )}
      </div>
    </div>
  );
};

export default PopupChatWindow;
