"use client";

import {useMemo, useRef, useState} from "react";
import {useRouter} from "next/navigation";
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

export function ContentManager({initialBlocks}: {initialBlocks: ContentBlockData[]}) {
  const router = useRouter();
  const [blocks] = useState<ContentBlockData[]>(initialBlocks);
  const [selectedId, setSelectedId] = useState<string | null>(initialBlocks[0]?.id ?? null);
  const [locale, setLocale] = useState<string>("en");
  const [source, setSource] = useState("");
  const [initializedFor, setInitializedFor] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState<"publish" | "unpublish" | string | null>(null);
  const [expandedRevisions, setExpandedRevisions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selected = blocks.find((block) => block.id === selectedId) ?? null;
  const translationKey = selected ? `${selected.id}:${locale}` : "";
  if (selected && initializedFor !== translationKey) {
    setInitializedFor(translationKey);
    setSource(selected.translations.find((entry) => entry.locale === locale)?.source ?? "");
    setConfirming(null);
    setMessage(null);
  }

  const previewHtml = useMemo(() => renderSafeHtml(source), [source]);

  async function saveDraft() {
    if (!selected) return;
    setMessage(null);
    setSaving(true);
    const response = await fetch(`/api/admin/content/${selected.id}/translations`, {
      method: "PUT",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({locale, source}),
    });
    const data = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      setMessage(
        data?.error === "invalid_document"
          ? `The document is not valid: ${(data.details ?? []).join(", ")}. Raw HTML, scripts and unsafe links are not allowed.`
          : "The translation could not be saved.",
      );
      return;
    }
    setMessage("Draft saved and recorded as a revision.");
    router.refresh();
  }

  async function runPublish() {
    if (!selected) return;
    setMessage(null);
    setSaving(true);
    const response = await fetch(`/api/admin/content/${selected.id}/publish`, {method: "POST"});
    const data = await response.json().catch(() => null);
    setSaving(false);
    setConfirming(null);
    if (!response.ok) {
      setMessage(
        data?.error === "incomplete_translations"
          ? `Publishing is blocked. Missing or invalid translations: ${(data.missing ?? []).join(", ")}.`
          : "The block could not be published.",
      );
      return;
    }
    setMessage("Published. A revision was recorded for every language.");
    router.refresh();
  }

  async function runUnpublish() {
    if (!selected) return;
    setMessage(null);
    setSaving(true);
    const response = await fetch(`/api/admin/content/${selected.id}/unpublish`, {method: "POST"});
    setSaving(false);
    setConfirming(null);
    if (!response.ok) {
      setMessage("The block could not be unpublished.");
      return;
    }
    setMessage("Unpublished. The block is now a draft.");
    router.refresh();
  }

  async function runRestore(revisionId: string) {
    if (!selected) return;
    setMessage(null);
    setSaving(true);
    const response = await fetch(`/api/admin/content/${selected.id}/restore`, {
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
    if (typeof restored.locale === "string") setLocale(restored.locale);
    setMessage("Revision restored and recorded as a new revision.");
    router.refresh();
  }

  return (
    <div className="content-manager">
      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <h2>Content blocks</h2>
            <p>Fixed catalog with stable keys. New keys are never created from the UI.</p>
          </div>
        </div>
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
        <section className="admin-section">
          <div className="admin-section-heading">
            <div>
              <h2>{selected.label}</h2>
              <p>{selected.description} Key: <code>{selected.key}</code> · Type: {selected.type}</p>
            </div>
          </div>

          {message ? <p className="admin-status-message" role="status">{message}</p> : null}

          <div className="content-locale-tabs" role="tablist" aria-label="Translation language">
            {(REQUIRED_LOCALES as readonly string[]).map((entry) => {
              const missing = selected.missingLocales.includes(entry);
              return (
                <button
                  key={entry}
                  type="button"
                  role="tab"
                  aria-selected={locale === entry}
                  className={locale === entry ? "content-locale-tab is-active" : "content-locale-tab"}
                  onClick={() => setLocale(entry)}
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
                <ToolbarButton label="List" title="Bulleted list" onInsert={() => insertAtCursor(textareaRef.current, setSource, prefixLines("- "))} />
                <ToolbarButton label="Quote" title="Quote" onInsert={() => insertAtCursor(textareaRef.current, setSource, prefixLines("> "))} />
              </div>
              <label className="admin-sr-only" htmlFor="content-source">Content source ({locale})</label>
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
            </div>
            <div>
              <h3 className="content-preview-heading"><IconEye size={17} aria-hidden /> Preview ({locale})</h3>
              <div className="content-preview" dangerouslySetInnerHTML={{__html: previewHtml || "<p><em>Nothing to preview yet.</em></p>"}} />
              <div className="admin-form-actions">
                {selected.status === "PUBLISHED" ? (
                  confirming === "unpublish" ? (
                    <span className="admin-confirm-inline">
                      <span>Unpublish this block?</span>
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
                    <span>Publish after reviewing the preview?</span>
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
              {selected.missingLocales.length > 0 ? (
                <p className="admin-field-note">Publishing is blocked until every language is complete. Missing: {selected.missingLocales.join(", ")}.</p>
              ) : null}
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
              Revision history ({selected.revisions.length})
            </button>
            {expandedRevisions ? (
              selected.revisions.length === 0 ? (
                <p className="admin-empty">No revisions recorded yet.</p>
              ) : (
                <ul className="admin-audit-list">
                  {selected.revisions.map((revision) => (
                    <li key={revision.id}>
                      <strong>{revision.action} · {revision.locale}</strong>
                      <span>{revision.createdBy} · {revision.createdAt}</span>
                      <span className="content-revision-preview">{revision.preview}</span>
                      {confirming === revision.id ? (
                        <span className="admin-confirm-inline">
                          <span>Restore this revision? The restored text is recorded as a new revision.</span>
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
      ) : null}
    </div>
  );
}
