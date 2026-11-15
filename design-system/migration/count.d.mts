export interface Counts {
  muiFiles: number;
  inlineStyles: number;
  sx: number;
}

export declare class MigrationCount {
  static inText(text: string): Counts;
  static scan(root: string): Counts;
  static rose(base: Counts, head: Counts): (keyof Counts)[];
  static table(base: Counts, head: Counts): string;
}
