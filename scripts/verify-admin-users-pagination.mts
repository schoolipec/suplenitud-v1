import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {ASSIGNABLE_USER_ROLES} from "../src/lib/admin-user-actions";

const root = join(import.meta.dirname, "..");
const routePath = join(root, "src/app/api/admin/users/route.ts");
const helperPath = join(root, "src/lib/admin-users-query.ts");
const componentPath = join(root, "src/components/admin/UserManagement.tsx");
const paginationPath = join(root, "src/components/admin/AdminPagination.tsx");
const pagePath = join(root, "src/app/admin/users/page.tsx");

const route = readFileSync(routePath, "utf8");
const helper = readFileSync(helperPath, "utf8");
const component = readFileSync(componentPath, "utf8");
const pagination = readFileSync(paginationPath, "utf8");
const page = readFileSync(pagePath, "utf8");

// --- API: GET and POST must coexist -----------------------------------------
assert.match(route, /export async function GET/);
assert.match(route, /export async function POST/);

// GET and the server-rendered /admin/users page share one server-only pagination helper.
assert.match(route, /import \{parseAdminUsersQuery, queryAdminUsers\} from "@\/lib\/admin-users-query"/);
assert.match(route, /queryAdminUsers\(parseAdminUsersQuery\(url\.searchParams\)\)/);
assert.match(helper, /import \{prisma\} from "@\/lib\/db\/client"/);
assert.match(helper, /export const DEFAULT_ADMIN_USERS_QUERY/);
assert.match(helper, /export function parseAdminUsersQuery\(searchParams: URLSearchParams\)/);
assert.match(helper, /export async function queryAdminUsers\(params: AdminUsersQuery\)/);
assert.match(helper, /export const ADMIN_USERS_PAGE_SIZE_WHITELIST = \[10, 25, 50\] as const/);
assert.match(helper, /export const ADMIN_USERS_SORT_WHITELIST = \["createdAt", "name", "email", "active"\] as const/);
assert.match(helper, /export const ADMIN_USERS_DIRECTION_WHITELIST = \["asc", "desc"\] as const/);

// POST (create user) must keep its original contract.
assert.match(route, /hasValidPublicOrigin/);
assert.match(route, /requireSuperAdmin/);
assert.match(route, /email_already_exists/);
assert.match(route, /USER_CREATED/);
assert.match(route, /INVITATION_CREATED/);
assert.match(route, /tokenHash/);
assert.match(route, /emailSent/);
assert.match(route, /emailReason/);
assert.match(route, /active: true/);
assert.match(route, /mustChangePassword: true/);
assert.ok(!route.includes("temporaryPassword"));
assert.match(route, /export async function POST[\s\S]*sendInvitationMail/);

// GET is super admin only and delegates parsing/querying to the shared helper.
const getSection = route.slice(route.indexOf("export async function GET"), route.indexOf("export async function POST"));
assert.ok(getSection.includes("requireSuperAdmin(request)"));
assert.ok(getSection.includes("forbidden"));
assert.ok(getSection.includes("parseAdminUsersQuery(url.searchParams)"));
assert.ok(getSection.includes("queryAdminUsers("));

// The helper owns the Prisma pagination query (findMany + skip/take).
assert.match(helper, /findMany/);
assert.match(helper, /skip/);
assert.match(helper, /take/);

// Strict whitelists for page size, sort field and direction.
assert.match(helper, /ADMIN_USERS_PAGE_SIZE_WHITELIST = \[10, 25, 50\] as const/);
assert.match(helper, /ADMIN_USERS_SORT_WHITELIST = \["createdAt", "name", "email", "active"\] as const/);
assert.match(helper, /ADMIN_USERS_DIRECTION_WHITELIST = \["asc", "desc"\] as const/);
assert.equal(ASSIGNABLE_USER_ROLES.length, 3);

// Default ordering: createdAt desc; pageSize normalized to a whitelisted value.
assert.match(helper, /return "createdAt"/);
assert.match(helper, /return "desc"/);
assert.match(helper, /return 25/);

// A page beyond the last valid page clamps to the last page (still returns rows).
assert.match(helper, /Math\.min\(normalizeAdminUsersPage\(params\.page\), totalPages\)/);
assert.match(helper, /Math\.max\(1, Math\.ceil\(totalItems \/ params\.pageSize\)\)/);

// Search and filters run server-side (Prisma where), never over the whole table in the client.
assert.match(helper, /contains: params\.query, mode: "insensitive"/);
assert.match(helper, /where\.roles = \{some: \{role: params\.role\}\}/);
assert.match(helper, /where\.active = true/);
assert.match(helper, /where\.active = false/);
assert.match(helper, /const take = params\.pageSize/);

