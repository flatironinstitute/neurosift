import { splitFrames } from "./frameStepping";

type Frames<T> = { subarray(a: number, b: number): T; length: number };
type Block<T> = { start: number; end: number; frames: Promise<Map<number, T>> };

/** Reads frames in blocks while playing, with the next block loading behind the one shown. */
export class FrameBlocks<T extends Frames<T>> {
  private blocks: Block<T>[] = [];

  constructor(
    private read: (start: number, end: number) => Promise<T>,
    private frameSize: number,
    private numFrames: number,
  ) {}

  async get(index: number, count: number): Promise<T> {
    let block = this.blocks.find((b) => b.start <= index && index < b.end);
    if (!block) {
      block = this.load(index, count);
      this.blocks = [block];
    }
    this.blocks = this.blocks.filter((b) => b.end > index);
    if (
      count > 1 &&
      block.end < this.numFrames &&
      !this.blocks.some((b) => b.start === block.end)
    )
      this.blocks.push(this.load(block.end, count));
    return (await block.frames).get(index)!;
  }

  private load(start: number, count: number): Block<T> {
    const end = Math.min(start + count, this.numFrames);
    const block: Block<T> = {
      start,
      end,
      frames: this.read(start, end).then((data) =>
        splitFrames(data, start, this.frameSize),
      ),
    };
    block.frames.catch(() => {
      this.blocks = this.blocks.filter((b) => b !== block);
    });
    return block;
  }
}
