/* eslint-disable react/prop-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
// import "katex/dist/katex.min.css";
import { FunctionComponent, useMemo, useState } from "react";
import { ReactMarkdown } from "react-markdown/lib/react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { darcula as highlighterStyle } from "react-syntax-highlighter/dist/esm/styles/prism";
// import rehypeKatexPlugin from 'rehype-katex';
import { Hyperlink, SmallIconButton } from "@fi-sci/misc";
import { CopyAll, PlayArrow } from "@mui/icons-material";
import "github-markdown-css/github-markdown-light.css";
import { SpecialComponents } from "react-markdown/lib/ast-to-react";
import { NormalComponents } from "react-markdown/lib/complex-types";
import rehypeMathJaxSvg from "rehype-mathjax";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMathPlugin from "remark-math";
import LazyPlotlyPlot, { PlotlyPlotFromUrl } from "./LazyPlotlyPlot";
import NeurosiftFigure0 from "./NeurosiftFigure0";

type Props = {
  source: string;
  onSpecialLinkClick?: (link: string) => void;
  onRunCode?: (code: string) => void;
  runCodeReady?: boolean;
  files?: { [name: string]: string };
};

const Markdown: FunctionComponent<Props> = ({
  source,
  onSpecialLinkClick,
  onRunCode,
  runCodeReady,
  files,
}) => {
  const components: Partial<
    Omit<NormalComponents, keyof SpecialComponents> & SpecialComponents
  > = useMemo(
    () => ({
      code: ({ inline, className, children, ...props }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [copied, setCopied] = useState<boolean>(false);
        const match = /language-(\w+)/.exec(className || "");
        return !inline && match ? (
          <>
            <div>
              <SmallIconButton
                icon={<CopyAll />}
                title="Copy code"
                onClick={() => {
                  navigator.clipboard.writeText(String(children));
                  setCopied(true);
                }}
              />
              {copied && <>&nbsp;copied</>}
              {onRunCode && (
                <span style={{ color: runCodeReady ? "black" : "lightgray" }}>
                  <SmallIconButton
                    icon={<PlayArrow />}
                    title="Run code"
                    onClick={() => {
                      const code = String(children);
                      onRunCode(code);
                    }}
                    disabled={!runCodeReady}
                  />
                </span>
              )}
            </div>
            <SyntaxHighlighter
              // eslint-disable-next-line react/no-children-prop
              children={String(children).replace(/\n$/, "")}
              style={highlighterStyle as any}
              language={match[1]}
              PreTag="div"
              {...props}
            />
          </>
        ) : (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
      div: ({ node, className, children, ...props }) => {
        if (className === "figurl-figure") {
          // eslint-disable-next-line react/prop-types
          const srcEncoded = (props as any).src64;
          return (
            <iframe
              src={base64Decode(srcEncoded) + "&hide=1"}
              width="100%"
              height={determineHeightFromFigurlUrl(base64Decode(srcEncoded))}
              frameBorder={0}
            />
          );
        } else if (className === "plotly") {
          // eslint-disable-next-line react/prop-types
          const src = (props as any).src || "";
          if (src.startsWith("figure://") && files) {
            const name = src.slice("figure://".length);
            if (name in files) {
              const x = JSON.parse(files[name]);
              return <LazyPlotlyPlot data={x.data} layout={x.layout} />;
            }
          } else if (src.startsWith("http://") || src.startsWith("https://")) {
            return <PlotlyPlotFromUrl url={src} />;
          }
          return (
            <div className={className} {...props}>
              {children}
            </div>
          );
        } else if (className === "neurosift_figure") {
          const nwb_url: string = (props as any).nwb_url;
          const item_path: string = (props as any).item_path;
          const view_plugin_name: string | undefined = (props as any)
            .view_plugin_name;
          const height: string | number | undefined = (props as any).height;
          const height2: number | undefined =
            height && typeof height === "string"
              ? parseInt(height)
              : (height as number | undefined);
          return (
            <NeurosiftFigure0
              nwb_url={nwb_url}
              item_path={item_path}
              view_plugin_name={view_plugin_name}
              height={height2}
            />
          );
        } else {
          return (
            <div className={className} {...props}>
              {children}
            </div>
          );
        }
      },
      a: ({ node, children, href, ...props }) => {
        if (href && href.startsWith("?") && onSpecialLinkClick) {
          return (
            <Hyperlink
              onClick={() => {
                onSpecialLinkClick(href);
              }}
            >
              {children}
            </Hyperlink>
          );
        } else {
          return (
            <a href={href} {...props}>
              {children}
            </a>
          );
        }
      },
      img: ({ node, src, ...props }) => {
        if (src?.startsWith("image://") && files) {
          const name = src.slice("image://".length);
          if (name in files) {
            const a = files[name];
            if (a.startsWith("base64:")) {
              const dataBase64 = a.slice("base64:".length);
              const dataUrl = `data:image/png;base64,${dataBase64}`;
              return <img src={dataUrl} {...props} />;
            }
          }
        }
        return <img src={src} {...props} />;
      },
      // }
    }),
    [onSpecialLinkClick, onRunCode, runCodeReady, files],
  );
  const source2 = useMemo(() => {
    const lines = source.split("\n").map((line) => {
      if (line.trim().startsWith("https://figurl.org/f")) {
        const url64 = base64Encode(line.trim());
        return `<div class="figurl-figure" src64="${url64}"></div>`;
        // it's very difficult to the following to work - encoding issues with markdown
        // return `<iframe src="${url}" width="100%" height="400" frameBorder="0"></iframe>`;
      } else return line;
    });
    return lines.join("\n");
  }, [source]);
  return (
    <div className="markdown-body" style={{ fontSize: 16 }}>
      <ReactMarkdown
        // eslint-disable-next-line react/no-children-prop
        children={source2}
        remarkPlugins={[remarkGfm, remarkMathPlugin]}
        rehypePlugins={[rehypeRaw, rehypeMathJaxSvg /*, rehypeKatexPlugin*/]}
        components={components}
        linkTarget="_blank"
      />
    </div>
  );
};

const base64Encode = (s: string) => {
  return window.btoa(s);
};

const base64Decode = (s: string) => {
  return window.atob(s);
};

const determineHeightFromFigurlUrl = (url: string) => {
  const sep = url.indexOf("?");
  if (sep < 0) return 400;
  const params = url.substring(sep + 1).split("&");
  for (const param of params) {
    const [key, value] = param.split("=");
    if (key === "height") {
      return parseInt(value);
    }
  }
  return 400;
};

export default Markdown;
