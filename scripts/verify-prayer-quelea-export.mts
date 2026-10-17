import {readFileSync} from "node:fs";
import {resolve} from "node:path";

const repoRoot = process.cwd();
const buttonPath = resolve(repoRoot, "src/components/admin/PrayerRequestsQueue.tsx");
const routePath = resolve(repoRoot, "src/app/api/admin/prayer-requests/export-quelea/route.ts");

const button = readFileSync(buttonPath, "utf8");
const route = readFileSync(routePath, "utf8");

let ok = true;
const errors: string[] = [];
function check(cond: boolean, msg: string) {
  if (!cond) { ok=false; errors.push(msg); }
}

check(button.includes("export-quelea"), "Falta botón que use la ruta export-quelea");
check(button.includes("Exportar PDF para Quelea"), "Falta etiqueta del botón");
check(route.includes("hasValidPublicOrigin"), "Falta validación de origen");
check(route.includes("requireMinistryManager"), "Falta autorización del lado servidor");
check(route.includes("no_results"), "Debe responder 400 si no hay resultados");
check(!/(update\(|updateMany|findOneAndUpdate|findByIdAndUpdate)/.test(route), "No debe mutar estados");
check(route.includes("logo-transparent.png"), "Debe usar logo transparente");
check(route.includes("pdf-lib"), "Debe usar pdf-lib");

if (!ok) {
  console.error("✗ verify-prayer-quelea-export FAILED:\n"+errors.map(e=>"- "+e).join("\n"));
  process.exit(1);
}
console.log("✓ verify-prayer-quelea-export OK");
