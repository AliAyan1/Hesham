import fs from "node:fs";
const file = process.argv[2] ?? ".tmp-root.html";
const h = fs.readFileSync(file, "utf8");
console.log("file:", file);
const patterns = [
  /property="og:title" content="([^"]+)"/,
  /property="og:description" content="([^"]+)"/,
  /property="og:site_name" content="([^"]+)"/,
  /name="description" content="([^"]+)"/,
  /<title>([^<]+)<\/title>/,
];
for (const re of patterns) {
  const m = h.match(re);
  console.log(re.source.slice(0, 30), "=>", m?.[1] ?? "(missing)");
}
console.log("Qudrahtech in HTML:", h.includes("Qudrahtech"));
console.log("Basalim in HTML:", h.includes("Basalim"));
