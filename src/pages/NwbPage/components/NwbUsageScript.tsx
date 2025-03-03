import { FunctionComponent, useEffect, useState, useCallback } from "react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getLindiUrl } from "../hdf5Interface";

type Props = {
  nwbUrl: string;
};

const NwbUsageScript: FunctionComponent<Props> = ({ nwbUrl }) => {
  const [scriptContent, setScriptContent] = useState<string | undefined>(
    undefined,
  );
  const [headerContent, setHeaderContent] = useState<string | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const getUsageScript = async () => {
      const lindiUrl = getLindiUrl(nwbUrl);
      if (!lindiUrl) {
        setError("LINDI file was not found");
        return;
      }

      // Replace nwb.lindi.json with usage.py in the URL
      const usageUrl = lindiUrl.replace("nwb.lindi.json", "usage.py");

      try {
        const response = await fetch(usageUrl);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Usage script was not found");
          } else {
            setError(`Error fetching usage script: ${response.statusText}`);
          }
          return;
        }
        const script = await response.text();
        const header = `# This script is suitable to be included as a part of a prompt to an LLM.
# It teaches the LLM how to access the data in this particular NWB file using lindi and pynwb.
# This is an experimental feature and is under development.

import pynwb
import lindi

# Load ${nwbUrl}
f = lindi.LindiH5pyFile.from_lindi_file("${lindiUrl}")
nwb = pynwb.NWBHDF5IO(file=f, mode='r').read()

`;
        setHeaderContent(header);
        setScriptContent(script);
      } catch (error) {
        setError(`Error fetching usage script: ${error}`);
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

  return (
    <div>
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
  );
};

export default NwbUsageScript;
