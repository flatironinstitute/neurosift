import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../Button/Button";
import { highlight } from "./highlight";
import "../base.css";
import "./CodeBlock.css";

const LANGUAGE_NAMES = { python: "Python", shell: "Shell" } as const;
const CONFIRM_TIME = 2000;

type CodeBlockProps = {
  code: string;
  lineNumbers?: boolean;
} & (
  | {
      language: "python" | "shell";
      /** Shown in the header in place of the language, such as the file a script loads. */
      title?: string;
    }
  | {
      /** Without a language the code is plain text, named by its title, such as "JSON" or "Output". */
      language?: undefined;
      title: string;
    }
);

type CopyState = "idle" | "copied" | "failed";

/** Code people copy into their own environment, with a Copy button. A shell's $ prompt is shown but not copied. */
export function CodeBlock({
  code,
  language,
  title,
  lineNumbers = language === "python",
}: CodeBlockProps) {
  const [state, setState] = useState<CopyState>("idle");
  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), CONFIRM_TIME);
    return () => clearTimeout(timer);
  }, [state]);

  const lines = code.split("\n");
  const name = language ? (title ?? LANGUAGE_NAMES[language]) : title;
  const copyText =
    language === "shell"
      ? lines.map((l) => l.replace(/^\$ /, "")).join("\n")
      : code;
  const copy = () =>
    navigator.clipboard.writeText(copyText).then(
      () => setState("copied"),
      () => setState("failed"),
    );

  return (
    <figure className="ns-code-block">
      <div className="ns-code-header">
        <span className="ns-code-name">{name}</span>
        <Button
          size="sm"
          variant="ghost"
          icon={state === "copied" ? "checkmark" : "copy"}
          aria-label={
            state === "copied"
              ? "Copied"
              : language
                ? `Copy ${name} code`
                : `Copy ${name}`
          }
          onClick={copy}
        >
          {state === "copied" ? "Copied" : "Copy"}
        </Button>
        <span role="status" className="ns-visually-hidden">
          {state === "copied"
            ? "Copied"
            : state === "failed"
              ? "Couldn’t copy. Select the code and copy it."
              : ""}
        </span>
      </div>
      <pre className="ns-code-body">
        <code>
          {lines.map((line, index) => (
            <span key={index} className="ns-code-line">
              {lineNumbers && (
                <span className="ns-code-line-number" aria-hidden="true">
                  {index + 1}
                </span>
              )}
              <span className="ns-code-text">
                {(language
                  ? highlight(line, language)
                  : [{ kind: "text", text: line }]
                ).map((token, i) =>
                  token.kind === "text" ? (
                    token.text
                  ) : (
                    <span key={i} className={`ns-code-${token.kind}`}>
                      {token.text}
                    </span>
                  ),
                )}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}

/** A path, function or value inside a sentence. */
export function InlineCode({ children }: { children: ReactNode }) {
  return <code className="ns-inline-code">{children}</code>;
}
