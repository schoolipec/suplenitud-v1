"use client";

import {useMemo, useRef, useState} from "react";
import {IconCheck, IconChevronDown, IconChevronUp, IconEye} from "@tabler/icons-react";
import {REQUIRED_LOCALES} from "@/lib/content-catalog";
import {renderSafeHtml} from "@/lib/content-document";
import type {ContentBlockData} from "@/lib/content-types";

function ToolbarButton({label, title, onInsert}: {label: string; title: string; onInsert: () => void}) {
  return (
    <button type="button" className="admin-button-secondary admin-button-small" title={title} onClick={onInsert}>
      {label}
    </button>
  );
}

function insertAtCursor(
  textarea: HTMLTextAreaElement | null,
  setValue: (value: string) => void,
  transform: (value: string, start: number, end: number) => {value: string; start: number; end: number},
) {
  if (!textarea) return;
  const next = transform(textarea.value, textarea.selectionStart, textarea.selectionEnd);
  setValue(next.value);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(next.start, next.end);
  });
}

function wrapSelection(before: string, after: string, placeholder: string) {
  return (value: string, start: number, end: number) => {
    const selected = value.slice(start, end) || placeholder;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    const cursor = start + before.length;
    return {value: next, start: cursor, end: cursor + selected.length};
  };
}

function prefixLines(prefix: string) {
  return (value: string, start: number, end: number) => {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    let lineEnd = value.indexOf("\n", end);
    if (lineEnd === -1) lineEnd = value.length;
    const selected = value.slice(lineStart, lineEnd);
    const replaced = selected
      .split("\n")
      .map((line) => (line.trim() === "" ? line : `${prefix}${line.replace(/^([#>\-*]\s*)+/, "")}`))
      .join("\n");
    const next = `${value.slice(0, lineStart)}${replaced}${value.slice(lineEnd)}`;
    return {value: next, start: lineStart, end: lineStart + replaced.length};
  };
}

async function fetchBlocks(): Promise<ContentBlockData[]> {
  const response = await fetch("/api/admin/content", {cache: "no-store"});
  if (!response.ok) throw new Error("reload_failed");
  const data = await response.json() as {blocks?: ContentBlockData[]};
  return data.blocks ?? [];
}

