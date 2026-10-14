import {IconChartBar, IconGlobe, IconMapPin, IconUsers} from "@tabler/icons-react";

export type VisitsAggregate = {
  pageViews: number;
  uniqueSessions: number;
  fromInput: string;
  toInput: string;
  geoAvailable: boolean;
  topPages: {label: string; count: number}[];
  countries: {label: string; count: number}[];
  usStates: {label: string; count: number}[];
  locales: {label: string; count: number}[];
  devices: {label: string; count: number}[];
  referrers: {label: string; count: number}[];
};

function Section({title, rows, empty}: {title: string; rows: {label: string; count: number}[]; empty: string}) {
  return (
    <section className="admin-section">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="admin-empty">{empty}</p>
      ) : (
        <ul className="admin-audit-list">
          {rows.map((row) => (
            <li key={row.label}>
              <strong>{row.label}</strong>
              <span>{row.count} {row.count === 1 ? "visit" : "visits"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function VisitsDashboard({data}: {data: VisitsAggregate}) {
  return (
    <>
      <p className="admin-intro">
        Public visits only. Admin pages, APIs, internal routes, bots and signed-in sessions are never counted.
        Records stay aggregate: no IPs, no profiles, no precise locations.
      </p>
      <form className="admin-toolbar" method="get" action="/admin/visits">
        <div className="admin-toolbar-filters">
          <label htmlFor="visits-from">From</label>
          <input id="visits-from" type="date" name="from" defaultValue={data.fromInput} max={data.toInput} />
          <label htmlFor="visits-to">To</label>
          <input id="visits-to" type="date" name="to" defaultValue={data.toInput} max={data.toInput} />
          <button type="submit" className="admin-button-secondary admin-button-small">Apply range</button>
        </div>
        <span className={data.geoAvailable ? "admin-badge admin-badge-success" : "admin-badge admin-badge-muted"}>
          {data.geoAvailable ? "Geography: GeoLite2 active" : "Geography unavailable: GeoLite2 not configured"}
        </span>
      </form>
      <div className="admin-summary-grid">
        <div className="admin-summary-card">
          <IconChartBar className="admin-card-icon" size={22} stroke={1.75} aria-hidden />
          <span>Page views</span>
          <strong>{data.pageViews}</strong>
          <small>Public pages in range</small>
        </div>
        <div className="admin-summary-card">
          <IconUsers className="admin-card-icon" size={22} stroke={1.75} aria-hidden />
          <span>Unique sessions</span>
          <strong>{data.uniqueSessions}</strong>
          <small>Anonymous visitors</small>
        </div>
        <div className="admin-summary-card">
          <IconGlobe className="admin-card-icon" size={22} stroke={1.75} aria-hidden />
          <span>Countries</span>
          <strong>{data.countries.length}</strong>
          <small>With identified origin</small>
        </div>
        <div className="admin-summary-card">
          <IconMapPin className="admin-card-icon" size={22} stroke={1.75} aria-hidden />
          <span>US states</span>
          <strong>{data.usStates.length}</strong>
          <small>States with visits</small>
        </div>
      </div>
      <div className="admin-data-grid">
        <Section title="Top pages" rows={data.topPages} empty="No public page views in this range." />
        <Section title="Top countries" rows={data.countries} empty={data.geoAvailable ? "No identified origins in this range." : "Geography unavailable: configure GeoLite2 to see origins."} />
        <Section title="US states" rows={data.usStates} empty={data.geoAvailable ? "No US state visits in this range." : "Geography unavailable: configure GeoLite2 to see states."} />
        <Section title="Languages" rows={data.locales} empty="No visits in this range." />
        <Section title="Devices" rows={data.devices} empty="No visits in this range." />
        <Section title="Referrers" rows={data.referrers} empty="No external referrers in this range." />
      </div>
    </>
  );
}
