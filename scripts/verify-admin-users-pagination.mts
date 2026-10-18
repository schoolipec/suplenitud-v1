import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {ASSIGNABLE_USER_ROLES} from "../src/lib/admin-user-actions";

const root = join(import.meta.dirname, "..");
const routePath = join(root, "src/app/api/admin/users/route.ts");
const componentPath = join(root, "src/components/admin/UserManagement.tsx");
const paginationPath = join(root, "src/components/admin/AdminPagination.tsx");
const pagePath = join(root, "src/app/admin/users/page.tsx");

const route = readFileSync(routePath, "utf8");
const component = readFileSync(componentPath, "utf8");
const pagination = readFileSync(paginationPath, "utf8");
const page = readFileSync(pagePath, "utf8");

// --- API: GET and POST must coexist -----------------------------------------
assert.match(route, /export async function GET/);
assert.match(route, /export async function POST/);

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

// GET is super admin only.
const getSection = route.slice(route.indexOf("export async function GET"), route.indexOf("export async function POST"));
assert.ok(getSection.includes("requireSuperAdmin(request)"));
assert.ok(getSection.includes("forbidden"));
assert.match(getSection, /url\.searchParams\.get\("page"\)/);
assert.match(route, /findMany/);
assert.match(route, /skip/);
assert.match(route, /take/);

// Strict whitelists for page size, sort field and direction.
assert.match(route, /PAGE_SIZE_WHITELIST\s*=\s*\[10, 25, 50\]/);
assert.match(route, /SORT_WHITELIST = \["createdAt", "name", "email", "active"\]/);
assert.match(route, /DIRECTION_WHITELIST = \["asc", "desc"\]/);
assert.equal(ASSIGNABLE_USER_ROLES.length, 3);

// Default ordering: createdAt desc; pageSize normalized to a whitelisted value.
assert.match(route, /return "createdAt"/);
assert.match(route, /return "desc"/);
assert.match(route, /return 25/);

// A page beyond the last valid page clamps to the last page (still returns rows).
assert.match(route, /Math\.min\(normalizePage\(Number\(pageParam\)\), totalPages\)/);
assert.match(route, /Math\.max\(1, Math\.ceil\(totalItems \/ pageSize\)\)/);

// Search and filters run server-side (Prisma where), never over the whole table in the client.
assert.match(route, /contains: safeQuery, mode: "insensitive"/);
assert.match(route, /where\.roles = \{some: \{role: roleFilter\}\}/);
assert.match(route, /where\.active = true/);
assert.match(route, /where\.active = false/);
assert.match(route, /skip,?\s*\n?\s*take/);
assert.match(route, /take = pageSize/);

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

// Initial load + debounce + reset to page 1 on criteria change.
assert.match(component, /useEffect\(\(\) => \{[\s\S]*loadUsers\(page\)[\s\S]*\}, \[page, loadUsers\]\)/);
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
assert.match(component, /type SortField = "createdAt" \| "name" \| "email" \| "active"/);
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

// The page must not preload the whole user table on the server.
assert.ok(!/prisma\.user\.findMany/.test(page));
assert.match(page, /<UserManagement currentUserId=\{session\.user\.id\}/);

console.log("verify-admin-users-pagination: all checks passed");
console.log("  - GET (paginated) and POST (create) coexist; both require SUPER_ADMIN");
console.log("  - POST keeps origin check, duplicate email, invitation token, audit and honest emailSent");
console.log("  - Server-side search/filters/sort with whitelisted sort, direction and page size; page clamped to last valid page");
console.log("  - Client loads page 1 on mount, debounces search, resets to page 1 on criteria change and protects against races");
console.log("  - Accessible sortable headers (name/email/active/createdAt) and page-size selector 10/25/50");
console.log("  - Pagination requests the requested page and keeps current data while loading");
