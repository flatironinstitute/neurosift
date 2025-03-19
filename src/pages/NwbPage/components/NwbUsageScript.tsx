import {
  FunctionComponent,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getLindiUrl } from "../hdf5Interface";
import createUsageScriptForNwbFile from "./createUsageScriptForNwbFile";

type Props = {
  nwbUrl: string;
  onNwbUsage: (usage: string) => void;
};

const NwbUsageScript: FunctionComponent<Props> = ({ nwbUrl, onNwbUsage }) => {
  const [scriptContent, setScriptContent] = useState<string | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | undefined>(undefined);

  const headerContent = useMemo(() => {
    const lindiUrl = getLindiUrl(nwbUrl);
    return `# This script shows how to load this in Python using PyNWB and LINDI
# It assumes you have installed PyNWB and LINDI (pip install pynwb lindi)

import pynwb
import lindi

# Load ${nwbUrl}
${
  lindiUrl
    ? `f = lindi.LindiH5pyFile.from_lindi_file("${lindiUrl}")`
    : `f = lindi.LindiH5pyFile.from_hdf5_file("${nwbUrl}")`
}
nwb = pynwb.NWBHDF5IO(file=f, mode='r').read()

`;
  }, [nwbUrl]);

  useEffect(() => {
    // const getUsageScriptFromUrl = async () => {
    //   const lindiUrl = getLindiUrl(nwbUrl);
    //   if (!lindiUrl) {
    //     setError("LINDI file was not found");
    //     return;
    //   }

    //   // Replace nwb.lindi.json with usage.py in the URL
    //   const usageUrl = lindiUrl.replace("nwb.lindi.json", "usage.py");

    //   try {
    //     const response = await fetch(usageUrl);
    //     if (!response.ok) {
    //       if (response.status === 404) {
    //         setError("Usage script was not found");
    //       } else {
    //         setError(`Error fetching usage script: ${response.statusText}`);
    //       }
    //       return;
    //     }
    //     const script = await response.text();
    //     setScriptContent(script);
    //   } catch (error) {
    //     setError(`Error fetching usage script: ${error}`);
    //   }
    // };
    const getUsageScript = async () => {
      if (!nwbUrl) return;
      try {
        const x = await createUsageScriptForNwbFile(nwbUrl);
        setScriptContent(x);
      } catch (error) {
        setError(`Error creating usage script: ${error}`);
      }
    };
    getUsageScript();
  }, [nwbUrl]);

  const handleCopyClick = useCallback(() => {
    if (!headerContent || !scriptContent) return;
    navigator.clipboard
      .writeText(headerContent + scriptContent)
      .then(() => {
        const button = document.getElementById("copy-script-button");
        if (button) {
          const originalText = button.textContent;
          button.textContent = "Copied!";
          setTimeout(() => {
            button.textContent = originalText;
          }, 2000);
        }
      })
      .catch((err) => console.error("Failed to copy text: ", err));
  }, [headerContent, scriptContent]);

  if (error) {
    return <div style={{ color: "gray", padding: 20 }}>{error}</div>;
  }

  if (!scriptContent || !headerContent) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  const fullContent = `\`\`\`python\n${headerContent}${scriptContent}\n\`\`\``;
  onNwbUsage(fullContent);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <button
        id="copy-script-button"
        onClick={handleCopyClick}
        style={{
          padding: "6px 12px",
          margin: "0 0 10px 0",
          backgroundColor: "#f0f0f0",
          border: "1px solid #ccc",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Copy Script
      </button>
      <div style={{ maxHeight: 300, overflow: "auto" }}>
        <Markdown
          components={{
            code(props) {
              const { children, className } = props;
              const match = /language-(\w+)/.exec(className || "");
              const language = match ? match[1] : "";
              return language ? (
                <SyntaxHighlighter style={vs} language={language} PreTag="div">
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <code className={className}>{children}</code>
              );
            },
          }}
        >
          {fullContent}
        </Markdown>
      </div>
    </div>
  );
};

export default NwbUsageScript;
