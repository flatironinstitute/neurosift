export type TokenKind = "text" | "keyword" | "string" | "number" | "comment";
export type Token = { kind: TokenKind; text: string };

const PYTHON_KEYWORDS = new Set(
  "and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield".split(
    " ",
  ),
);

// Comments, strings (with prefixes), numbers and words, in that order of precedence.
const PYTHON =
  /(#.*$)|((?:[rRbBuUfF]{1,2})?(?:'(?:[^'\\]|\\.)*'?|"(?:[^"\\]|\\.)*"?))|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_]\w*)/gm;

const python = (line: string): Token[] => {
  const tokens: Token[] = [];
  let at = 0;
  for (const m of line.matchAll(PYTHON)) {
    const [text, comment, string, number, word] = m;
    const kind: TokenKind = comment
      ? "comment"
      : string
        ? "string"
        : number
          ? "number"
          : word && PYTHON_KEYWORDS.has(word)
            ? "keyword"
            : "text";
    if (kind === "text") continue;
    if (m.index > at)
      tokens.push({ kind: "text", text: line.slice(at, m.index) });
    tokens.push({ kind, text });
    at = m.index + text.length;
  }
  if (at < line.length) tokens.push({ kind: "text", text: line.slice(at) });
  return tokens;
};

/** The prompt reads as a comment and the command as a keyword; the rest is plain. */
const shell = (line: string): Token[] => {
  const m = /^(\$ )?(\S+)(.*)$/.exec(line);
  if (!m) return [{ kind: "text", text: line }];
  const [, prompt, command, rest] = m;
  return [
    ...(prompt ? [{ kind: "comment" as const, text: prompt }] : []),
    { kind: "keyword", text: command },
    ...(rest ? [{ kind: "text" as const, text: rest }] : []),
  ];
};

export const highlight = (line: string, language: "python" | "shell") =>
  language === "python" ? python(line) : shell(line);
