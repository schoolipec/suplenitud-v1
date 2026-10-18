"use client";

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
  const {page, totalPages, totalItems, pageSize} = pagination;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const rangeStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = totalItems === 0 ? 0 : Math.min(page * pageSize, totalItems);

  return (
    <nav className="admin-pagination" aria-label="User list pagination">
      <div className="admin-pagination-info">
        <span>
          {rangeStart}–{rangeEnd} of {totalItems}
        </span>
      </div>
      <div className="admin-pagination-controls">
        <button
          type="button"
          className="admin-pagination-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || !hasPrev}
          aria-label="Previous page"
        >
          Previous
        </button>
        <span className="admin-pagination-status" aria-live="polite">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="admin-pagination-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || !hasNext}
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
