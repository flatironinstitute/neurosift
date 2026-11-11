import { TokenSet, type Token } from "../../tokens/build.mjs";
import primitives from "../../tokens/primitives.tokens.json";
import semantic from "../../tokens/semantic.tokens.json";
import dimensions from "../../tokens/dimensions.tokens.json";
import typography from "../../tokens/typography.tokens.json";
import effects from "../../tokens/effects.tokens.json";

export const tokenSet = new TokenSet([
  primitives,
  semantic,
  dimensions,
  typography,
  effects,
]);

const CSS_VALUES = new Map(tokenSet.declarations());

const SCOPE_LABELS: Record<string, string> = {
  "FRAME_FILL SHAPE_FILL": "Fills",
  TEXT_FILL: "Text",
  STROKE_COLOR: "Borders",
  "SHAPE_FILL TEXT_FILL": "Text and icons",
  "SHAPE_FILL STROKE_COLOR": "Plot marks and lines",
  GAP: "Gaps and padding",
  CORNER_RADIUS: "Corners",
  STROKE_FLOAT: "Stroke widths",
  WIDTH_HEIGHT: "Widths and heights",
};

interface Color {
  hex: string;
  alpha?: number;
}

interface Dimension {
  value: number;
  unit: string;
}

interface TypographyValue {
  fontFamily: string;
  fontWeight: number;
  fontSize: Dimension;
  lineHeight: number;
  letterSpacing: Dimension;
}

export interface TextStyle {
  font: string;
  size: string;
  tracking: string;
}

const WEIGHTS: Record<number, string> = {
  400: "Regular",
  500: "Medium",
  600: "SemiBold",
};

export class TokenView {
  constructor(
    readonly path: string,
    readonly token: Token,
  ) {}

  static of(path: string): TokenView {
    const token = tokenSet.tokens.get(path);
    if (!token) throw new Error(`No token ${path}`);
    return new TokenView(path, token);
  }

  get name(): string {
    return this.path.replaceAll(".", "/");
  }

  get cssVar(): string {
    return `var(${TokenSet.cssName(this.path)})`;
  }

  get kebabName(): string {
    return TokenSet.kebabName(this.path);
  }

  get specimenClass(): string {
    return `token-${this.kebabName}`;
  }

  get step(): string {
    return this.path.split(".").at(-1) ?? "";
  }

  get alias(): TokenView | undefined {
    const value = this.token.$value;
    return typeof value === "string" ? TokenView.of(value.slice(1, -1)) : undefined;
  }

  get resolved(): TokenView {
    return this.alias?.resolved ?? this;
  }

  get value(): string {
    const value = this.resolved.token.$value;
    if (this.token.$type === "color") {
      const { hex, alpha } = value as Color;
      return alpha === undefined ? hex.toUpperCase() : `${hex.toUpperCase()} at ${Math.round(alpha * 100)}%`;
    }
    if (this.token.$type === "dimension") {
      const { value: size, unit } = value as Dimension;
      const css = this.cssValue;
      return css.endsWith("rem") ? `${size}${unit} · ${css}` : `${size}${unit}`;
    }
    return String(value);
  }

  get cssValue(): string {
    return CSS_VALUES.get(TokenSet.cssName(this.path)) ?? "";
  }

  get pixels(): number {
    return (this.resolved.token.$value as Dimension).value;
  }

  get textStyle(): TextStyle {
    const { fontFamily, fontWeight, fontSize, lineHeight, letterSpacing } = this
      .token.$value as TypographyValue;
    const family = TokenView.of(fontFamily.slice(1, -1)).token.$value as string[];
    return {
      font: `${family[0].replace("IBM ", "")} ${WEIGHTS[fontWeight]}`,
      size: `${fontSize.value}px / ${Math.round(fontSize.value * lineHeight)}px`,
      tracking: CSS_VALUES.get(`${TokenSet.cssName(this.path)}-letter-spacing`) ?? `${letterSpacing.value}px`,
    };
  }

  get use(): string {
    const scopes = this.token.$extensions?.["com.figma"]?.scopes ?? [];
    return this.token.$description ?? SCOPE_LABELS[scopes.join(" ")] ?? "";
  }
}

export function tokensIn(prefix: string): TokenView[] {
  return [...tokenSet.tokens.keys()]
    .filter((path) => path.startsWith(`${prefix}.`))
    .map((path) => TokenView.of(path));
}

export function countTokens(collection: string, type: string): number {
  return [...tokenSet.tokens.values()].filter(
    (token) =>
      token.$type === type &&
      token.$extensions?.["com.figma"]?.collection === collection,
  ).length;
}

export function bySize(views: TokenView[]): TokenView[] {
  return views.toSorted((a, b) => a.pixels - b.pixels);
}
