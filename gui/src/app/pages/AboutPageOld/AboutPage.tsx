import { FunctionComponent, useEffect, useState } from "react";
import Markdown from "neurosift-lib/components/Markdown";

type Props = {
  width: number;
  height: number;
};

const AboutPage: FunctionComponent<Props> = ({ width, height }) => {
  const [source, setSource] = useState<string>("");
  useEffect(() => {
    fetch("/markdown/about.md").then((response) => {
      if (response.ok) {
        response.text().then((txt) => {
          setSource(txt);
        });
      }
    });
  }, []);
  const W = Math.min(800, width - 40);
  return (
    <div style={{ position: "absolute", width, height, overflowY: "auto" }}>
      <div style={{ position: "absolute", left: (width - W) / 2, width: W }}>
        <div>&nbsp;</div>
        <Markdown source={source} />
        <div>&nbsp;</div>
        <div>&nbsp;</div>
        <div>&nbsp;</div>
      </div>
    </div>
  );
};

export default AboutPage;
