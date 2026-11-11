# Icons

`carbon/` holds the IBM Carbon icons the app uses, as the 32px SVGs from the `@carbon/icons` package (version 11.92.0), with IBM's Apache 2.0 license in `carbon/LICENSE`. The package itself is not a dependency, so nothing runs on install.

`npm run icons` turns these files into `src/ui/Icon/icons.ts`, the path data the `Icon` component draws. To add an icon, copy its SVG from `svg/32/` of the `@carbon/icons` package into `carbon/`, using the Carbon name (`zoom--in.svg`), then run `npm run icons`. Only icons on the Figma Iconography page belong here.
