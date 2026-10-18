import {readFileSync, writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {tmpdir} from "node:os";
import {PDFDocument, StandardFonts} from "pdf-lib";
import {buildPrayerQueleaPdf, wrapText, fitText, fitName, MAX_MESSAGE_CHARS} from "../src/lib/prayer-quelea-pdf";

const repoRoot = process.cwd();
const button = readFileSync(resolve(repoRoot, "src/components/admin/PrayerRequestsQueue.tsx"), "utf8");
const route = readFileSync(resolve(repoRoot, "src/app/api/admin/prayer-requests/export-quelea/route.ts"), "utf8");
const lib = readFileSync(resolve(repoRoot, "src/lib/prayer-quelea-pdf.ts"), "utf8");

let ok = true;
const errors: string[] = [];
function check(cond: boolean, msg: string) {
  if (!cond) { ok = false; errors.push(msg); }
}

check(button.includes("exportQueleaPdf"), "Falta llamada a exportQueleaPdf (POST + blob)");
check(button.includes("Exportar PDF para Quelea"), "Falta etiqueta del botón");
const fnStart = button.indexOf("async function exportQueleaPdf");
const fnBody = fnStart >= 0 ? button.slice(fnStart, button.indexOf("\n  }", fnStart)) : "";
check(fnBody.length > 0, "No se pudo aislar exportQueleaPdf");
check(!fnBody.includes("window.open"), "exportQueleaPdf no debe usar window.open");
check(fnBody.includes('method: "POST"'), "exportQueleaPdf debe usar POST");
check(fnBody.includes("createObjectURL") && fnBody.includes("download"), "exportQueleaPdf debe descargar blob");
check(fnBody.includes("no_results"), "exportQueleaPdf debe manejar no_results");

check(route.includes("export async function POST"), "Debe exponer POST");
check(route.includes("hasValidPublicOrigin"), "Falta validación de origen");
check(route.includes("requireMinistryManager"), "Falta autorización del lado servidor");
check(route.includes("no_results"), "Debe responder 400 si no hay resultados");
check(/prisma\.prayerRequest\.findMany/.test(route), "Debe leer con prisma.prayerRequest.findMany");
check(!/prisma\.prayerRequest\.update\b/.test(route), "No debe mutar prisma.prayerRequest");
check(/prisma\.auditLog\.create/.test(route), "Debe conservar auditoría (auditLog.create)");
check(route.includes("buildPrayerQueleaPdf"), "Debe usar el generador de PDF");

check(lib.includes("logo-dark.png"), "Debe usar el logo transparente con letras blancas (logo-dark.png)");
check(!lib.includes("slice(0, 20)"), "No debe truncar líneas a 20");
check(lib.includes("wrapByChars"), "Debe implementar wrap por caracteres");

const samples = [
  {
    name: "María Fernanda López de la Cruz",
    message: "Por favor oren por mi familia y por la recuperación de mi madre que está en el hospital. Gracias.",
    createdAt: "2026-10-15T00:00:00.000Z",
  },
  {
    name: "Juan",
    message: "oremos",
    createdAt: "2026-10-16T00:00:00.000Z",
  },
  {
    name: "Nombre Extremadamente Largo Que Deberia Ajustarse Sin Desbordar La Linea Del Encabezado De La Tarjeta",
    message: "Aleluya ".repeat(80).trim().slice(0, MAX_MESSAGE_CHARS),
    createdAt: "2026-10-17T00:00:00.000Z",
  },
];

const outDir = tmpdir();
writeFileSync(resolve(outDir, "quelea-sample-input.json"), JSON.stringify(samples, null, 2));
const pdfBytes = await buildPrayerQueleaPdf(samples);
writeFileSync(resolve(outDir, "quelea-sample.pdf"), pdfBytes);
console.log(`sample PDF: ${resolve(outDir, "quelea-sample.pdf")}`);

const doc = await PDFDocument.load(pdfBytes);
check(doc.getPageCount() === 3, "Debe generar un solo PDF con 3 páginas (una por petición)");
for (const page of doc.getPages()) {
  const {width, height} = page.getSize();
  check(Math.abs(width / height - 16 / 9) < 0.01, "Cada página debe ser 16:9");
}

const font = await doc.embedFont(StandardFonts.Helvetica);
const usable = 1920 - 160;
for (const sample of samples) {
  const msg = sample.message.slice(0, MAX_MESSAGE_CHARS);
  const fullWrap = wrapText(msg, font, 64, usable);
  check(
    fullWrap.join("").replace(/\s/g, "") === msg.replace(/\s/g, ""),
    "El wrap no debe omitir caracteres de la petición",
  );
  const fit = fitText(msg, font, usable, 1000, 64);
  check(fit.fontSize >= 20, "El tamaño de fuente no debe caer por debajo del mínimo");
  const maxLineWidth = Math.max(...fit.lines.map((l) => font.widthOfTextAtSize(l, fit.fontSize)));
  check(maxLineWidth <= usable + 0.5, "Ninguna línea debe exceder el ancho útil");
  check(
    fit.lines.join("").replace(/\s/g, "") === msg.replace(/\s/g, ""),
    "El ajuste no debe truncar la petición completa",
  );
}

const shortName = fitName(samples[0].name, font, usable - 280);
const longName = fitName(samples[2].name, font, usable - 280);
check(font.widthOfTextAtSize(shortName.text, shortName.fontSize) <= usable - 280, "El nombre corto no debe desbordar");
check(font.widthOfTextAtSize(longName.text, longName.fontSize) <= usable - 280 + 0.5, "El nombre largo no debe desbordar");

const namePropLines = (lib.match(/drawText\(/g) ?? []).length;
check(namePropLines >= 3, "El generador solo debe dibujar name, message y fecha");
check(lib.includes("item.name") && lib.includes("item.message") && lib.includes("item.createdAt"), "El generador solo debe usar name, message y createdAt");
check(
  route.includes("({name: r.name, message: r.message, createdAt: r.createdAt.toISOString()})"),
  "La ruta solo debe mapear name, message y createdAt (sin PII)",
);
check(!/r\.(email|phone|country|countryCode|telegram)/.test(route), "La ruta no debe pasar datos no permitidos al generador");

if (!ok) {
  console.error("✗ verify-prayer-quelea-export FAILED:\n" + errors.map((e) => "- " + e).join("\n"));
  process.exit(1);
}
console.log("✓ verify-prayer-quelea-export OK (3 páginas 16:9, sin truncar, sin desbordes, sin PII)");
