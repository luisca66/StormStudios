import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const here = import.meta.dirname;
const rootDir = path.resolve(here, "..");
const wordDataPath = path.resolve(
  rootDir,
  "referencia",
  "kotlin",
  "com",
  "example",
  "etimologica",
  "data",
  "WordData.kt"
);
const categoryKtPath = path.resolve(
  rootDir,
  "referencia",
  "kotlin",
  "com",
  "example",
  "etimologica",
  "data",
  "model",
  "Category.kt"
);
const outDir = path.resolve(rootDir, "src", "data");

function unescapeKotlinString(raw) {
  let result = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "\\" && i + 1 < raw.length) {
      const next = raw[++i];
      if (next === "n") result += "\n";
      else if (next === "t") result += "\t";
      else if (next === "r") result += "\r";
      else if (next === '"') result += '"';
      else if (next === "\\") result += "\\";
      else if (next === "$") result += "$";
      else if (next === "u" && i + 4 < raw.length) {
        const hex = raw.slice(i + 1, i + 5);
        result += String.fromCharCode(parseInt(hex, 16));
        i += 4;
      } else {
        result += next;
      }
    } else {
      result += ch;
    }
  }
  return result;
}

function parseWords(ktSource) {
  const words = [];
  const wordRegex =
    /Word\(\s*(\d+)\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*(true|false)\s*,\s*(null|true|false)\s*\)/g;

  let match;
  while ((match = wordRegex.exec(ktSource)) !== null) {
    words.push({
      id: Number(match[1]),
      word: unescapeKotlinString(match[2]),
      category: unescapeKotlinString(match[3]),
      definition: unescapeKotlinString(match[4]),
      distractor1: unescapeKotlinString(match[5]),
      distractor2: unescapeKotlinString(match[6]),
      distractor3: unescapeKotlinString(match[7]),
      rootsDisplay: unescapeKotlinString(match[8]),
      etymologyText: unescapeKotlinString(match[9]),
      originNote: unescapeKotlinString(match[10]),
      funFact: unescapeKotlinString(match[11]),
      unlocked: match[12] === "true",
      answeredCorrectly:
        match[13] === "null" ? null : match[13] === "true",
    });
  }
  return words;
}

function parseCategories(ktSource) {
  const categories = [];
  const catRegex =
    /([A-Z_]+)\(\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*(\d+)\s*\)/g;

  let match;
  while ((match = catRegex.exec(ktSource)) !== null) {
    categories.push({
      id: unescapeKotlinString(match[2]),
      displayName: unescapeKotlinString(match[3]),
      description: unescapeKotlinString(match[4]),
      order: Number(match[5]),
    });
  }
  return categories.sort((a, b) => a.order - b.order);
}

const wordKt = readFileSync(wordDataPath, "utf8");
const categoryKt = readFileSync(categoryKtPath, "utf8");

const words = parseWords(wordKt);
const categories = parseCategories(categoryKt);

if (words.length !== 200) {
  throw new Error(`Expected 200 words from WordData.kt, got ${words.length}`);
}
if (categories.length !== 5) {
  throw new Error(`Expected 5 categories from Category.kt, got ${categories.length}`);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(
  path.join(outDir, "words.json"),
  JSON.stringify(words, null, 2) + "\n",
  "utf8"
);
writeFileSync(
  path.join(outDir, "categories.json"),
  JSON.stringify(categories, null, 2) + "\n",
  "utf8"
);

console.log(
  `Extraídas ${words.length} palabras y ${categories.length} categorías en ${outDir}`
);
