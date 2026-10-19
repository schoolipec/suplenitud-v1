import {readFileSync} from "node:fs";
import {join} from "node:path";
import assert from "node:assert/strict";
import {
  blessingPriorityOverrideThreshold,
  fallbackVerses,
  selectDailyIndex,
  utcEpochDay,
} from "../src/lib/blessing/daily-verse";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

// ---------------------------------------------------------------------------
// 1. Rotacion diaria determinista en UTC (no depende de hora local ni DST)
// ---------------------------------------------------------------------------
const utc = (iso: string) => new Date(iso);

assert.equal(utcEpochDay(utc("2026-10-18T00:00:00Z")), utcEpochDay(utc("2026-10-18T23:59:59Z")));
assert.notEqual(utcEpochDay(utc("2026-10-18T23:59:59Z")), utcEpochDay(utc("2026-10-19T00:00:00Z")));

// Inicio de horario de verano en EE. UU. (2026-03-08) y regreso (2026-11-01).
for (const dstDate of ["2026-03-08", "2026-11-01"]) {
  const before = utcEpochDay(utc(`${dstDate === "2026-03-08" ? "2026-03-07" : "2026-10-31"}T23:59:59Z`));
  const during = utcEpochDay(utc(`${dstDate}T12:00:00Z`));
  assert.equal(during - before, 1, `El dia UTC debe avanzar exactamente 1 en ${dstDate}`);
}

// Cambio de ano.
assert.equal(utcEpochDay(utc("2027-01-01T00:00:00Z")) - utcEpochDay(utc("2026-12-31T23:59:59Z")), 1);

// Siete versiculo: siete dias consecutivos cubren los siete indices una vez.
const week = Array.from({length: 7}, (_, offset) =>
  selectDailyIndex(utc(`2026-10-18T12:00:00Z`), 7) + offset
).map((index) => index % 7);
assert.equal(new Set(week).size, 7, "La semana debe rotar por los siete versiculos sin repetir");

// Mismo dia UTC, misma seleccion; sin elementos devuelve -1.
const sampleDay = utc("2026-10-18T12:00:00Z");
assert.equal(selectDailyIndex(sampleDay, 7), selectDailyIndex(sampleDay, 7));
assert.equal(selectDailyIndex(sampleDay, 0), -1);

// ---------------------------------------------------------------------------
// 2. Umbral de prioridad documentado y fallbacks localizados
// ---------------------------------------------------------------------------
assert.equal(blessingPriorityOverrideThreshold, 50);
for (const locale of ["en", "es", "pt", "ko", "de"]) {
  const fallback = fallbackVerses[locale];
  assert.ok(fallback?.body, `Falta el fallback de ${locale}`);
  assert.ok(fallback?.title, `Falta el titulo del fallback de ${locale}`);
  assert.ok(fallback?.reference, `Falta la referencia del fallback de ${locale}`);
}

// ---------------------------------------------------------------------------
// 3. Ruta API: usa la rotacion UTC, el umbral y el fallback sin error 500
// ---------------------------------------------------------------------------
const routeSource = read("src/app/api/blessing-message/route.ts");
assert.match(routeSource, /import \{[^}]*selectDailyIndex[^}]*\} from "@\/lib\/blessing\/daily-verse"/);
assert.match(routeSource, /priority: \{gt: blessingPriorityOverrideThreshold\}/);
assert.doesNotMatch(routeSource, /new Date\(now\.getFullYear\(\), 0, 0\)/, "No debe calcular el dia con hora local");
assert.doesNotMatch(routeSource, /getDay\(\)/, "No debe usar el dia local de la semana");
assert.match(routeSource, /const fallback = fallbackVerses\[locale\] \?\? fallbackVerses\.en/);
assert.match(routeSource, /catch \{[\s\S]*?return NextResponse\.json\(fallback\)/, "Los errores deben devolver el fallback, no 500");
assert.match(routeSource, /supportedLocales\.includes/);

// ---------------------------------------------------------------------------
// 4. Componente: flujo, orden, idiomas y accesibilidad
// ---------------------------------------------------------------------------
const blessingSource = read("src/components/blessing/BlessingMessageModal.tsx");
assert.match(blessingSource, /const displayDelayMs = 30_000;/);
assert.match(blessingSource, /const disabledKey = "ipec-blessing-messages-disabled";/);
assert.doesNotMatch(blessingSource, /30000/, "El retardo debe declararse como constante explicita");

// Cierre: el opt-out explícito es la única preferencia persistente.
assert.match(blessingSource, /if \(optOut\) writeStorage\(disabledKey, "true"\)/);
assert.match(blessingSource, /readStorage\(disabledKey\) === "true"/);
assert.doesNotMatch(blessingSource, /lastClosed|redisplayDelay/);
assert.match(blessingSource, /blessingPreview/);

// La explicacion de opt-out solo se muestra con el checkbox marcado.
assert.match(blessingSource, /\{optOut \? \([\s\S]*?blessing-opt-out-notice[\s\S]*?\) : null\}/);
assert.match(blessingSource, /aria-describedby=\{optOut \? noticeId : undefined\}/);
assert.match(blessingSource, /useId\(\)/);

// Sin texto ni aria-label fijo en espanol; sin emojis decorativos.
assert.doesNotMatch(blessingSource, /aria-label="[^"]*"/, "No debe haber aria-label literal sin localizar");
assert.doesNotMatch(blessingSource, /Biblia abierta/i);
assert.doesNotMatch(blessingSource, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2726}\u{2766}]/u, "Sin emojis/dingbats decorativos");

