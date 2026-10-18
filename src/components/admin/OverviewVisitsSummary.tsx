"use client";

import Link from "next/link";
import {IconChartBar, IconExternalLink, IconGlobe, IconTrendingUp, IconUsers} from "@tabler/icons-react";
import type {ReactNode} from "react";
import {useAdminShell} from "@/components/admin/AdminShellProvider";
import {hasAnyViews, type OverviewSummary} from "@/lib/analytics/summary";

function Kpi({icon, label, value, hint}: {icon: ReactNode; label: string; value: string; hint?: string}) {
  return (
    <div className="admin-summary-card">
      <span className="admin-card-icon" aria-hidden>{icon}</span>
      <span>{label}</span>
      <strong className="admin-overview-value">{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

export function OverviewVisitsSummary({summary}: {summary: OverviewSummary}) {
  const {locale, t} = useAdminShell();
  const ov = t.overview;
  const max = Math.max(1, ...summary.daily.map((point) => point.count));
  const hasVisits = hasAnyViews(summary.daily);
  const numberFormat = new Intl.NumberFormat(locale);
  const formatDay = (value: string) =>
    new Date(`${value}T00:00:00.000Z`).toLocaleDateString(locale, {month: "short", day: "numeric", timeZone: "UTC"});

  return (
    <section className="admin-section admin-overview-visits" aria-labelledby="admin-overview-visits-title">
      <div className="admin-section-heading">
        <div>
          <h2 id="admin-overview-visits-title">{ov.title}</h2>
          <p>{ov.subtitle}</p>
        </div>
        <div className="admin-section-actions">
          <Link className="admin-action-link" href="/admin/visits">
            <IconExternalLink size={16} aria-hidden />
            <span>{ov.viewDetailed}</span>
          </Link>
        </div>
      </div>

      <div className="admin-summary-grid">
        <Kpi icon={<IconChartBar size={22} stroke={1.75} />} label={ov.pageViews} value={numberFormat.format(summary.pageViews)} />
        <Kpi icon={<IconUsers size={22} stroke={1.75} />} label={ov.uniqueSessions} value={numberFormat.format(summary.uniqueSessions)} />
        <Kpi
          icon={<IconTrendingUp size={22} stroke={1.75} />}
          label={ov.topPage}
          value={summary.topPage ? summary.topPage.label : "—"}
          hint={summary.topPage ? numberFormat.format(summary.topPage.count) : undefined}
        />
        <Kpi
          icon={<IconGlobe size={22} stroke={1.75} />}
          label={ov.topCountry}
          value={summary.geoAvailable && summary.topCountry ? summary.topCountry.label : "—"}
          hint={summary.geoAvailable ? undefined : ov.geoUnavailable}
        />
      </div>

      <div className="admin-overview-chart">
        <h3>{ov.dailyTitle}</h3>
        {hasVisits ? null : <p className="admin-empty" role="status">{ov.noVisits}</p>}
        <div className="admin-bar-chart" aria-hidden="true">
          {summary.daily.map((point) => (
            <div key={point.date} className="admin-bar" title={`${formatDay(point.date)}: ${point.count}`}>
              <span className="admin-bar-fill" style={{height: `${Math.round((point.count / max) * 100)}%`}} />
            </div>
          ))}
        </div>
        <table className="admin-sr-only">
          <caption>{ov.dailyCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{ov.tableDate}</th>
              <th scope="col">{ov.tableViews}</th>
            </tr>
          </thead>
          <tbody>
            {summary.daily.map((point) => (
              <tr key={point.date}>
                <th scope="row">{formatDay(point.date)}</th>
                <td>{numberFormat.format(point.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
