"use client";

import {useAdminShell} from "@/components/admin/AdminShellProvider";

type Pagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export function AdminPagination({
  pagination,
  onPageChange,
  disabled = false,
}: {
  pagination: Pagination;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  const {locale} = useAdminShell();
  const l = locale === "es" ? {aria: "Paginación de usuarios", of: "de", previous: "Anterior", next: "Siguiente", page: "Página"} : {aria: "User list pagination", of: "of", previous: "Previous", next: "Next", page: "Page"};
  const {page, totalPages, totalItems, pageSize} = pagination;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const rangeStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = totalItems === 0 ? 0 : Math.min(page * pageSize, totalItems);

  return (
    <nav className="admin-pagination" aria-label={l.aria}>
      <div className="admin-pagination-info">
        <span>
          {rangeStart}–{rangeEnd} {l.of} {totalItems}
        </span>
      </div>
      <div className="admin-pagination-controls">
        <button
          type="button"
          className="admin-pagination-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || !hasPrev}
          aria-label={`${l.previous} ${l.page.toLowerCase()}`}
        >
          {l.previous}
        </button>
        <span className="admin-pagination-status" aria-live="polite">
          {l.page} {page} {l.of} {totalPages}
        </span>
        <button
          type="button"
          className="admin-pagination-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || !hasNext}
          aria-label={`${l.next} ${l.page.toLowerCase()}`}
        >
          {l.next}
        </button>
      </div>
    </nav>
  );
}