// POST keeps the whole original creation flow (credential-less + invitation + audit + honest email result).
const postSection = route.slice(route.indexOf("export async function POST"));
assert.ok(postSection.includes("hasValidPublicOrigin(request)"));
assert.ok(postSection.includes("requireSuperAdmin(request)"));
assert.ok(postSection.includes("email_already_exists"));
assert.ok(postSection.includes("USER_CREATED"));
assert.ok(postSection.includes("INVITATION_CREATED"));
assert.ok(postSection.includes("hashInvitationToken(token)"));
assert.ok(postSection.includes("sendInvitationMail"));
assert.ok(postSection.includes("emailSent: mailResult.sent"));
assert.ok(!postSection.includes("temporaryPassword"));

// Client component is server-driven: it builds query params and fetches the API.
assert.match(component, /new URLSearchParams\(\)/);
assert.match(component, /\/api\/admin\/users\?\$\{search\.toString\(\)\}/);
assert.match(component, /search\.set\("page", String\(params\.page\)\)/);
assert.match(component, /search\.set\("pageSize", String\(params\.pageSize\)\)/);
assert.match(component, /search\.set\("sort", params\.sort\)/);
assert.match(component, /search\.set\("direction", params\.direction\)/);
assert.match(component, /search\.set\("query", params\.query\.trim\(\)\)/);
assert.match(component, /search\.set\("role", params\.role\)/);
assert.match(component, /search\.set\("status", params\.status\)/);

// Server-provided initial data hydrates state; the component only refetches when the
// applied query signature actually changes (so mount does not fire a second request).
assert.match(component, /import type \{AdminUsersResult\} from "@\/lib\/admin-users-query"/);
assert.match(component, /\{currentUserId, initialData\}: \{currentUserId\?: string; initialData: AdminUsersResult\}/);
assert.match(component, /useState<ManagedUser\[\]>\(initialData\.users\)/);
assert.match(component, /useState\(initialData\.pagination\.page\)/);
assert.match(component, /useState\(initialData\.pagination\.pageSize\)/);
assert.match(component, /useState<Pagination>\(initialData\.pagination\)/);
assert.match(component, /const lastAppliedSignatureRef = useRef\(/);
assert.match(component, /if \(signature === lastAppliedSignatureRef\.current\) return;/);
assert.match(component, /\}, \[page, pageSize, debouncedQuery, roleFilter, statusFilter, sort\.field, sort\.direction, loadUsers\]\)/);

// Debounce + reset to page 1 on criteria change.
assert.match(component, /window\.setTimeout\(\(\) => setDebouncedQuery\(query\), 300\)/);
assert.match(component, /setPage\(1\)/);

// Page size selector with 10/25/50.
assert.match(component, /const PAGE_SIZE_OPTIONS = \[10, 25, 50\] as const/);
assert.match(component, /PAGE_SIZE_OPTIONS\.map/);

// Race protection: a stale response never overwrites a newer query.
assert.match(component, /requestIdRef\.current/);
assert.match(component, /if \(requestId !== requestIdRef\.current\) return false/);

// Accessible, real sortable headers limited to non-derived, non-sensitive fields.
assert.match(component, /aria-sort=\{ariaSort\}/);
assert.match(component, /<button type="button" className=\{`admin-sort-button/);
assert.match(component, /admin-sort-indicator/);
assert.match(component, /type SortField = AdminUsersResult\["sort"\]\["field"\]/);
const sortHeaders = [...component.matchAll(/field="(\w+)"/g)].map((m) => m[1]);
assert.deepEqual([...new Set(sortHeaders)].sort(), ["active", "createdAt", "email", "name"]);

// Pagination footer asks the API for the requested page and preserves visible data while loading.
assert.match(component, /<AdminPagination/);
assert.match(component, /onPageChange=\{\(target\) => \{[\s\S]*?setPage\(target\)/);
assert.match(component, /pagination\.page/);

// Accessible pagination controls.
assert.match(pagination, /aria-label="User list pagination"/);
assert.match(pagination, /aria-label="Previous page"/);
assert.match(pagination, /aria-label="Next page"/);
assert.match(pagination, /aria-live="polite"/);

// The page renders the first slice server-side through the shared helper (no unbounded preload).
assert.ok(!/findMany/.test(page));
assert.match(page, /import \{DEFAULT_ADMIN_USERS_QUERY, queryAdminUsers\} from "@\/lib\/admin-users-query"/);
assert.match(page, /queryAdminUsers\(DEFAULT_ADMIN_USERS_QUERY\)/);
assert.match(page, /<UserManagement currentUserId=\{session\.user\.id\} initialData=\{initialData\}/);

console.log("verify-admin-users-pagination: all checks passed");
console.log("  - GET (paginated) and POST (create) coexist; both require SUPER_ADMIN");
console.log("  - POST keeps origin check, duplicate email, invitation token, audit and honest emailSent");
console.log("  - Shared server-only helper powers both the API and the server-rendered first page");
console.log("  - Server-side search/filters/sort with whitelisted sort, direction and page size; page clamped to last valid page");
console.log("  - The client hydrates from initialData and only refetches on a real query change (no mount fetch)");
console.log("  - Debounced search, reset to page 1, race protection, accessible sort headers and pagination controls");
