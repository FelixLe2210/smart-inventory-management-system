/** Logic thuần của chế độ giao diện: tùy chọn người dùng là 'light' | 'dark' | 'system'. */
export const THEME_STORAGE_KEY = 'smart_inventory_theme';
export const PREFERENCES = ['light', 'dark', 'system'];

export function normalizePreference(value) {
  return PREFERENCES.includes(value) ? value : 'system';
}

/** Chế độ thực tế đang hiển thị: 'light' | 'dark'. */
export function resolveTheme(preference, systemPrefersDark) {
  const pref = normalizePreference(preference);
  if (pref === 'system') return systemPrefersDark ? 'dark' : 'light';
  return pref;
}

/**
 * Chế độ sẽ hiện sau một lần bấm nút: luôn ngược với chế độ ĐANG hiển thị.
 * (Tính từ chế độ hiển thị chứ không từ lựa chọn đã lưu, nên khi đang "theo hệ thống" bấm một lần vẫn đổi ngay.)
 */
export function oppositeTheme(preference, systemPrefersDark) {
  return resolveTheme(preference, systemPrefersDark) === 'dark' ? 'light' : 'dark';
}
