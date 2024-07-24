import { useMemo } from "react";
import { inferno, magma, plasma, viridis } from "scale-color-perceptual";
export type ValidColorMap =
  | "inferno"
  | "magma"
  | "plasma"
  | "viridis"
  | "legacy";
export const ValidColorMapNames = [
  "inferno",
  "magma",
  "plasma",
  "viridis",
  "legacy",
];

export type ColorStyleSet8Bit = {
  colorStyles: string[];
  primaryContrastColor: string;
  secondaryContrastColor: string;
};

export const DARK_DOVE_GREY = "rgb(119, 118, 114)";
// Complement colors come from https://www.learnui.design/tools/accessible-color-generator.html
// viridis 0 (#440154) and 255 (#fbe723)
// magma 0 (#000004) and 255 (#fcfbbd)
// inferno 0 (#000004) and 255 (#fafda1)
// plasma 0 (#0d0887) and 255 (#f0f724)
// legacy (#00003c to #FFFF3C)
const ColorScaleContrastColors = {
  //1b8211
  viridis: "#b94f3c",
  magma: "#649d61", //6d70a9
  inferno: "#6667bd",
  plasma: "#009f00", //'#3c90c0', but consider #40cdff or #4597c7
  legacy: "#7361ff",
};

// These, especially, represent compromise, as it's very difficult to find multiple colors with
// good contrast through the entire color scales.
const SecondaryContrastColors = {
  viridis: "#ada8aa", // this is a real compromise, muddy midsection--also consider fire-engine red ff0013
  magma: "#8f0000",
  inferno: "#80d9dc",
  plasma: "#71726c", // could have better contrast with primary...
  legacy: "#ffceb8", // this is also not great for saturation but we probably won't use this scale much anyway
};

// Note: the legacy color scheme for the 2d animation was rgba(168, 70, 168, v/5).

export const useColorMapFunction = (
  colorMap: ValidColorMap,
  colorMapRangeMax: number,
) => {
  const colorMapFunction = useMemo(() => {
    const fn = (v: number | undefined): string => {
      if (v === undefined) return "rgba(0, 0, 0, 0)";
      const v_effective = Math.min(1, v / colorMapRangeMax);
      switch (colorMap) {
        case "inferno":
          return inferno(v_effective);
        case "magma":
          return magma(v_effective);
        case "plasma":
          return plasma(v_effective);
        case "viridis":
          return viridis(v_effective);
        case "legacy":
          // eslint-disable-next-line no-case-declarations
          const proportion = v;
          // eslint-disable-next-line no-case-declarations
          const intensity = Math.max(
            0,
            Math.min(255, Math.floor((255 / colorMapRangeMax) * proportion)),
          );
          return `rgba(${intensity}, ${intensity}, 60, 255)`;
        default:
          throw Error(
            `Unreachable: from switch on colormap type (${colorMap}) in useColorStyles8Bit.`,
          );
      }
    };
    return fn;
  }, [colorMap, colorMapRangeMax]);
  return {
    colorMapFunction,
    primaryContrastColor: ColorScaleContrastColors[colorMap],
    secondaryContrastColor: SecondaryContrastColors[colorMap],
  };
};
