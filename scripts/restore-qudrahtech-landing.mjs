import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "src/components/landing/QudrahtechLandingPage.tsx");
let c = execSync('git show 4d1b527:"src/app/[locale]/page.tsx"', {
  encoding: "utf8",
  cwd: root,
});

c = c.replace(
  /export default async function LocaleHomePage\([\s\S]*?\) \{\s*const \{ locale \} = await params;/,
  "export async function QudrahtechLandingPage({ locale }: { locale: string }) {",
);
c = c.replaceAll("QudrahTech", "Qudrahtech");
c = c.replace(
  "{settings.isMentorMarketOpen ? (\n          <MentorLandingSection mentorPayoutPercent={settings.mentorPayout} />\n        ) : null}",
  '{settings.isMentorMarketOpen ? (\n          <div id="mentor">\n            <MentorLandingSection mentorPayoutPercent={settings.mentorPayout} />\n          </div>\n        ) : null}',
);

fs.writeFileSync(out, c, "utf8");
console.log("Wrote", out);
