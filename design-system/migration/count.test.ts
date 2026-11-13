import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MigrationCount } from "./count.mjs";

// Writes a small src/ tree and returns its path.
const tree = (files: Record<string, string>) => {
  const root = mkdtempSync(join(tmpdir(), "migration-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
};

describe("MigrationCount", () => {
  it("counts MUI imports per file, and inline style and sx blocks per use", () => {
    expect(
      MigrationCount.inText(`import Box from "@mui/material/Box";
import { Search } from '@mui/icons-material';
<Box sx={{ p: 1 }} style={{ color: "red" }} />
<div style={{ margin: 0 }} />
<Box sx={styles.box} />`),
    ).toEqual({ muiFiles: 1, inlineStyles: 2, sx: 2 });
  });

  it("ignores style props that aren't object literals, and other packages", () => {
    expect(
      MigrationCount.inText(`import { useState } from "react";
<div style={panelStyle} className="x" />`),
    ).toEqual({ muiFiles: 0, inlineStyles: 0, sx: 0 });
  });

  it("scans .ts and .tsx files under src, leaving out src/ui and other file types", () => {
    const root = tree({
      "pages/A.tsx": `import x from "@mui/material"; <div style={{}} />`,
      "pages/b.ts": `const s = <Box sx={{}} />;`,
      "ui/Button/Button.tsx": `<div style={{}} />`,
      "vendor/bundle.js": `require("@mui/material"); style={{}}`,
      "pages/notes.md": `style={{}}`,
    });
    expect(MigrationCount.scan(root)).toEqual({
      muiFiles: 1,
      inlineStyles: 1,
      sx: 1,
    });
  });

  it("reports the change against the base and fails when any count rises", () => {
    const base = { muiFiles: 44, inlineStyles: 737, sx: 221 };
    const fewer = { muiFiles: 43, inlineStyles: 730, sx: 221 };
    const more = { muiFiles: 44, inlineStyles: 738, sx: 220 };
    expect(MigrationCount.rose(base, fewer)).toEqual([]);
    expect(MigrationCount.rose(base, more)).toEqual(["inlineStyles"]);
  });

  it("writes a table with each count, its base and the change", () => {
    const table = MigrationCount.table(
      { muiFiles: 44, inlineStyles: 737, sx: 221 },
      { muiFiles: 43, inlineStyles: 738, sx: 221 },
    );
    expect(table).toContain("| Files importing `@mui` | 44 | 43 | −1 |");
    expect(table).toContain("| Inline `style={{}}` blocks | 737 | 738 | +1 |");
    expect(table).toContain("| `sx` props | 221 | 221 | 0 |");
  });
});
