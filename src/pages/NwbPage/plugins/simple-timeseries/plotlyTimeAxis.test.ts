// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { panRange, plotInsets } from "./plotlyTimeAxis";

describe("plotInsets", () => {
  it("reads the margins around the data area from Plotly's drawn layout", () => {
    const graph = document.createElement("div") as HTMLElement & {
      _fullLayout?: unknown;
    };
    graph._fullLayout = {
      width: 700,
      height: 350,
      xaxis: { _offset: 50, _length: 560 },
      yaxis: { _offset: 20, _length: 280 },
    };
    expect(plotInsets(graph)).toEqual({
      left: 50,
      right: 90,
      top: 20,
      bottom: 50,
    });
  });

  it("is undefined before Plotly has drawn", () => {
    expect(plotInsets(document.createElement("div"))).toBeUndefined();
  });
});

describe("panRange", () => {
  it("reads a pan's new time range in either of Plotly's forms", () => {
    expect(panRange({ "xaxis.range[0]": 2, "xaxis.range[1]": 5 })).toEqual([
      2, 5,
    ]);
    expect(panRange({ "xaxis.range": [2, 5] })).toEqual([2, 5]);
  });

  it("ignores relayouts that don't move the time axis", () => {
    expect(panRange({ "yaxis.range[0]": 0 })).toBeUndefined();
    expect(panRange({ "xaxis.autorange": true })).toBeUndefined();
  });
});
