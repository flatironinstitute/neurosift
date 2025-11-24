import { FunctionComponent } from "react";

type Props = {
  slpUrl: string;
  width: number;
  height: number;
};

const SlpMainWorksspace: FunctionComponent<Props> = ({
  slpUrl,
  width,
  height,
}) => {
  return (
    <div style={{ width, height }}>
      <h2>SLP Main Workspace</h2>
      <p>SLP URL: {slpUrl}</p>
    </div>
  );
};

export default SlpMainWorksspace;
