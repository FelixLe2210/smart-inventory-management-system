/**
 * Tải một chuỗi văn bản về máy (dùng cho xuất CSV).
 * Thêm BOM UTF-8 để Excel hiển thị đúng tiếng Việt.
 */
export function downloadTextFile(filename, content, mimeType = 'text/csv;charset=utf-8') {
  const blob = new Blob(['\uFEFF', content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Tên file kèm ngày, ví dụ: bao-cao-ton-kho_2026-10-19.csv */
export function datedFilename(base, ext = 'csv', date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${base}_${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.${ext}`;
}