// Se conserva Radix Dialog via Modal, con cierre explicito.
assert.match(blessingSource, /from "@\/components\/ui\/Modal"/);
assert.match(blessingSource, /closeLabel=\{t\.closeLabel\}/);
assert.match(blessingSource, /className="bible-amen-button"/);

// Orden comprensible: titulo, versiculo, checkbox, explicacion condicional, cierre.
const verseIndex = blessingSource.indexOf("{message.body}");
const checkboxIndex = blessingSource.indexOf('type="checkbox"');
const noticeIndex = blessingSource.indexOf('id={noticeId}');
const closeIndex = blessingSource.indexOf('className="bible-amen-button"');
assert.ok(verseIndex > 0 && verseIndex < checkboxIndex, "El versiculo debe preceder al checkbox");
assert.ok(checkboxIndex < noticeIndex, "La explicacion debe ir despues del checkbox");
assert.ok(noticeIndex < closeIndex, "El cierre debe ser la ultima accion");

// Limpieza al desmontar y reintento seguro.
assert.match(blessingSource, /controller\.abort\(\)/);
assert.match(blessingSource, /window\.clearTimeout\(timer\)/);
// El acceso al almacenamiento esta encapsulado para tolerar navegadores que lo bloquean.
assert.match(blessingSource, /function readStorage\(key: string\): string \| null \{[\s\S]*?try \{[\s\S]*?window\.localStorage\.getItem/);
assert.match(blessingSource, /function writeStorage\(key: string, value: string\) \{[\s\S]*?try \{[\s\S]*?window\.localStorage\.setItem/);
assert.equal((blessingSource.match(/window\.localStorage\./g) ?? []).length, 2, "Todo acceso directo al almacenamiento debe vivir en los helpers");

// Cobertura de idiomas: cada locale define todo el copy.
const localeBlock = (locale: string) => {
  const start = blessingSource.indexOf(`${locale}: {`);
  assert.ok(start >= 0, `Falta el bloque de idioma ${locale}`);
  const end = blessingSource.indexOf("\n  }", start);
  return blessingSource.slice(start, end);
};
for (const locale of ["en", "es", "pt", "ko", "de"]) {
  const block = localeBlock(locale);
  for (const key of ["closeLabel", "disable", "notice", "churchHeader", "verseBadge", "devotional", "amen"]) {
    assert.match(block, new RegExp(`${key}: "`), `El idioma ${locale} no define ${key}`);
  }
}
const copyFallback = blessingSource.match(/copy\[locale as keyof typeof copy\] \?\? copy\.en/);
assert.ok(copyFallback, "El locale desconocido debe caer a ingles");

// ---------------------------------------------------------------------------
// 5. Modal base conserva Radix (foco, Escape, overlay)
// ---------------------------------------------------------------------------
const modalSource = read("src/components/ui/Modal.tsx");
assert.match(modalSource, /@radix-ui\/react-dialog/);
assert.match(modalSource, /Dialog\.Root/);
assert.match(modalSource, /Dialog\.Overlay/);
assert.match(modalSource, /Dialog\.Content/);
assert.match(modalSource, /Dialog\.Title/);
assert.match(modalSource, /Dialog\.Close/);
assert.match(modalSource, /contentClassName\?: string/);
assert.match(modalSource, /overlayClassName\?: string/);

// ---------------------------------------------------------------------------
// 6. CSS: movimiento reducido, responsive sin recortes y contraste del checkbox
// ---------------------------------------------------------------------------
const cssSource = read("src/app/globals.css");
assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.bible-container, \.bible-ribbon \{[\s\S]*?animation: none;[\s\S]*?transform: none;/);
assert.match(cssSource, /\.modal-content\.modal-bible/);
assert.match(cssSource, /@media \(max-width: 760px\) \{[\s\S]*?\.modal-content\.modal-bible \{[\s\S]*?top: 1rem;[\s\S]*?bottom: 1rem;[\s\S]*?overflow: hidden;/);
assert.match(cssSource, /@media \(max-width: 760px\) \{[\s\S]*?\.modal-bible \.bible-pages \{\s*grid-template-columns: 1fr;/);
assert.match(cssSource, /\.bible-pages \{[\s\S]*?overflow-y: auto;/);
assert.match(cssSource, /\.modal-bible \.bible-word-title \{[\s\S]*?color: #1a1612;/, "El titulo debe vencer la especificidad de .modal-body h3");
assert.match(cssSource, /\.bible-opt-out input \{[\s\S]*?border-color: #7a5b22;/);
assert.match(cssSource, /\.bible-amen-button:focus-visible \{[\s\S]*?outline: 3px solid/);
assert.doesNotMatch(cssSource, /\.bible-sacred-symbol|\.bible-book-icon|\.bible-ornament-leaf/, "Quedan estilos de glifos decorativos sin uso");

// ---------------------------------------------------------------------------
// 7. Seed: siete versiculos idempotentes por debajo o igual al umbral
// ---------------------------------------------------------------------------
const seedSource = read("prisma/seed.sql");
const priorities = [...seedSource.matchAll(/VALUES \('[^']+', true, (\d+),/g)].map((match) => Number(match[1]));
assert.equal(priorities.length, 7, "El seed debe declarar exactamente siete mensajes");
for (const priority of priorities) {
  assert.ok(priority <= blessingPriorityOverrideThreshold, "Ningun mensaje del seed debe superar el umbral de prioridad");
}
assert.equal((seedSource.match(/ON CONFLICT \("id"\) DO UPDATE/g) ?? []).length, 7);
assert.equal((seedSource.match(/ON CONFLICT \("message_id", "locale"\) DO UPDATE/g) ?? []).length, 7);
for (const locale of ["en", "es", "pt", "ko", "de"]) {
  assert.equal((seedSource.match(new RegExp(`, '${locale}', `, "g")) ?? []).length, 7, `Faltan versiculos en ${locale}`);
}
for (const reference of ["Salmo 145:18", "Jeremías 29:11", "Filipenses 4:6-7", "Isaías 40:31", "Salmo 23:1-2", "Josué 1:9", "Romanos 8:28"]) {
  assert.ok(seedSource.includes(reference), `Falta el versiculo ${reference}`);
}

// ---------------------------------------------------------------------------
// 8. Script npm de seed explicito y sin secretos
// ---------------------------------------------------------------------------
const packageSource = read("package.json");
assert.match(packageSource, /"seed:blessing-messages": "tsx scripts\/seed-blessing-messages\.mts"/);
const seedScriptSource = read("scripts/seed-blessing-messages.mts");
assert.match(seedScriptSource, /--confirm/);
assert.match(seedScriptSource, /process\.env\.DATABASE_URL/);
assert.match(seedScriptSource, /prisma\/seed\.sql/);
assert.doesNotMatch(seedScriptSource, /(72900968|CecyJuan)/, "No debe incluir credenciales reales");
assert.match(seedScriptSource, /BEGIN/);
assert.match(seedScriptSource, /COMMIT/);
assert.match(seedScriptSource, /ROLLBACK/);

console.log("verify-bible-blessing-modal: rotacion UTC, umbral, idiomas, flujo, accesibilidad, responsive y seed verificados.");
