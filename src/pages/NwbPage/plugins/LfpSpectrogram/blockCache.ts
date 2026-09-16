import { SpectrogramResult } from "./WorkerTypes";

// Computed blocks are shared across every data client in a view and keyed by
// channels + compute config + block range, so flipping a setting back to a
// value that was already computed is instant instead of re-running the worker.
const MAX_BLOCKS = 12;
// Also bound total memory: a block is numWindows * numFreqs doubles, which for
// a large window size is tens of MB on its own.
const MAX_VALUES = 6_000_000;

export class SpectrogramBlockCache {
  private entries = new Map<string, SpectrogramResult>();
  private values = 0;

  get(key: string): SpectrogramResult | undefined {
    const hit = this.entries.get(key);
    if (!hit) return undefined;
    // Refresh LRU order.
    this.entries.delete(key);
    this.entries.set(key, hit);
    return hit;
  }

  set(key: string, result: SpectrogramResult) {
    const existing = this.entries.get(key);
    if (existing) {
      this.entries.delete(key);
      this.values -= existing.powers.length;
    }
    this.entries.set(key, result);
    this.values += result.powers.length;
    while (
      this.entries.size > 1 &&
      (this.entries.size > MAX_BLOCKS || this.values > MAX_VALUES)
    ) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      const evicted = this.entries.get(oldest);
      this.entries.delete(oldest);
      if (evicted) this.values -= evicted.powers.length;
    }
  }
}

export default SpectrogramBlockCache;
