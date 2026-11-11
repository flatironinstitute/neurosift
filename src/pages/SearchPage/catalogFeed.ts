export type Archive = "DANDI" | "EMBER" | "OpenNeuro";

export type CatalogItem = {
  archive: Archive;
  id: string;
  title: string;
  /** The dataset page in Neurosift, under the app's base. */
  path: string;
  created?: string;
  modified?: string;
  subjects?: number;
  files?: number;
  size?: number;
  /** Data types or modalities, shown as tags. */
  types?: string[];
  /** Files holding every picked type, in a Contains search. */
  matchingFiles?: number;
  status?: "Embargoed" | "Draft" | "Private";
};

export type Page = { items: CatalogItem[]; total: number; done: boolean };

/** One archive's results, a page at a time. */
export interface Source {
  archive: Archive;
  next: () => Promise<Page>;
}

export type Order = "best" | "modified" | "newest";

type Lane = {
  source: Source;
  buffer: CatalogItem[];
  done: boolean;
  total?: number;
  error?: unknown;
};

const dateOf = (item: CatalogItem, order: Order) =>
  (order === "newest" ? item.created : item.modified) ?? "";

/** Merges several archives' pages into one list: by date, or taking turns for best match. */
export class CatalogFeed {
  private lanes: Lane[];
  private turn = 0;
  private seen = new Set<string>();

  constructor(
    sources: Source[],
    private order: Order,
  ) {
    this.lanes = sources.map((source) => ({ source, buffer: [], done: false }));
  }

  /** Each archive's total, once its first page has arrived. */
  totals(): Partial<Record<Archive, number>> {
    const totals: Partial<Record<Archive, number>> = {};
    for (const lane of this.lanes)
      if (lane.total !== undefined)
        totals[lane.source.archive] =
          (totals[lane.source.archive] ?? 0) + lane.total;
    return totals;
  }

  failed(): Archive[] {
    return [
      ...new Set(
        this.lanes.filter((l) => l.error).map((l) => l.source.archive),
      ),
    ];
  }

  exhausted(): boolean {
    return this.lanes.every((l) => l.done && l.buffer.length === 0);
  }

  private async fill() {
    await Promise.all(
      this.lanes
        .filter((lane) => lane.buffer.length === 0 && !lane.done)
        .map(async (lane) => {
          try {
            const page = await lane.source.next();
            lane.total ??= page.total;
            lane.buffer.push(...page.items);
            lane.done = page.done || page.items.length === 0;
          } catch (error) {
            lane.error = error;
            lane.done = true;
          }
        }),
    );
  }

  private pick(): CatalogItem | undefined {
    const ready = this.lanes.filter((l) => l.buffer.length > 0);
    if (ready.length === 0) return undefined;
    let lane: Lane;
    if (this.order === "best") {
      const open = this.lanes.filter((l) => l.buffer.length > 0);
      lane = open[this.turn % open.length];
      this.turn += 1;
    } else {
      lane = ready.reduce((a, b) =>
        dateOf(b.buffer[0], this.order) > dateOf(a.buffer[0], this.order)
          ? b
          : a,
      );
    }
    return lane.buffer.shift();
  }

  /** The next n items, reading more pages as the merge needs them. */
  async more(n: number): Promise<CatalogItem[]> {
    const out: CatalogItem[] = [];
    while (out.length < n) {
      // Every unfinished archive needs a next item before the merge can choose.
      await this.fill();
      const item = this.pick();
      if (!item) break;
      const key = `${item.archive}:${item.id}`;
      if (this.seen.has(key)) continue;
      this.seen.add(key);
      out.push(item);
    }
    return out;
  }
}