export function ContentManager({initialBlocks}: {initialBlocks: ContentBlockData[]}) {
  const [blocks, setBlocks] = useState<ContentBlockData[]>(initialBlocks);
  const [selectedId, setSelectedId] = useState<string | null>(initialBlocks[0]?.id ?? null);
  const [locale, setLocale] = useState<string>("en");
  const [editorKey, setEditorKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listMessage, setListMessage] = useState<string | null>(null);

  const selected = blocks.find((block) => block.id === selectedId) ?? null;

  async function refresh() {
    setLoading(true);
    try {
      const fresh = await fetchBlocks();
      setBlocks(fresh);
      if (selectedId && !fresh.some((block) => block.id === selectedId)) {
        setSelectedId(fresh[0]?.id ?? null);
      }
      setEditorKey((key) => key + 1);
    } catch {
      setListMessage("The list could not be refreshed. Reload the page to see current data.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content-manager">
      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <h2>Content blocks</h2>
            <p>Fixed catalog with stable keys. New keys are never created from the UI.</p>
          </div>
          <div className="admin-section-actions">
            <button type="button" className="admin-button-secondary" onClick={refresh} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
        {listMessage ? <p className="admin-status-message" role="status">{listMessage}</p> : null}
        {blocks.length === 0 ? (
          <p className="admin-empty">No content blocks yet. They are seeded by migration.</p>
        ) : (
          <ul className="content-block-list">
            {blocks.map((block) => (
              <li key={block.id}>
                <button
                  type="button"
                  className={block.id === selectedId ? "content-block-item is-active" : "content-block-item"}
                  onClick={() => setSelectedId(block.id)}
                  aria-current={block.id === selectedId ? "true" : undefined}
                >
                  <span className="content-block-key">{block.label}</span>
                  <span className="content-block-meta">
                    <span className={block.status === "PUBLISHED" ? "admin-badge admin-badge-success" : "admin-badge admin-badge-muted"}>
                      {block.status === "PUBLISHED" ? "Published" : "Draft"}
                    </span>
                    {block.missingLocales.length > 0 ? (
                      <span className="admin-badge admin-badge-danger">Missing: {block.missingLocales.join(", ")}</span>
                    ) : (
                      <span className="admin-badge admin-badge-success">Complete</span>
                    )}
                    {!block.catalogued ? <span className="admin-badge">Legacy key</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected ? (
        <BlockEditor
          key={`${selected.id}:${locale}:${editorKey}`}
          block={selected}
          locale={locale}
          onLocaleChange={setLocale}
          onChanged={refresh}
        />
      ) : null}
    </div>
  );
}

function BlockEditor({
  block,
  locale,
  onLocaleChange,
  onChanged,
}: {
  block: ContentBlockData;
  locale: string;
  onLocaleChange: (locale: string) => void;
  onChanged: () => Promise<void>;
}) {
  const [source, setSource] = useState(
    () => block.translations.find((entry) => entry.locale === locale)?.source ?? "",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState<"publish" | "unpublish" | string | null>(null);
  const [expandedRevisions, setExpandedRevisions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const previewHtml = useMemo(() => renderSafeHtml(source), [source]);
  const publishedSource = block.published.find((entry) => entry.locale === locale)?.source ?? null;
  const publishedHtml = useMemo(
    () => (publishedSource === null ? null : renderSafeHtml(publishedSource)),
    [publishedSource],
  );
  const draftMatchesPublished =
    publishedSource !== null &&
    (block.translations.find((entry) => entry.locale === locale)?.source ?? "") === publishedSource;

  async function saveDraft() {
    setMessage(null);
    setSaving(true);
    const response = await fetch(`/api/admin/content/${block.id}/translations`, {
      method: "PUT",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({locale, source}),
    });
    const data = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      setMessage(
        data?.error === "invalid_document"
          ? `The draft is not valid: ${(data.details ?? []).join(", ")}. Raw HTML, scripts and unsafe links are not allowed. The published version is unchanged.`
          : "The draft could not be saved. The published version is unchanged.",
      );
      return;
    }
    setMessage("Draft saved and recorded as a revision. The published version is unchanged.");
    await onChanged();
  }

  async function runPublish() {
    setMessage(null);
    setSaving(true);
    const response = await fetch(`/api/admin/content/${block.id}/publish`, {method: "POST"});
    const data = await response.json().catch(() => null);
    setSaving(false);
    setConfirming(null);
    if (!response.ok) {
      setMessage(
        data?.error === "incomplete_translations"
          ? `Publishing is blocked. Missing or invalid drafts: ${(data.missing ?? []).join(", ")}.`
          : "The block could not be published.",
      );
      return;
    }
    setMessage("Published. The five valid drafts were promoted and recorded.");
    await onChanged();
  }

  async function runUnpublish() {
    setMessage(null);
    setSaving(true);
    const response = await fetch(`/api/admin/content/${block.id}/unpublish`, {method: "POST"});
    setSaving(false);
    setConfirming(null);
    if (!response.ok) {
      setMessage("The block could not be unpublished.");
      return;
    }
    setMessage("Unpublished. Drafts and revisions were kept intact.");
    await onChanged();
  }

  async function runRestore(revisionId: string) {
    setMessage(null);
    setSaving(true);
    const response = await fetch(`/api/admin/content/${block.id}/restore`, {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({revisionId, confirm: true}),
    });
    const data = await response.json().catch(() => null);
    setSaving(false);
    setConfirming(null);
    if (!response.ok) {
      setMessage(data?.error === "unrestorable_revision" ? "That revision cannot be restored." : "The revision could not be restored.");
      return;
    }
    const restored = data as {locale?: string};
    if (typeof restored.locale === "string" && restored.locale !== locale) onLocaleChange(restored.locale);
    setMessage("Revision restored as a new draft. The published version is unchanged until you publish.");
    await onChanged();
  }

  async function uploadImage(file: File | null) {
    if (!file) return;
    const alt = window.prompt("Alternative text for this image (required):")?.trim();
    if (!alt) {
      setUploadError("An alternative text description is required. The image was not uploaded.");
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/admin/media", {method: "POST", body: form});
      const data = await response.json().catch(() => null) as {url?: string; error?: string} | null;
      if (!response.ok || !data?.url) {
        setUploadError(
          data?.error === "too_large" ? "Images must be 2 MB or smaller."
            : data?.error === "storage_unconfigured" ? "Image uploads are not configured in this environment yet."
              : "The image could not be uploaded. Use a valid PNG, JPEG or WebP image.",
        );
        return;
      }
      insertAtCursor(textareaRef.current, setSource, (value, start, end) => {
        const markup = `![${alt}](${data.url})`;
        return {value: `${value.slice(0, start)}${markup}${value.slice(end)}`, start, end: start + markup.length};
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <h2>{block.label}</h2>
          <p>{block.description} Key: <code>{block.key}</code> · Type: {block.type}</p>
        </div>
      </div>

      {message ? <p className="admin-status-message" role="status">{message}</p> : null}

      <div className="content-locale-tabs" role="tablist" aria-label="Translation language">
        {(REQUIRED_LOCALES as readonly string[]).map((entry) => {
          const missing = block.missingLocales.includes(entry);
          return (
            <button
              key={entry}
              type="button"
              role="tab"
              aria-selected={locale === entry}
              className={locale === entry ? "content-locale-tab is-active" : "content-locale-tab"}
              onClick={() => onLocaleChange(entry)}
            >
              {entry.toUpperCase()}
              {missing ? <span className="content-missing-dot" aria-label="Missing translation">•</span> : null}
            </button>
          );
        })}
      </div>

      <div className="content-editor-grid">
        <div>
          <div className="content-toolbar" role="toolbar" aria-label="Formatting">
            <ToolbarButton label="H1" title="Heading 1" onInsert={() => insertAtCursor(textareaRef.current, setSource, prefixLines("# "))} />
            <ToolbarButton label="H2" title="Heading 2" onInsert={() => insertAtCursor(textareaRef.current, setSource, prefixLines("## "))} />
            <ToolbarButton label="H3" title="Heading 3" onInsert={() => insertAtCursor(textareaRef.current, setSource, prefixLines("### "))} />
            <ToolbarButton label="B" title="Bold" onInsert={() => insertAtCursor(textareaRef.current, setSource, wrapSelection("**", "**", "bold text"))} />
            <ToolbarButton label="I" title="Italic" onInsert={() => insertAtCursor(textareaRef.current, setSource, wrapSelection("*", "*", "italic text"))} />
            <ToolbarButton label="Link" title="Link (https only)" onInsert={() => insertAtCursor(textareaRef.current, setSource, wrapSelection("[", "](https://example.com)", "link text"))} />
            <label className="admin-button-secondary admin-button-small" title="Upload and insert image">
              {uploading ? "Uploading…" : "Image"}
              <input
                className="admin-sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploading}
                onChange={(event) => { void uploadImage(event.currentTarget.files?.[0] ?? null); event.currentTarget.value = ""; }}
              />
            </label>
            <ToolbarButton label="List" title="Bulleted list" onInsert={() => insertAtCursor(textareaRef.current, setSource, prefixLines("- "))} />
            <ToolbarButton label="Quote" title="Quote" onInsert={() => insertAtCursor(textareaRef.current, setSource, prefixLines("> "))} />
          </div>
          {uploadError ? <p className="admin-status-message" role="alert">{uploadError}</p> : null}
          <label className="admin-sr-only" htmlFor="content-source">Draft source ({locale})</label>
          <textarea
            id="content-source"
            ref={textareaRef}
            className="content-source"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            rows={14}
            placeholder={"# Title\n\nWrite paragraphs here.\n\n- List item\n\n> Quote"}
          />
          <div className="admin-form-actions">
            <button type="button" className="admin-button-primary" onClick={saveDraft} disabled={saving}>
              {saving ? "Saving…" : "Save draft"}
            </button>
          </div>
          <p className="admin-field-note">Saving updates the draft only. The published version never changes here.</p>
        </div>
        <div>
          <h3 className="content-preview-heading"><IconEye size={17} aria-hidden /> Draft preview ({locale})</h3>
          <div className="content-preview" dangerouslySetInnerHTML={{__html: previewHtml || "<p><em>Nothing to preview yet.</em></p>"}} />
          <div className="admin-form-actions">
            {block.status === "PUBLISHED" ? (
              confirming === "unpublish" ? (
                <span className="admin-confirm-inline">
                  <span>Unpublish this block? Drafts stay intact.</span>
                  <button type="button" className="admin-icon-button admin-icon-confirm" disabled={saving} onClick={runUnpublish} aria-label="Confirm unpublish">
                    <IconCheck size={17} aria-hidden />
                  </button>
                  <button type="button" className="admin-button-ghost" onClick={() => setConfirming(null)}>Cancel</button>
                </span>
              ) : (
                <button type="button" className="admin-button-secondary" onClick={() => setConfirming("unpublish")} disabled={saving}>
                  Unpublish
                </button>
              )
            ) : confirming === "publish" ? (
              <span className="admin-confirm-inline">
                <span>Promote the five valid drafts to published?</span>
                <button type="button" className="admin-icon-button admin-icon-confirm" disabled={saving} onClick={runPublish} aria-label="Confirm publish">
                  <IconCheck size={17} aria-hidden />
                </button>
                <button type="button" className="admin-button-ghost" onClick={() => setConfirming(null)}>Cancel</button>
              </span>
            ) : (
              <button type="button" className="admin-button-primary" onClick={() => setConfirming("publish")} disabled={saving}>
                Review &amp; publish
              </button>
            )}
          </div>
          {block.missingLocales.length > 0 ? (
            <p className="admin-field-note">Publishing is blocked until every language has a valid draft. Missing: {block.missingLocales.join(", ")}.</p>
          ) : null}
          <h3 className="content-preview-heading">Published version ({locale})</h3>
          {publishedHtml === null ? (
            <p className="admin-empty">Not published in this language.</p>
          ) : (
            <>
              <div className="content-preview content-preview-published" dangerouslySetInnerHTML={{__html: publishedHtml}} />
              {draftMatchesPublished ? null : (
                <p className="admin-field-note">The draft differs from the published version.</p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="content-revisions">
        <button
          type="button"
          className="admin-button-ghost"
          onClick={() => setExpandedRevisions((open) => !open)}
          aria-expanded={expandedRevisions}
        >
          {expandedRevisions ? <IconChevronUp size={17} aria-hidden /> : <IconChevronDown size={17} aria-hidden />}
          Revision history ({block.revisions.length})
        </button>
        {expandedRevisions ? (
          block.revisions.length === 0 ? (
            <p className="admin-empty">No revisions recorded yet.</p>
          ) : (
            <ul className="admin-audit-list">
              {block.revisions.map((revision) => (
                <li key={revision.id}>
                  <strong>{revision.action} · {revision.locale}</strong>
                  <span>{revision.createdBy} · {revision.createdAt}</span>
                  <span className="content-revision-preview">{revision.preview}</span>
                  {confirming === revision.id ? (
                    <span className="admin-confirm-inline">
                      <span>Restore as a new draft? Published content stays until you publish.</span>
                      <button type="button" className="admin-icon-button admin-icon-confirm" disabled={saving} onClick={() => runRestore(revision.id)} aria-label="Confirm restore">
                        <IconCheck size={17} aria-hidden />
                      </button>
                      <button type="button" className="admin-button-ghost" onClick={() => setConfirming(null)}>Cancel</button>
                    </span>
                  ) : (
                    <button type="button" className="admin-button-secondary admin-button-small" onClick={() => setConfirming(revision.id)} disabled={saving}>
                      Restore
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </section>
  );
}
