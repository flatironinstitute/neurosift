import { FunctionComponent, PropsWithChildren } from "react";

const Abbreviate: FunctionComponent<PropsWithChildren> = ({ children }) => {
  return <span>{abbreviateText(children as string)}</span>;
};

const abbreviateText = (text: string | undefined) => {
  if (text === undefined) return "";
  const maxLen = 300;
  if (text.length <= maxLen) return text;
  const abbrev = text.slice(0, maxLen) + "...";
  return abbrev;
};

export default Abbreviate;
