// Counts what the move off MUI and inline styles still has to remove in src/, leaving out src/ui.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const MUI_IMPORT = /(?:\bfrom\s+|\brequire\(\s*|\bimport\(\s*)["']@mui\//;
const INLINE_STYLE = /\bstyle=\{\{/g;
const SX = /\bsx=\{/g;

const LABELS = {
  muiFiles: "Files importing `@mui`",
  inlineStyles: "Inline `style={{}}` blocks",
  sx: "`sx` props",
};

export class MigrationCount {
  static inText(text) {
    return {
      muiFiles: MUI_IMPORT.test(text) ? 1 : 0,
      inlineStyles: text.match(INLINE_STYLE)?.length ?? 0,
      sx: text.match(SX)?.length ?? 0,
    };
  }

  static scan(root) {
    const total = { muiFiles: 0, inlineStyles: 0, sx: 0 };
    for (const entry of readdirSync(root, {
      recursive: true,
      withFileTypes: true,
    })) {
      const path = join(entry.parentPath, entry.name);
      const inside = relative(root, path).split(sep);
      if (!entry.isFile() || !/\.tsx?$/.test(entry.name)) continue;
      if (inside[0] === "ui" || inside.includes("node_modules")) continue;
      const counts = MigrationCount.inText(readFileSync(path, "utf8"));
      for (const key of Object.keys(total)) total[key] += counts[key];
    }
    return total;
  }

  static rose(base, head) {
    return Object.keys(LABELS).filter((key) => head[key] > base[key]);
  }

  static table(base, head) {
    const change = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");
    const rows = Object.entries(LABELS).map(
      ([key, label]) =>
        `| ${label} | ${base[key]} | ${head[key]} | ${change(head[key] - base[key])} |`,
    );
    return [
      "### Moving off MUI and inline styles",
      "",
      "| In `src/`, leaving out `src/ui` | Base | This pull request | Change |",
      "| --- | ---: | ---: | ---: |",
      ...rows,
      "",
    ].join("\n");
  }
}

// node count.mjs <src of this pull request> <src of the base branch>
if (import.meta.url === `file://${process.argv[1]}`) {
  const [headDir, baseDir] = process.argv.slice(2);
  const head = MigrationCount.scan(headDir);
  const base = MigrationCount.scan(baseDir);
  console.log(MigrationCount.table(base, head));
  const rose = MigrationCount.rose(base, head);
  if (rose.length) {
    console.log(
      `These went up: ${rose.map((key) => LABELS[key]).join(", ")}. Use @ui components and CSS classes instead.`,
    );
    process.exitCode = 1;
  }
}
