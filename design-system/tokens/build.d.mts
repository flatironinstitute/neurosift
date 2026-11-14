export interface Token {
  $type: string;
  $value: unknown;
  $description?: string;
  $extensions?: {
    "com.figma"?: { collection?: string; scopes?: string[]; style?: string };
  };
}

export declare const TOKEN_FILES: string[];
export declare const OUTPUT: URL;
export declare const SPECIMENS: URL;
export declare const THEMES: string[];
export declare const PLOT_THEMES: Record<string, string>;

export declare class TokenSet {
  tokens: Map<string, Token>;
  themes: Map<string, Map<string, Token>>;
  constructor(trees: object[], themes?: Record<string, object>);
  resolve(path: string, theme?: string): unknown;
  static load(dir: URL): TokenSet;
  static kebabName(path: string): string;
  static cssName(path: string): string;
  css(): string;
  specimenCss(): string;
  declarations(): [string, string][];
}
