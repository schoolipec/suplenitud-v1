import type {ReactNode} from "react";

/**
 * Renders editorially published CMS copy in place of a section's static copy.
 * The `html` value comes from the public content loader, which already
 * sanitizes the stored document to an allowlisted safe subset, so
 * `dangerouslySetInnerHTML` never receives raw or unpublished content. When no
 * published content exists it renders the approved static `fallback`.
 */
export function PublishedCopy({html, fallback}: {html?: string | null; fallback: ReactNode}) {
  if (!html) return <>{fallback}</>;
  return <div className="cms-copy" dangerouslySetInnerHTML={{__html: html}} />;
}
