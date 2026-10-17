import {readFileSync} from "node:fs";
import {resolve} from "node:path";

const repoRoot = process.cwd();
const pagePath = resolve(repoRoot, "src/app/page.tsx");
const copyPath = resolve(repoRoot, "src/content/locale-copy.ts");

const page = readFileSync(pagePath, "utf8");
const copy = readFileSync(copyPath, "utf8");

const SQUARE_URL = "https://square.link/u/MRxMQSu3?src=embed";

let ok = true;
const errors: string[] = [];

function check(cond: boolean, msg: string) {
  if (!cond) { ok=false; errors.push(msg); }
}

check(page.includes(SQUARE_URL), "Square URL exacta no encontrada");
check(page.includes('target="_blank"'), 'Falta target="_blank"');
check(page.includes('rel="noopener noreferrer"'), 'Falta rel="noopener noreferrer"');
check(!/window\.open\s*\(/.test(page), "No debe aparecer window.open");
check(!/<iframe\b/i.test(page), "No debe aparecer iframe");
check(!/(sdk|squareup\.js|square\.js)/i.test(page), "No debe aparecer SDK de Square");
check(!/PAYMENTS_ENABLED/i.test(page), "No debe activar PAYMENTS_ENABLED en página pública");
check(!/(apiKey|secret|token|client_id|clientSecret)/i.test(page), "No deben aparecer credenciales");

const required = ["offeringAction","offeringTitle","offeringText","offeringNotice","offeringLabel"];
for (const k of required) check(copy.includes(k), `Falta traducción ${k}`);

check(copy.includes('"Ofrendar"') || /offeringAction[^}]*Ofrendar/.test(copy), "Falta traducción ES: Ofrendar");
check(copy.includes('"Give"') || /offeringAction[^}]*Give/.test(copy), "Falta traducción EN: Give");
check(copy.includes('"Contribuir"') || /offeringAction[^}]*Contribuir/.test(copy), "Falta traducción PT: Contribuir");
check(copy.includes('"헌금하기"') || /offeringAction[^}]*헌금하기/.test(copy), "Falta traducción KO: 헌금하기");
check(copy.includes('"Spenden"') || /offeringAction[^}]*Spenden/.test(copy), "Falta traducción DE: Spenden");

if (!ok) {
  console.error("✗ verify-square-offering FAILED:\n"+errors.map(e=>"- "+e).join("\n"));
  process.exit(1);
}
console.log("✓ verify-square-offering OK");
