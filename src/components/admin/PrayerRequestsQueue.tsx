"use client";

import {useRef, useState} from "react";
import {TextInput, Select, Button, Badge, Dialog, Stack, Group, Table, Alert} from "@mantine/core";
import {IconSearch, IconDownload, IconPrinter} from "@tabler/icons-react";
import {isCurrentPrayer, parsePrayerFilters, prayerFilterParams, prayerStatusLabel, type PrayerQueueFilters, type PrayerQueueItem} from "@/lib/prayer-queue";

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

  return (
    <Stack gap="lg">
      <div style={{backgroundColor: "var(--mist)", padding: "1rem", borderRadius: "4px"}}>
        <div style={{fontSize: "2rem", fontWeight: 700, marginBottom: "0.25rem"}}>{newCount}</div>
        <div style={{color: "var(--muted)", fontSize: "0.9rem"}}>Nuevas en la cola</div>
      </div>

      <Stack gap="sm">
        <Group justify="space-between" wrap="wrap">
          <div>
            <h2 style={{margin: "0 0 0.25rem"}}>Peticiones de oración</h2>
            <p style={{margin: 0, color: "var(--muted)", fontSize: "0.9rem"}}>
              Exportación e impresión incluyen solo peticiones nuevas y presentadas. Fechas en UTC.
            </p>
          </div>
          <Group gap="xs">
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || dirty}
              onClick={applyFilters}
            >
              Actualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftSection={<IconDownload size={16} />}
              disabled={disabled || dirty}
              onClick={() => window.open(`/api/admin/prayer-requests/export?${params}`, "_blank", "noopener,noreferrer")}
            >
              Exportar CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftSection={<IconPrinter size={16} />}
              disabled={disabled || dirty}
              onClick={() => window.open(`/admin/prayer-requests/print?${params}`, "_blank", "noopener,noreferrer")}
            >
              Vista de impresión
            </Button>
          </Group>
        </Group>
      </Stack>

      {message && <Alert role="status">{message}</Alert>}

      <Group gap="md" wrap="wrap">
        <TextInput
          placeholder="Nombre o petición"
          leftSection={<IconSearch size={16} />}
          maxLength={200}
          value={filters.search}
          disabled={disabled}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
          style={{flex: 1, minWidth: "200px"}}
        />
        <Select
          placeholder="Estado"
          data={[
            {value: "ALL", label: "Todas"},
            {value: "NEW", label: "Nueva"},
            {value: "CLOSED", label: "Presentada"},
          ]}
          value={filters.status}
          disabled={disabled}
          onChange={(value) => setFilters({...filters, status: (value || "ALL") as PrayerQueueFilters["status"]})}
          style={{minWidth: "150px"}}
        />
        <TextInput
          type="date"
          label="Desde (UTC)"
          value={filters.dateFrom}
          disabled={disabled}
          onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
          style={{minWidth: "150px"}}
        />
        <TextInput
          type="date"
          label="Hasta (UTC)"
          value={filters.dateTo}
          disabled={disabled}
          onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
          style={{minWidth: "150px"}}
        />
        <Button
          type="submit"
          disabled={disabled}
          onClick={applyFilters}
          style={{marginTop: "1.5rem"}}
        >
          {loading ? "Cargando…" : "Aplicar filtros"}
        </Button>
      </Group>

      {dirty && <Alert color="blue">Aplica los filtros para actualizar la lista, exportar o imprimir.</Alert>}

      {requests.length === 0 ? (
        <Alert color="gray" title="Sin resultados">No hay peticiones con los filtros seleccionados.</Alert>
      ) : (
        <div style={{overflowX: "auto"}}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Petición</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Fecha (UTC)</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {requests.map((request) => (
                <Table.Tr key={request.id}>
                  <Table.Td>{request.name}</Table.Td>
                  <Table.Td style={{maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
                    {request.message.slice(0, 120)}{request.message.length > 120 ? "…" : ""}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={request.status === "NEW" ? "green" : "gray"}>
                      {prayerStatusLabel(request)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{request.createdAt.slice(0, 10)}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button
                        variant="subtle"
                        size="xs"
                        onClick={() => setSelected(request)}
                        disabled={disabled}
                      >
                        Ver detalle
                      </Button>
                      {isCurrentPrayer(request) && (
                        <Button
                          variant="subtle"
                          size="xs"
                          disabled={disabled}
                          onClick={() => changeStatus(request)}
                        >
                          {request.status === "NEW" ? "Marcar presentada" : "Volver nueva"}
                        </Button>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      )}

      <Dialog
        opened={selected !== null}
        onClose={() => setSelected(null)}
        title="Detalle de petición"
      >
        {selected && (
          <Stack gap="md">
            <div>
              <h3 style={{margin: "0 0 0.5rem"}}>{selected.name}</h3>
              <p style={{margin: 0, color: "var(--muted)", fontSize: "0.9rem"}}>
                <time dateTime={selected.createdAt}>
                  {selected.createdAt.slice(0, 10)} (UTC) · {prayerStatusLabel(selected)}
                </time>
              </p>
            </div>
            <div style={{backgroundColor: "var(--mist)", padding: "1rem", borderRadius: "4px", whiteSpace: "pre-wrap", lineHeight: 1.6}}>
              {selected.message}
            </div>
            {isCurrentPrayer(selected) && (
              <Button
                variant="outline"
                disabled={disabled}
                onClick={() => changeStatus(selected)}
              >
                {saving ? "Guardando…" : selected.status === "NEW" ? "Marcar presentada" : "Volver nueva"}
              </Button>
            )}
            {message && <Alert role="status">{message}</Alert>}
          </Stack>
        )}
      </Dialog>
    </Stack>
  );
}
