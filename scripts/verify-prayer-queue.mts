import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {runInNewContext} from "node:vm";
import ts from "typescript";
import * as queue from "../src/lib/prayer-queue";

const root = join(import.meta.dirname, "..");
let checks = 0;
function check(run: () => void) { run(); checks++; }
const parse = (query: string) => queue.parsePrayerFilters(new URLSearchParams(query));
for (const query of ["status=ASSIGNED", "status=", "country=US", "contactChannel=PHONE", "requestType=PRAYER_ONLY", "hasAvailability=true", "filter=all", "status=NEW&status=CLOSED", "dateFrom=2026-02-30", "dateTo=not-a-date", "dateFrom=2026-03-02&dateTo=2026-03-01", `search=${"x".repeat(201)}`, "search=%00test"]) {
  check(() => assert.equal(parse(query).ok, false, query));
}
check(() => assert.equal(parse("dateFrom=2024-02-29").ok, true));
const parsed = parse("search=%20hope%20&status=NEW&dateFrom=2026-10-01&dateTo=2026-10-16");
assert.ok(parsed.ok);
check(() => assert.deepEqual(queue.prayerQueueWhere(parsed.filters), {
  requestType: "PRAYER_ONLY", status: "NEW",
  OR: [{name: {contains: "hope", mode: "insensitive"}}, {message: {contains: "hope", mode: "insensitive"}}],
  createdAt: {gte: new Date("2026-10-01T00:00:00Z"), lt: new Date("2026-10-17T00:00:00Z")},
}));
check(() => assert.deepEqual(queue.prayerQueueWhere(queue.DEFAULT_PRAYER_FILTERS), {}));
check(() => assert.deepEqual(queue.prayerQueueWhere(queue.DEFAULT_PRAYER_FILTERS, true), {requestType: "PRAYER_ONLY", status: {in: ["NEW", "CLOSED"]}}));
check(() => assert.deepEqual(queue.parsePrayerFilters(queue.prayerFilterParams(parsed.filters)), parsed));
check(() => assert.equal(queue.parsePrayerFilters(queue.prayerPageParams({status: ["NEW", "CLOSED"]})).ok, false));
check(() => assert.deepEqual(Object.keys(queue.PRAYER_QUEUE_SELECT).sort(), ["createdAt", "id", "message", "name", "requestType", "status"]));
for (const requestType of ["PRAYER_ONLY", "PRAYER_AND_CONTACT"]) {
  for (const status of ["NEW", "CLOSED", "PENDING_ASSIGNMENT", "ASSIGNED", "CONTACTED"]) {
    const current = requestType === "PRAYER_ONLY" && ["NEW", "CLOSED"].includes(status);
    check(() => assert.equal(queue.prayerStatusLabel({requestType, status}), current ? status === "NEW" ? "Nueva" : "Presentada" : "Registro histórico"));
    for (const target of ["NEW", "CLOSED"] as const) check(() => assert.equal(queue.canUpdatePrayer({requestType, status}, target), current && status !== target));
  }
}
for (const body of [null, [], "NEW", {}, {status: "ASSIGNED"}, {contactId: "x"}, {status: "NEW", contactId: "x"}, {status: "CLOSED", extra: true}]) {
  check(() => assert.equal(queue.parsePrayerStatusUpdate(body), null));
}
for (const value of ["=1+1", "+cmd", "-1", "@SUM(A1)", "  =1", "\ttext", "\rtext"]) check(() => assert.ok(queue.prayerCsvCell(value).startsWith('"\'')));
check(() => assert.equal(queue.prayerCsvCell('a,"b"\nc'), '"a,""b""\nc"'));

