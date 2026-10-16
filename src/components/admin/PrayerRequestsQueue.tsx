"use client";

import {useRef, useState} from "react";
import {Modal} from '@/components/ui/Modal';
import {isCurrentPrayer, parsePrayerFilters, prayerFilterParams, prayerStatusLabel, type PrayerQueueFilters, type PrayerQueueItem} from "@/lib/prayer-queue";
import styles from "./PrayerRequestsQueue.module.css";

export function PrayerRequestsQueue({initialRequests, initialNewCount, initialFilters}: {
  initialRequests: PrayerQueueItem[]; initialNewCount: number; initialFilters: PrayerQueueFilters;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [newCount, setNewCount] = useState(initialNewCount);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [selected, setSelected] = useState<PrayerQueueItem | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  async function loadRequests(nextFilters: PrayerQueueFilters) {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/prayer-requests?${prayerFilterParams(nextFilters)}`, {cache: "no-store"});
      const data = await response.json();
      if (!response.ok) throw new Error("load_failed");
      setRequests(data.requests);
      setNewCount(data.newCount);
      setAppliedFilters(nextFilters);
      window.history.replaceState(null, "", `/admin/prayer-requests?${prayerFilterParams(nextFilters)}`);
      return true;
    } catch {
      setMessage("No se pudo actualizar la lista. Intenta de nuevo.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function applyFilters() {
    if (busy.current) return;
    const parsed = parsePrayerFilters(prayerFilterParams(filters));
    if (!parsed.ok) { setMessage("Revisa los filtros: búsqueda de hasta 200 caracteres y fechas válidas en orden."); return; }
    busy.current = true;
    setMessage("");
    try { await loadRequests(parsed.filters); } finally { busy.current = false; }
  }

  async function changeStatus(request: PrayerQueueItem) {
    if (busy.current || !isCurrentPrayer(request)) return;
    busy.current = true;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/prayer-requests/${encodeURIComponent(request.id)}`, {
        method: "PATCH", headers: {"content-type": "application/json"},
        body: JSON.stringify({status: request.status === "NEW" ? "CLOSED" : "NEW"}),
      });
      if (!response.ok) throw new Error("update_failed");
      const data = await response.json();
      setSelected((current) => current?.id === request.id ? data.request : current);
      if (await loadRequests(appliedFilters)) setMessage("Estado actualizado.");
    } catch {
      setMessage("No se pudo cambiar el estado. Actualiza la lista antes de intentar de nuevo.");
    } finally { setSaving(false); busy.current = false; }
  }

  const disabled = loading || saving;
  const params = prayerFilterParams(appliedFilters).toString();
  const dirty = prayerFilterParams(filters).toString() !== params;
  function actions(request: PrayerQueueItem) {
    return <div className="admin-row-actions">
      <button type="button" className="admin-button-secondary" onClick={() => setSelected(request)} disabled={disabled}>Ver detalle</button>
      {isCurrentPrayer(request) && <button type="button" className="admin-button-secondary" disabled={disabled} onClick={() => changeStatus(request)}>
        {request.status === "NEW" ? "Marcar presentada" : "Volver nueva"}
      </button>}
    </div>;
  }

  return <div className="admin-prayer-requests">
    <section className="admin-section" aria-busy={disabled}>
      <div className={styles.summary}>
        <div className={styles.summaryCard} aria-live="polite">
          <strong>{newCount}</strong>
          <span>Nuevas en la cola</span>
        </div>
      </div>
      <div className="admin-section-heading">
        <div><h2>Peticiones de oración</h2><p>Exportación e impresión incluyen solo peticiones nuevas y presentadas. Fechas en UTC.</p></div>
        <div className="admin-section-actions">
          <button type="button" className="admin-button-secondary" disabled={disabled || dirty} onClick={applyFilters}>Actualizar</button>
          <button type="button" className="admin-button-secondary" disabled={disabled || dirty} onClick={() => window.open(`/api/admin/prayer-requests/export?${params}`, "_blank", "noopener,noreferrer")}>Exportar CSV</button>
          <button type="button" className="admin-button-secondary" disabled={disabled || dirty} onClick={() => window.open(`/admin/prayer-requests/print?${params}`, "_blank", "noopener,noreferrer")}>Vista de impresión</button>
        </div>
      </div>
      {message && <p className="admin-status-message" role="status">{message}</p>}
      <form className={styles.filters} onSubmit={(event) => {event.preventDefault(); void applyFilters();}}>
        <label>Buscar<input type="search" maxLength={200} placeholder="Nombre o petición" value={filters.search} disabled={disabled} onChange={(e) => setFilters({...filters, search: e.target.value})} /></label>
        <label>Estado<select value={filters.status} disabled={disabled} onChange={(e) => setFilters({...filters, status: e.target.value as PrayerQueueFilters["status"]})}>
          <option value="ALL">Todas</option><option value="NEW">Nueva</option><option value="CLOSED">Presentada</option>
        </select></label>
        <label>Desde (UTC)<input type="date" value={filters.dateFrom} disabled={disabled} onChange={(e) => setFilters({...filters, dateFrom: e.target.value})} /></label>
        <label>Hasta (UTC)<input type="date" value={filters.dateTo} disabled={disabled} onChange={(e) => setFilters({...filters, dateTo: e.target.value})} /></label>
        <button className="admin-button-secondary" disabled={disabled} type="submit">{loading ? "Cargando…" : "Aplicar filtros"}</button>
      </form>
      {dirty && <p role="status">Aplica los filtros para actualizar la lista, exportar o imprimir.</p>}
      {requests.length === 0 ? <p className="admin-empty">No hay peticiones con los filtros seleccionados.</p> : <>
        <div className={`${styles.desktop} admin-table-wrap`}><table className="admin-data-table">
          <thead><tr><th>Nombre</th><th>Petición</th><th>Estado</th><th>Fecha (UTC)</th><th>Acciones</th></tr></thead>
          <tbody>{requests.map((request) => <tr key={request.id}>
            <td>{request.name}</td><td className={styles.preview}>{request.message.slice(0, 120)}{request.message.length > 120 ? "…" : ""}</td>
            <td><span className={`admin-badge ${request.status === "NEW" ? "admin-badge-success" : prayerStatusLabel(request) === "Presentada" ? "admin-badge-muted" : ""}`}>{prayerStatusLabel(request)}</span></td><td>{request.createdAt.slice(0, 10)}</td><td>{actions(request)}</td>
          </tr>)}</tbody>
        </table></div>
        <div className={styles.mobile}>{requests.map((request) => <article className={styles.card} key={request.id}>
          <h3>{request.name}</h3><span className={`admin-badge ${request.status === "NEW" ? "admin-badge-success" : prayerStatusLabel(request) === "Presentada" ? "admin-badge-muted" : ""}`}>{prayerStatusLabel(request)}</span>
          <p>{request.message.slice(0, 120)}{request.message.length > 120 ? "…" : ""}</p><p><time dateTime={request.createdAt}>{request.createdAt.slice(0, 10)} (UTC)</time></p>{actions(request)}
        </article>)}</div>
      </>}
    </section>
    <Modal open={selected !== null} onOpenChange={(open) => {if (!open) setSelected(null);}} title="Detalle de petición" description={selected ? prayerStatusLabel(selected) : undefined} closeLabel="Cerrar">
      {selected && <div className={styles.detail}>
        <h3>{selected.name}</h3><p><time dateTime={selected.createdAt}>{selected.createdAt.slice(0, 10)} (UTC)</time></p>
        <p className={styles.fullMessage}>{selected.message}</p>
        {isCurrentPrayer(selected) && <button type="button" className="admin-button-secondary" disabled={disabled} onClick={() => changeStatus(selected)}>{saving ? "Guardando…" : selected.status === "NEW" ? "Marcar presentada" : "Volver nueva"}</button>}
        {message && <p role="status">{message}</p>}
      </div>}
    </Modal>
  </div>;
}
