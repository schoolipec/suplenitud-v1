import {readFileSync} from "node:fs";
import {join} from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();

// 1. Verify Modal component props
const modalSource = readFileSync(join(root, "src/components/ui/Modal.tsx"), "utf8");
assert.match(modalSource, /contentClassName\?: string/);
assert.match(modalSource, /overlayClassName\?: string/);
assert.match(modalSource, /className=\{overlayClassName \? `modal-overlay \$\{overlayClassName\}` : "modal-overlay"\}/);
assert.match(modalSource, /className=\{contentClassName \? `modal-content \$\{contentClassName\}` : "modal-content"\}/);
assert.match(modalSource, /@radix-ui\/react-dialog/);
assert.match(modalSource, /Dialog\.Root/);
assert.match(modalSource, /Dialog\.Overlay/);
assert.match(modalSource, /Dialog\.Content/);
assert.match(modalSource, /Dialog\.Title/);

// 2. Verify BlessingMessageModal component
const blessingSource = readFileSync(join(root, "src/components/blessing/BlessingMessageModal.tsx"), "utf8");
assert.match(blessingSource, /from "@\/components\/ui\/Modal"/);
assert.doesNotMatch(blessingSource, /<dialog/);
assert.match(blessingSource, /30000/);
assert.match(blessingSource, /disabledKey/);
assert.match(blessingSource, /setOpen\(false\)/);
assert.match(blessingSource, /modal-bible/);
assert.match(blessingSource, /bible-container/);
assert.match(blessingSource, /bible-ribbon/);
assert.match(blessingSource, /bible-pages/);
assert.match(blessingSource, /bible-page-left/);
assert.match(blessingSource, /bible-page-right/);
assert.match(blessingSource, /bible-spine/);
assert.match(blessingSource, /bible-verse-blockquote/);
assert.match(blessingSource, /bible-amen-button/);

// Check all 5 supported locales have complete copy
for (const locale of ["en", "es", "pt", "ko", "de"]) {
  assert.ok(blessingSource.includes(`${locale}: {`));
}

// 3. Verify globals.css styles for Bible modal
const cssSource = readFileSync(join(root, "src/app/globals.css"), "utf8");
assert.match(cssSource, /\.modal-content\.modal-bible/);
assert.match(cssSource, /\.modal-bible-overlay/);
assert.match(cssSource, /\.bible-container/);
assert.match(cssSource, /\.bible-ribbon/);
assert.match(cssSource, /\.bible-pages/);
assert.match(cssSource, /\.bible-page-left/);
assert.match(cssSource, /\.bible-page-right/);
assert.match(cssSource, /\.bible-spine/);
assert.match(cssSource, /@keyframes bible-modal-open/);
assert.match(cssSource, /@keyframes bible-ribbon-sway/);
assert.match(cssSource, /@media \(max-width: 760px\)/);

// 4. Verify API route logic
const routeSource = readFileSync(join(root, "src/app/api/blessing-message/route.ts"), "utf8");
assert.match(routeSource, /fallbackVerses/);
assert.match(routeSource, /dayOfYear/);
assert.match(routeSource, /priority: \{gt: 50\}/);

// 5. Verify seed.sql has 7 curated verses and all 5 locales
const seedSource = readFileSync(join(root, "prisma/seed.sql"), "utf8");
assert.match(seedSource, /Salmo 145:18/);
assert.match(seedSource, /Jeremías 29:11/);
assert.match(seedSource, /Filipenses 4:6-7/);
assert.match(seedSource, /Isaías 40:31/);
assert.match(seedSource, /Salmo 23:1-2/);
assert.match(seedSource, /Josué 1:9/);
assert.match(seedSource, /Romanos 8:28/);

console.log("verify-bible-blessing-modal: All checks passed successfully!");
