import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createRequire } from "node:module";
import { Linter } from "eslint";
import { expect, test } from "vitest";

const require = createRequire(import.meta.url);
const nextPlugin = require("@next/eslint-plugin-next");

test("Next's link rule still discovers pages through rootDir globs with the scoped glob override", () => {
  // Relative globs avoid tinyglobby's Windows drive-letter handling.
  const fixture = mkdtempSync(join(process.cwd(), "storm-next-eslint-"));
  try {
    const project = join(fixture, "apps", "website");
    mkdirSync(join(project, "pages"), { recursive: true });
    writeFileSync(join(project, "pages", "about.tsx"), "export default function About() { return null; }");
    const linter = new Linter();
    const rootGlob = relative(process.cwd(), join(fixture, "apps", "*")).replaceAll("\\", "/");
    for (const rootDir of [rootGlob, [rootGlob]]) {
      const messages = linter.verify('const page = <a href="/about">About</a>;', {
        languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: { "@next/next": nextPlugin },
        settings: { next: { rootDir } },
        rules: { "@next/next/no-html-link-for-pages": "error" },
      });
      expect(messages.map(message => message.ruleId)).toEqual(["@next/next/no-html-link-for-pages"]);
      expect(messages[0].message).toContain("/about/");
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
