/**
 * Lazy evaluation of "gen" entries.
 *
 * A gen entry describes many references with templates over integer
 * dimensions, for example chunk i of a raw binary file:
 *
 *   {"key": "data/c/{{i}}/0", "url": "{{u0}}", "offset": "{{12 + i * 256000}}",
 *    "length": "256000", "dimensions": {"i": {"stop": 200000}}}
 *
 * A key is matched against each entry's key pattern when it is requested, and
 * only that entry's offset and length are computed. Templates may use names
 * (dimension variables and "templates" entries) combined with integer
 * arithmetic: + - * // % and parentheses, with Python's meaning for // and %.
 */

export type Dimension =
  | number[]
  | { start?: number; stop: number; step?: number };

export interface GenEntry {
  key: string;
  url: string;
  offset?: string | number;
  length?: string | number;
  dimensions: Record<string, Dimension>;
}

/** A reference into a file: the whole file, or length bytes at offset. */
export type FileRef = [string] | [string, number, number];

type Variables = Record<string, number | string>;

const PLACEHOLDER = /{{\s*(.*?)\s*}}/g;
const TOKEN = /\s*(\d+|[A-Za-z_]\w*|\/\/|[-+*%()])/y;

/** Evaluate a restricted arithmetic expression over named variables. */
export function evaluate(
  expression: string,
  variables: Variables,
): number | string {
  const tokens: string[] = [];
  TOKEN.lastIndex = 0;
  let end = 0;
  for (let m = TOKEN.exec(expression); m; m = TOKEN.exec(expression)) {
    tokens.push(m[1] as string);
    end = TOKEN.lastIndex;
  }
  if (expression.slice(end).trim() !== "") {
    throw new Error(`unsupported gen expression ${JSON.stringify(expression)}`);
  }
  let position = 0;
  const peek = () => tokens[position];
  const fail = (): never => {
    throw new Error(`unsupported gen expression ${JSON.stringify(expression)}`);
  };
  const number = (value: number | string): number =>
    typeof value === "number" ? value : fail();

  function atom(): number | string {
    const token = tokens[position++];
    if (token === undefined) return fail();
    if (token === "(") {
      const value = sum();
      if (tokens[position++] !== ")") fail();
      return value;
    }
    if (token === "-") return -number(atom());
    if (/^\d+$/.test(token)) return Number(token);
    if (/^[A-Za-z_]/.test(token)) {
      const value = variables[token];
      if (value === undefined) {
        throw new Error(
          `unknown name ${JSON.stringify(token)} in gen expression ${JSON.stringify(expression)}`,
        );
      }
      return value;
    }
    return fail();
  }
  function product(): number | string {
    let left = atom();
    while (peek() === "*" || peek() === "//" || peek() === "%") {
      const op = tokens[position++];
      const a = number(left);
      const b = number(atom());
      if (op === "*") left = a * b;
      else if (b === 0)
        throw new Error(
          `division by zero in gen expression ${JSON.stringify(expression)}`,
        );
      else left = op === "//" ? Math.floor(a / b) : a - b * Math.floor(a / b);
    }
    return left;
  }
  function sum(): number | string {
    let left = product();
    while (peek() === "+" || peek() === "-") {
      const op = tokens[position++];
      const a = number(left);
      const b = number(product());
      left = op === "+" ? a + b : a - b;
    }
    return left;
  }
  const value = sum();
  if (position !== tokens.length) fail();
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new Error(
      `gen expression ${JSON.stringify(expression)} gives a value too large to represent exactly`,
    );
  }
  return value;
}

/** Replace each {{ expression }} in a template with its value. */
export function render(template: string, variables: Variables): string {
  return template.replace(PLACEHOLDER, (_, expression: string) =>
    String(evaluate(expression, variables)),
  );
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function contains(dimension: Dimension, value: number): boolean {
  if (Array.isArray(dimension)) return dimension.includes(value);
  const start = dimension.start ?? 0;
  const step = dimension.step ?? 1;
  if (step > 0)
    return (
      value >= start && value < dimension.stop && (value - start) % step === 0
    );
  return (
    step < 0 &&
    value <= start &&
    value > dimension.stop &&
    (start - value) % -step === 0
  );
}

/** One gen entry, answering lookups for the keys it describes. */
export class Generator {
  /** The key text before the first placeholder. */
  readonly staticPrefix: string;
  #pattern: RegExp;
  #names: string[] = [];

  constructor(
    readonly entry: GenEntry,
    readonly templates: Record<string, string> = {},
  ) {
    // The key template may only substitute plain names, so it can be inverted
    let pattern = "";
    let last = 0;
    for (const m of entry.key.matchAll(PLACEHOLDER)) {
      pattern += escapeRegExp(entry.key.slice(last, m.index));
      const name = m[1] as string;
      if (name in entry.dimensions) {
        pattern += "(-?\\d+)";
        this.#names.push(name);
      } else if (name in templates) {
        pattern += escapeRegExp(templates[name] as string);
      } else {
        throw new Error(
          `gen key ${JSON.stringify(entry.key)} may only use dimension or template names`,
        );
      }
      last = m.index + m[0].length;
    }
    pattern += escapeRegExp(entry.key.slice(last));
    this.#pattern = new RegExp(`^${pattern}$`);
    this.staticPrefix = entry.key.split(/{{/)[0] as string;
  }

  /** The reference for key, or undefined if this entry does not describe it. */
  lookup(key: string): FileRef | undefined {
    const m = this.#pattern.exec(key);
    if (!m) return undefined;
    const values: Record<string, number> = {};
    for (const [i, name] of this.#names.entries()) {
      const value = Number(m[i + 1]);
      if (name in values && values[name] !== value) return undefined;
      if (!contains(this.entry.dimensions[name] as Dimension, value))
        return undefined;
      values[name] = value;
    }
    const variables = { ...this.templates, ...values };
    const url = render(this.entry.url, variables);
    if (this.entry.offset === undefined || this.entry.length === undefined)
      return [url];
    return [
      url,
      Number(render(String(this.entry.offset), variables)),
      Number(render(String(this.entry.length), variables)),
    ];
  }
}
