export function hasValidPublicOrigin(request: Request) {
  const publicOrigin = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  return Boolean(publicOrigin && request.headers.get("origin") === new URL(publicOrigin).origin);
}
