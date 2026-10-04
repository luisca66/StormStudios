import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { Linter } from "eslint";
import { expect, test } from "vitest";

const require = createRequire(import.meta.url);
const nextPlugin = require("@next/eslint-plugin-next");

test("Next's link rule still discovers pages through rootDir globs with the scoped glob override", () => {
  const fixture = mkdtempSync(join(tmpdir(), "storm-next-eslint-"));
  try {
    const project = join(fixture, "apps", "website");
    mkdirSync(join(project, "pages"), { recursive: true });
    writeFileSync(join(project, "pages", "about.tsx"), "export default function About() { return null; }");
    const linter = new Linter();
    for (const rootDir of [join(fixture, "apps", "*"), [join(fixture, "apps", "*")]]) {
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
