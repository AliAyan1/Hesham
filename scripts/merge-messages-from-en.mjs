/**
 * Fills missing keys in locale JSON files using English as the source of truth.
 * Existing translations in target locales are preserved.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "..", "messages");

function deepMergeFill(enTree, localeTree) {
  if (localeTree === undefined || localeTree === null) {
    return structuredClone(enTree);
  }
  if (typeof enTree !== "object" || enTree === null || Array.isArray(enTree)) {
    return localeTree;
  }
  if (typeof localeTree !== "object" || localeTree === null || Array.isArray(localeTree)) {
    return localeTree;
  }

  const out = { ...localeTree };
  for (const key of Object.keys(enTree)) {
    if (!(key in out)) {
      out[key] = structuredClone(enTree[key]);
    } else if (
      enTree[key] !== null &&
      typeof enTree[key] === "object" &&
      !Array.isArray(enTree[key]) &&
      out[key] !== null &&
      typeof out[key] === "object" &&
      !Array.isArray(out[key])
    ) {
      out[key] = deepMergeFill(enTree[key], out[key]);
    }
  }
  return out;
}

const enPath = path.join(messagesDir, "en.json");
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));

for (const file of ["ar.json", "es.json", "fr.json", "tr.json", "ur.json"]) {
  const p = path.join(messagesDir, file);
  const cur = JSON.parse(fs.readFileSync(p, "utf8"));
  const merged = deepMergeFill(en, cur);
  fs.writeFileSync(p, `${JSON.stringify(merged, null, 2)}\n`);
}

console.log("Merged missing keys from en.json into ar, es, fr, tr, ur.");
