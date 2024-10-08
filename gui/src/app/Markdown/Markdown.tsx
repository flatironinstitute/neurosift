/* eslint-disable @typescript-eslint/no-explicit-any */
// import "katex/dist/katex.min.css";
import { FunctionComponent, useMemo, useState } from "react";
import { ReactMarkdown } from "react-markdown/lib/react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { darcula as highlighterStyle } from "react-syntax-highlighter/dist/esm/styles/prism";
// import rehypeKatexPlugin from 'rehype-katex';
import "github-markdown-css/github-markdown-light.css";
import { SpecialComponents } from "react-markdown/lib/ast-to-react";
import { NormalComponents } from "react-markdown/lib/complex-types";
import rehypeMathJaxSvg from "rehype-mathjax";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMathPlugin from "remark-math";
import { Hyperlink, SmallIconButton } from "@fi-sci/misc";
import { CopyAll } from "@mui/icons-material";

type Props = {
  source: string;
  onSpecialLinkClick?: (link: string) => void;
};

const Markdown: FunctionComponent<Props> = ({ source, onSpecialLinkClick }) => {
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
      // div: ({node, className, children, ...props}) => {
      // 	if (className === 'figurl-figure') {
      // 		if (internalFigureMode) {
      // 			return (
      // 				<InternalFigurlFigure
      // 					src={(props as any).src}
      // 					height={(props as any).height}
      // 				/>
      // 			)
      // 		}
      // 		else {
      // 			return (
      // 				<ExternalFigurlFigure
      // 					src={(props as any).src}
      // 					height={(props as any).height}
      // 				/>
      // 			)
      // 		}
      // 	}
      // 	else {
      // 		return <div className={className} {...props}>{children}</div>
      // 	}
      // },
      a: ({ node, children, href, ...props }) => {
        console.log("- href: ", href);
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
      // }
    }),
    [],
  );
  return (
    <div className="markdown-body" style={{ fontSize: 16 }}>
      <ReactMarkdown
        // eslint-disable-next-line react/no-children-prop
        children={source}
        remarkPlugins={[remarkGfm, remarkMathPlugin]}
        rehypePlugins={[rehypeRaw, rehypeMathJaxSvg /*, rehypeKatexPlugin*/]}
        components={components}
        linkTarget="_blank"
      />
    </div>
  );
};

export default Markdown;
