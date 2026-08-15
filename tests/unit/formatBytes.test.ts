import { formatBytes } from "@shared/util/formatBytes";
import { describe, expect, it } from "vitest";

describe("formatBytes", () => {
  it("special-cases zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("picks the largest unit that keeps the value >= 1", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1024 ** 2)).toBe("1 MB");
    expect(formatBytes(1024 ** 3)).toBe("1 GB");
    expect(formatBytes(1024 ** 4)).toBe("1 TB");
  });

  it("rounds to at most two decimals and drops trailing zeros", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1234567)).toBe("1.18 MB");
  });
});
