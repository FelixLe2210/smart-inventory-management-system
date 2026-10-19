/**
 * Quy tắc fallback cho các API tổng hợp (Dashboard KPI / Alert / Report).
 * Chỉ khi endpoint CHƯA TỒN TẠI mới được phép fallback sang tính tại client;
 * mọi lỗi khác (401/403/500/mất mạng...) phải được báo ra cho người dùng.
 */
export const NOT_IMPLEMENTED_STATUSES = [404, 405, 501];

export function isEndpointMissing(err) {
  return NOT_IMPLEMENTED_STATUSES.includes(err?.status);
}

/** Bỏ các tham số rỗng / "all" để không gửi lên query string. */
export function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all'
    )
  );
}
