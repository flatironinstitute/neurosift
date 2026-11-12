import { useState } from "react";
import LoadInPythonWindow from "./LoadInPythonComponent";

type Props = {
  nwbUrl: string;
  path: string;
  objectType: "group" | "dataset";
};

const PythonScriptPluginView: React.FC<Props> = ({
  nwbUrl,
  path,
  objectType,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (objectType === "group") {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            padding: "6px 12px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            background: "none",
            cursor: "pointer",
            marginBottom: "10px",
          }}
        >
          {isExpanded ? "− Load in Python" : "+ Load in Python"}
        </button>
        {isExpanded && <LoadInPythonWindow nwbUrl={nwbUrl} path={path} />}
      </div>
    );
  } else {
    return <></>;
  }
};

export default PythonScriptPluginView;
