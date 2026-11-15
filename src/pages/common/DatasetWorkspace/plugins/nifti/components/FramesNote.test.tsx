// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import FramesNote from "./FramesNote";

afterEach(cleanup);

describe("FramesNote", () => {
  it("says how many 4D frames have loaded and how to load the rest, politely", () => {
    render(<FramesNote loaded={5} total={120} />);
    const note = screen.getByRole("status");
    expect(note.textContent).toBe(
      "Showing the first 5 of 120 frames, since 4D images are slow to load. Click … under the graph to load them all.",
    );
  });

  it("says nothing once every frame has loaded, or for a 3D image", () => {
    const { container } = render(<FramesNote loaded={120} total={120} />);
    expect(container.textContent).toBe("");
    cleanup();
    expect(
      render(<FramesNote loaded={1} total={1} />).container.textContent,
    ).toBe("");
  });
});
