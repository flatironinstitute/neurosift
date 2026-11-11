export interface IconPath {
  d: string;
  evenOdd?: boolean;
}

export declare const SOURCE: URL;
export declare const OUTPUT: URL;

export declare class IconSource {
  static parse(name: string, svg: string): IconPath[];
  static module(icons: Record<string, IconPath[]>): string;
  static load(dir: URL): Record<string, IconPath[]>;
}
