import { formatBytes } from "@shared/util/formatBytes";
import type { CatalogItem } from "./catalogFeed";

export const n = (count: number) => count.toLocaleString("en-US");
export const plural = (count: number, word: string) =>
  `${n(count)} ${word}${count === 1 ? "" : "s"}`;

/** A row's one line of facts: subjects, files and size, and matching files in a Contains search. */
export function metaLine(item: CatalogItem): string {
  return [
    item.subjects !== undefined && plural(item.subjects, "subject"),
    item.files !== undefined && plural(item.files, "file"),
    item.size !== undefined && formatBytes(item.size),
    item.matchingFiles !== undefined &&
      (item.matchingFiles === item.files
        ? `all ${n(item.matchingFiles)} files match`
        : `${plural(item.matchingFiles, "file")} match`),
  ]
    .filter(Boolean)
    .join(" · ");
}
