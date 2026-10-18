import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {isLocalMediaUrl, renderSafeHtml, validateDocument} from "../src/lib/content-document";

const root = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const uuid = "11111111-2222-4333-8444-555555555555";
const markup = `![Church gathering](/media/${uuid})`;

assert.equal(isLocalMediaUrl(`/media/${uuid}`), true);
for (const value of ["https://example.com/x.png", "data:image/png;base64,a", "/media/../secret", "/media/not-a-uuid"]) assert.equal(isLocalMediaUrl(value), false);
assert.equal(validateDocument(markup).ok, true);
assert.equal(validateDocument("![](/media/11111111-2222-4333-8444-555555555555)").ok, false);
assert.equal(validateDocument("![x](https://example.com/x.png)").ok, false);
assert.match(renderSafeHtml(markup), /<img src="\/media\/11111111-2222-4333-8444-555555555555" alt="Church gathering" loading="lazy" \/>/);

const upload = read("src/app/api/admin/media/route.ts");
assert.match(upload, /hasValidPublicOrigin/);
assert.match(upload, /requireMinistryManager/);
assert.match(upload, /MAX_UPLOAD_BYTES/);
assert.match(upload, /normalizeImage/);
assert.match(upload, /randomUUID/);
const delivery = read("src/app/media/[id]/route.ts");
assert.match(delivery, /X-Content-Type-Options.*nosniff/);
assert.match(delivery, /isSafeMediaId/);
assert.match(delivery, /status: 404/);
const image = read("src/lib/media/image.ts");
assert.match(image, /sharp/);
assert.match(image, /webp/);
assert.match(image, /MAX_UPLOAD_BYTES/);
const editor = read("src/components/admin/ContentManager.tsx");
assert.match(editor, /\/api\/admin\/media/);
assert.match(editor, /Alternative text/);
assert.match(editor, /accept="image\/png,image\/jpeg,image\/webp"/);
console.log("verify-cms-media: all checks passed");
