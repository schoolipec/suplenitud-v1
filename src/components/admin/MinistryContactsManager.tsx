"use client";

import {FormEvent, useState} from "react";
import {IconCheck, IconPencil, IconPlus, IconRefresh, IconSearch} from "@tabler/icons-react";

type MinistryContact = {
  id: string;
  name: string;
  ministry: string;
  phone: string | null;
  whatsapp: string | null;
  telegramChatId: string | null;
  locale: string;
  timezone: string;
  authorized: boolean;
  active: boolean;
  notes: string | null;
  createdAt: string;
};

const MINISTRY_CATALOG = ["Ujieres", "Música", "Tesorería", "Otros"];
const LOCALES = [
  {value: "en", label: "English"},
  {value: "es", label: "Español"},
  {value: "pt", label: "Português"},
  {value: "ko", label: "한국어"},
  {value: "de", label: "Deutsch"},
];

export function MinistryContactsManager({initialContacts}: {initialContacts: MinistryContact[]}) {
  const [contacts, setContacts] = useState<MinistryContact[]>(initialContacts);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [ministryFilter, setMinistryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const knownMinistries = Array.from(new Set([...MINISTRY_CATALOG, ...contacts.map((contact) => contact.ministry)]));

  async function loadContacts() {
    setLoading(true);
    const response = await fetch("/api/admin/ministry-contacts", {cache: "no-store"});
    const data = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setMessage("The contact list could not be loaded.");
      return;
    }
    setContacts(data.contacts.map((contact: MinistryContact & {createdAt: string}) => ({...contact, createdAt: new Date(contact.createdAt).toISOString()})));
  }

  function readContactForm(form: FormData) {
    const ministryChoice = String(form.get("ministryChoice") ?? "");
    const customMinistry = String(form.get("customMinistry") ?? "").trim();
    const customConfirmed = form.get("customMinistryConfirmed") === "on";
    const ministry = ministryChoice === "__custom__" ? customMinistry : ministryChoice;
    return {
      name: String(form.get("name") ?? "").trim(),
      ministry,
      phone: String(form.get("phone") ?? "").trim() || null,
      whatsapp: String(form.get("whatsapp") ?? "").trim() || null,
      telegramChatId: String(form.get("telegramChatId") ?? "").trim() || null,
      locale: String(form.get("locale") ?? "en"),
      timezone: String(form.get("timezone") ?? "America/Los_Angeles").trim() || "America/Los_Angeles",
      authorized: form.get("authorized") === "on",
      notes: String(form.get("notes") ?? "").trim() || null,
      customConfirmed,
      isCustom: ministryChoice === "__custom__",
    };
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const payload = readContactForm(form);
    if (payload.isCustom && (!payload.customConfirmed || payload.ministry.length < 2)) {
      setMessage("Enter a ministry name of at least 2 characters and confirm it is a new ministry label.");
      return;
    }
    setSaving(true);
    const response = await fetch("/api/admin/ministry-contacts", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({
        name: payload.name,
        ministry: payload.ministry,
        phone: payload.phone,
        whatsapp: payload.whatsapp,
        telegramChatId: payload.telegramChatId,
        locale: payload.locale,
        timezone: payload.timezone,
        authorized: payload.authorized,
        notes: payload.notes,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      setMessage("The contact could not be created. Verify the information and try again.");
      return;
    }
    event.currentTarget.reset();
    setCreating(false);
    setMessage("Contact created.");
    await loadContacts();
  }

  async function onEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const payload = readContactForm(form);
    if (payload.isCustom && (!payload.customConfirmed || payload.ministry.length < 2)) {
      setMessage("Enter a ministry name of at least 2 characters and confirm it is a new ministry label.");
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/admin/ministry-contacts/${editingId}`, {
      method: "PATCH",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({
        name: payload.name,
        ministry: payload.ministry,
        phone: payload.phone,
        whatsapp: payload.whatsapp,
        telegramChatId: payload.telegramChatId,
        locale: payload.locale,
        timezone: payload.timezone,
        authorized: payload.authorized,
        notes: payload.notes,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      setMessage("The contact could not be updated. Verify the information and try again.");
      return;
    }
    setEditingId(null);
    setMessage("Contact updated.");
    await loadContacts();
  }

  async function toggleActive(contact: MinistryContact) {
    setMessage(null);
    setSaving(true);
    const response = await fetch(`/api/admin/ministry-contacts/${contact.id}`, {
      method: "PATCH",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({active: !contact.active}),
    });
    setSaving(false);
    if (!response.ok) {
      setMessage("The status could not be updated. Try again.");
      return;
    }
    setMessage(contact.active ? "Contact deactivated." : "Contact reactivated.");
    await loadContacts();
  }

  const filtered = contacts.filter((contact) => {
    const haystack = `${contact.name} ${contact.ministry} ${contact.phone ?? ""} ${contact.whatsapp ?? ""}`.toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (ministryFilter !== "ALL" && contact.ministry !== ministryFilter) return false;
    if (statusFilter === "active" && !contact.active) return false;
    if (statusFilter === "inactive" && contact.active) return false;
    return true;
  });

  const editingContact = editingId ? contacts.find((contact) => contact.id === editingId) ?? null : null;

  return (
    <div className="admin-ministry-contacts">
      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <h2>Ministry contacts</h2>
            <p>People who coordinate a ministry. They do not sign in to the panel.</p>
          </div>
          <div className="admin-section-actions">
            <button type="button" className="admin-button-secondary" onClick={loadContacts} disabled={loading}>
              <IconRefresh size={17} aria-hidden />
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button type="button" className="admin-button-primary" onClick={() => { setCreating((open) => !open); setEditingId(null); }} aria-expanded={creating}>
              <IconPlus size={17} aria-hidden />
              Add contact
            </button>
          </div>
        </div>

        {message ? <p className="admin-status-message" role="status">{message}</p> : null}

        {creating ? (
          <div className="admin-panel-box">
            <h3>Add ministry contact</h3>
            <ContactForm key="create" contact={null} saving={saving} knownMinistries={knownMinistries} onSubmit={onCreate} onCancel={() => setCreating(false)} />
          </div>
        ) : null}

        {editingContact ? (
          <div className="admin-panel-box">
            <h3>Edit {editingContact.name}</h3>
            <ContactForm key={editingContact.id} contact={editingContact} saving={saving} knownMinistries={knownMinistries} onSubmit={onEdit} onCancel={() => setEditingId(null)} />
          </div>
        ) : null}

        <div className="admin-toolbar">
          <div className="admin-toolbar-search">
            <IconSearch size={17} aria-hidden />
            <label htmlFor="contact-search" className="admin-sr-only">Search contacts</label>
            <input id="contact-search" type="search" placeholder="Search by name, ministry or phone…" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="admin-toolbar-filters">
            <label htmlFor="contact-ministry-filter" className="admin-sr-only">Filter by ministry</label>
            <select id="contact-ministry-filter" value={ministryFilter} onChange={(event) => setMinistryFilter(event.target.value)}>
              <option value="ALL">All ministries</option>
              {knownMinistries.map((ministry) => (
                <option key={ministry} value={ministry}>{ministry}</option>
              ))}
            </select>
            <label htmlFor="contact-status-filter" className="admin-sr-only">Filter by status</label>
            <select id="contact-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Deactivated</option>
            </select>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="admin-col-ministry">Ministry</th>
                <th className="admin-col-channels">Channels</th>
                <th className="admin-col-locale">Locale</th>
                <th>Authorized</th>
                <th>Status</th>
                <th><span className="admin-sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact) => (
                <tr key={contact.id}>
                  <td data-label="Name">
                    <div className="admin-user-cell">
                      <strong>{contact.name}</strong>
                      {contact.notes ? <span className="admin-note-preview">{contact.notes}</span> : null}
                    </div>
                  </td>
                  <td data-label="Ministry" className="admin-col-ministry">
                    <span className="admin-badge">{contact.ministry}</span>
                  </td>
                  <td data-label="Channels" className="admin-col-channels">
                    <div className="admin-channel-list">
                      {contact.phone ? <span>Phone: {contact.phone}</span> : null}
                      {contact.whatsapp ? <span>WhatsApp: {contact.whatsapp}</span> : null}
                      {contact.telegramChatId ? <span>Telegram: {contact.telegramChatId}</span> : null}
                      {!contact.phone && !contact.whatsapp && !contact.telegramChatId ? <span className="admin-muted">No channels</span> : null}
                    </div>
                  </td>
                  <td data-label="Locale" className="admin-col-locale">
                    <span>{contact.locale} · {contact.timezone}</span>
                  </td>
                  <td data-label="Authorized">
                    <span className={contact.authorized ? "admin-badge admin-badge-success" : "admin-badge admin-badge-muted"}>
                      {contact.authorized ? "Authorized" : "Pending"}
                    </span>
                  </td>
                  <td data-label="Status">
                    <span className={contact.active ? "admin-badge admin-badge-success" : "admin-badge admin-badge-danger"}>
                      {contact.active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="admin-col-actions">
                    <div className="admin-row-actions">
                      <button type="button" className="admin-icon-button" onClick={() => { setEditingId(contact.id); setCreating(false); window.scrollTo({top: 0, behavior: "smooth"}); }} aria-label={`Edit ${contact.name}`}>
                        <IconPencil size={17} aria-hidden />
                      </button>
                      <button type="button" className="admin-button-secondary admin-button-small" onClick={() => toggleActive(contact)} disabled={saving}>
                        {contact.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="admin-empty">
                      <p>No ministry contacts match the current filters.</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <p className="admin-field-note">
          Ministry names are labels only. Creating a new ministry name does not grant roles or panel access.
          Deactivated contacts remain on record and can be reactivated at any time.
        </p>
      </section>
    </div>
  );
}

function ContactForm({
  contact,
  saving,
  knownMinistries,
  onSubmit,
  onCancel,
}: {
  contact: MinistryContact | null;
  saving: boolean;
  knownMinistries: string[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCancel: () => void;
}) {
  const currentMinistry = contact?.ministry ?? "";
  const isKnown = knownMinistries.includes(currentMinistry);
  const [ministryChoice, setMinistryChoice] = useState(currentMinistry && isKnown ? currentMinistry : currentMinistry ? "__custom__" : knownMinistries[0] ?? "");
  const showCustom = ministryChoice === "__custom__";

  return (
    <form onSubmit={onSubmit} className="admin-auth-form admin-form-grid">
      <div>
        <label htmlFor={`contact-name-${contact?.id ?? "new"}`}>Full name</label>
        <input id={`contact-name-${contact?.id ?? "new"}`} name="name" defaultValue={contact?.name ?? ""} required minLength={2} />
      </div>
      <div>
        <label htmlFor={`contact-ministry-${contact?.id ?? "new"}`}>Ministry</label>
        <select id={`contact-ministry-${contact?.id ?? "new"}`} name="ministryChoice" value={ministryChoice} onChange={(event) => setMinistryChoice(event.target.value)}>
          {knownMinistries.map((ministry) => (
            <option key={ministry} value={ministry}>{ministry}</option>
          ))}
          <option value="__custom__">New ministry…</option>
        </select>
        {showCustom ? (
          <div className="admin-custom-ministry">
            <label htmlFor={`contact-custom-ministry-${contact?.id ?? "new"}`}>New ministry name</label>
            <input id={`contact-custom-ministry-${contact?.id ?? "new"}`} name="customMinistry" defaultValue={!isKnown ? currentMinistry : ""} required minLength={2} maxLength={60} />
            <label className="admin-checkbox-row">
              <input type="checkbox" name="customMinistryConfirmed" />
              <span>I confirm this is a new ministry label, not a role or permission.</span>
            </label>
          </div>
        ) : null}
      </div>
      <div>
        <label htmlFor={`contact-phone-${contact?.id ?? "new"}`}>Phone (optional)</label>
        <input id={`contact-phone-${contact?.id ?? "new"}`} name="phone" type="tel" defaultValue={contact?.phone ?? ""} />
      </div>
      <div>
        <label htmlFor={`contact-whatsapp-${contact?.id ?? "new"}`}>WhatsApp (optional)</label>
        <input id={`contact-whatsapp-${contact?.id ?? "new"}`} name="whatsapp" type="tel" defaultValue={contact?.whatsapp ?? ""} />
      </div>
      <div>
        <label htmlFor={`contact-telegram-${contact?.id ?? "new"}`}>Telegram ID (optional)</label>
        <input id={`contact-telegram-${contact?.id ?? "new"}`} name="telegramChatId" inputMode="numeric" defaultValue={contact?.telegramChatId ?? ""} />
        <p className="admin-field-note">Stored for a future authorized Telegram phase. Notifications are not activated yet.</p>
      </div>
      <div>
        <label htmlFor={`contact-locale-${contact?.id ?? "new"}`}>Language</label>
        <select id={`contact-locale-${contact?.id ?? "new"}`} name="locale" defaultValue={contact?.locale ?? "en"}>
          {LOCALES.map((locale) => (
            <option key={locale.value} value={locale.value}>{locale.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`contact-timezone-${contact?.id ?? "new"}`}>Time zone</label>
        <input id={`contact-timezone-${contact?.id ?? "new"}`} name="timezone" defaultValue={contact?.timezone ?? "America/Los_Angeles"} required />
      </div>
      <div>
        <label htmlFor={`contact-notes-${contact?.id ?? "new"}`}>Administrative notes (optional)</label>
        <textarea id={`contact-notes-${contact?.id ?? "new"}`} name="notes" rows={3} defaultValue={contact?.notes ?? ""} maxLength={2000} />
      </div>
      <label className="admin-checkbox-row">
        <input type="checkbox" name="authorized" defaultChecked={contact?.authorized ?? false} />
        <span>Authorized for future ministry communications</span>
      </label>
      <div className="admin-form-actions">
        <button type="submit" disabled={saving}>
          <IconCheck size={17} aria-hidden />
          {saving ? "Saving…" : contact ? "Save changes" : "Create contact"}
        </button>
        <button type="button" className="admin-button-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