// Execute the real route handlers with deterministic session and database doubles.
// No network, real database, environment secrets or external integrations are used.
const base = {id: "r1", name: "Example", message: "Hope", createdAt: new Date("2026-10-16T23:59:59Z"), requestType: "PRAYER_ONLY", status: "NEW", email: "PRIVATE", phone: "PRIVATE"};
let record = {...base};
let authorized = true;
let validOrigin = true;
let found = true;
let conflict = false;
let auditFails = false;
let queries: Array<Record<string, unknown>> = [];
let audits: Array<unknown> = [];
function project(select: Record<string, boolean>) { return Object.fromEntries(Object.keys(select).map((key) => [key, record[key as keyof typeof record]])); }
const db = {
  prayerRequest: {
    async findMany(args: {select: Record<string, boolean>}) { queries.push(args); return [project(args.select)]; },
    async count(args: Record<string, unknown>) { queries.push(args); return 7; },
    async findUnique(args: {select: Record<string, boolean>}) { queries.push(args); return found ? project(args.select) : null; },
    async updateMany(args: {where: {status: string; requestType: string}; data: {status: string}}) {
      queries.push(args);
      if (conflict || record.status !== args.where.status || record.requestType !== args.where.requestType) return {count: 0};
      record.status = args.data.status;
      return {count: 1};
    },
  },
  auditLog: {async create(args: unknown) { if (auditFails) throw new Error("audit unavailable"); audits.push(args); }},
  async $transaction<T>(run: (tx: unknown) => Promise<T>) {
    const before = {...record};
    try { return await run(db); } catch (error) { record = before; throw error; }
  },
};
type Handler = (request: Request, context?: {params: Promise<{id: string}>}) => Promise<Response>;
function loadRoute(path: string): Record<string, Handler> {
  const source = readFileSync(join(root, path), "utf8");
  const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  const dependencies: Record<string, unknown> = {
    "next/server": {NextResponse: Response},
    "@/lib/access": {requireMinistryManager: async () => authorized ? {id: "admin-test"} : null},
    "@/lib/request-origin": {hasValidPublicOrigin: () => validOrigin},
    "@/lib/db/client": {prisma: db},
    "@/lib/prayer-queue": queue,
  };
  runInNewContext(code, {exports, URL, Date, Promise, require: (name: string) => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`); return dependencies[name];
  }});
  return exports;
}
const list = loadRoute("src/app/api/admin/prayer-requests/route.ts").GET;
const detail = loadRoute("src/app/api/admin/prayer-requests/[id]/route.ts");
const csv = loadRoute("src/app/api/admin/prayer-requests/export/route.ts").GET;
const context = {params: Promise.resolve({id: "r1"})};
const request = (query = "") => new Request(`https://example.test/api/admin/prayer-requests${query}`);
const patch = (body: unknown) => new Request("https://example.test/api/admin/prayer-requests/r1", {method: "PATCH", body: JSON.stringify(body)});
for (const handler of [list, detail.GET, csv, detail.PATCH]) {
  for (const guard of ["auth", "origin"]) {
    authorized = guard !== "auth"; validOrigin = guard !== "origin"; queries = [];
    assert.equal((await handler(patch({status: "CLOSED"}), context)).status, 403);
    assert.equal(queries.length, 0); checks++;
  }
}
authorized = validOrigin = true;
for (const handler of [list, csv]) {
  queries = [];
  assert.equal((await handler(request("?country=US"))).status, 400);
  assert.equal(queries.length, 0); checks++;
}
let response = await list(request("?status=NEW&search=hope&dateTo=2026-10-16"));
assert.equal(response.status, 200);
assert.match(response.headers.get("cache-control")!, /no-store/);
let payload = await response.json();
assert.equal(payload.newCount, 7);
assert.deepEqual(Object.keys(payload.requests[0]).sort(), Object.keys(queue.PRAYER_QUEUE_SELECT).sort());
assert.ok(!JSON.stringify(payload).includes("PRIVATE")); checks++;
response = await detail.GET(request(), context);
assert.ok(!(await response.text()).includes("PRIVATE")); checks++;
for (const body of [{contactId: "x"}, {status: "CLOSED", contactId: "x"}, {status: "ASSIGNED"}, null]) {
  queries = []; assert.equal((await detail.PATCH(patch(body), context)).status, 400); assert.equal(queries.length, 0); checks++;
}
for (const historic of [{requestType: "PRAYER_AND_CONTACT", status: "NEW"}, {requestType: "PRAYER_ONLY", status: "CONTACTED"}]) {
  record = {...base, ...historic}; audits = [];
  assert.equal((await detail.PATCH(patch({status: "CLOSED"}), context)).status, 409);
  assert.equal(audits.length, 0); checks++;
}
record = {...base}; audits = [];
response = await detail.PATCH(patch({status: "CLOSED"}), context);
assert.equal(response.status, 200); payload = await response.json();
assert.equal(payload.request.status, "CLOSED"); assert.ok(!JSON.stringify(payload).includes("PRIVATE"));
assert.equal(audits.length, 1); assert.match(JSON.stringify(audits[0]), /PRAYER_REQUEST_STATUS_CHANGED/); checks++;
assert.equal((await detail.PATCH(patch({status: "CLOSED"}), context)).status, 409); assert.equal(audits.length, 1); checks++;
assert.equal((await detail.PATCH(patch({status: "NEW"}), context)).status, 200); assert.equal(record.status, "NEW"); checks++;
conflict = true; audits = [];
assert.equal((await detail.PATCH(patch({status: "CLOSED"}), context)).status, 409); assert.equal(audits.length, 0); checks++;
conflict = false; auditFails = true;
await assert.rejects(() => detail.PATCH(patch({status: "CLOSED"}), context), /audit unavailable/);
assert.equal(record.status, "NEW"); checks++;
auditFails = false; found = false;
assert.equal((await detail.PATCH(patch({status: "CLOSED"}), context)).status, 404);
assert.equal((await detail.GET(request(), context)).status, 404); checks++;
found = true; queries = [];
response = await csv(request("?search=hope&status=CLOSED&dateTo=2026-10-16"));
assert.equal(response.status, 200);
const exportWhere = queries[0].where;
assert.deepEqual(JSON.parse(JSON.stringify(exportWhere)), JSON.parse(JSON.stringify(queue.prayerQueueWhere({...queue.DEFAULT_PRAYER_FILTERS, search: "hope", status: "CLOSED", dateTo: "2026-10-16"}, true))));
assert.ok(!(await response.text()).includes("PRIVATE")); checks++;
check(() => assert.equal(queue.prayerQueueCsv([{...base, requestType: "PRAYER_AND_CONTACT"}]), "Fecha,Nombre,Petición,Estado\r\n\r\n"));
// Page wiring complements runtime API tests: print consumes its own URL, same parser/where.
const print = readFileSync(join(root, "src/app/admin/prayer-requests/print/page.tsx"), "utf8");
check(() => { assert.match(print, /prayerPageParams\(await searchParams\)/); assert.match(print, /prayerQueueWhere\(parsed.filters, true\)/); assert.ok(!print.includes("referer")); });
const ui = readFileSync(join(root, "src/components/admin/PrayerRequestsQueue.tsx"), "utf8");
check(() => { assert.match(ui, /import \{Modal\} from '@\/components\/ui\/Modal'/); assert.match(ui, /onOpenChange=/); assert.ok(!/contactId|assignContact|email|whatsapp/.test(ui)); });
console.log(`verify-prayer-queue: ${checks} checks passed (filters, privacy, real handlers, authorization/origin gates, transitions, audit rollback, race conflict, CSV, print and modal wiring).`);
