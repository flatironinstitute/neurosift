import { describe, expect, it } from "vitest";
import { FrameBlocks } from "./frameBlocks";

// Ten frames of two values each; frame i holds [i, i].
const setup = () => {
  const reads: [number, number][] = [];
  const blocks = new FrameBlocks(
    async (start, end) => {
      reads.push([start, end]);
      const out = new Uint16Array((end - start) * 2);
      for (let i = start; i < end; i++)
        out.fill(i, (i - start) * 2, (i - start + 1) * 2);
      return out;
    },
    2,
    10,
  );
  return { reads, blocks };
};

describe("FrameBlocks", () => {
  it("reads one frame at a time when stepping", async () => {
    const { reads, blocks } = setup();
    expect([...(await blocks.get(3, 1))]).toEqual([3, 3]);
    expect(reads).toEqual([[3, 4]]);
  });

  it("reads a block while playing and the next one behind it", async () => {
    const { reads, blocks } = setup();
    expect([...(await blocks.get(0, 4))]).toEqual([0, 0]);
    expect(reads).toEqual([
      [0, 4],
      [4, 8],
    ]);
    expect([...(await blocks.get(3, 4))]).toEqual([3, 3]);
    expect([...(await blocks.get(5, 4))]).toEqual([5, 5]);
    expect(reads).toEqual([
      [0, 4],
      [4, 8],
      [8, 10],
    ]);
  });

  it("starts over after a jump", async () => {
    const { reads, blocks } = setup();
    await blocks.get(0, 4);
    await blocks.get(9, 1);
    expect(reads[reads.length - 1]).toEqual([9, 10]);
  });
});
