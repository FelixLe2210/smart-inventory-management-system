// Sinh src/theme.generated.css: biến CSS cho bảng màu sáng/tối.
//   node scripts/gen-theme.mjs
// Tailwind đọc các biến này qua tailwind.config.js, nên mọi lớp bg-*/text-*/border-* cũ tự đổi theo chế độ.
import colors from 'tailwindcss/colors.js';
import { writeFileSync } from 'node:fs';

const hex2rgb = (h) => {
  const n = h.replace('#', '');
  const f = n.length === 3 ? n.split('').map((c) => c + c).join('') : n;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)).join(' ');
};

// ── 1. Token Material (bảng teal "container") ──
const light = {
  'primary': '#0B6E80', 'on-primary': '#FFFFFF', 'primary-container': '#0F8397', 'on-primary-container': '#FFFFFF',
  'primary-fixed': '#C6EEF6', 'primary-fixed-dim': '#8AD3E3', 'on-primary-fixed': '#00252C', 'on-primary-fixed-variant': '#00525F',
  'inverse-primary': '#7ED0E2', 'surface-tint': '#0B6E80',
  'secondary': '#52646F', 'on-secondary': '#FFFFFF', 'secondary-container': '#D6E4EB', 'on-secondary-container': '#2C3E49',
  'secondary-fixed': '#D6E4EB', 'secondary-fixed-dim': '#B7C8D2', 'on-secondary-fixed': '#0B1D27', 'on-secondary-fixed-variant': '#3A4D59',
  'tertiary': '#3C5AA6', 'on-tertiary': '#FFFFFF', 'tertiary-container': '#4A69B8', 'on-tertiary-container': '#FFFFFF',
  'tertiary-fixed': '#DCE4FF', 'tertiary-fixed-dim': '#B3C4FA', 'on-tertiary-fixed': '#001849', 'on-tertiary-fixed-variant': '#26427F',
  'error': '#BA1A1A', 'on-error': '#FFFFFF', 'error-container': '#FFDAD6', 'on-error-container': '#93000A',
  'background': '#EFF3F5', 'on-background': '#0D1B24',
  'surface': '#EFF3F5', 'surface-dim': '#D5DEE3', 'surface-bright': '#F7FAFB',
  'surface-container-lowest': '#FFFFFF', 'surface-container-low': '#E8EEF1', 'surface-container': '#E0E8EC',
  'surface-container-high': '#D7E1E7', 'surface-container-highest': '#CDD9E0', 'surface-variant': '#D7E1E7',
  'on-surface': '#0D1B24', 'on-surface-variant': '#3D505C', 'outline': '#687B87', 'outline-variant': '#C3D0D7',
  'inverse-surface': '#1F323E', 'inverse-on-surface': '#E8F1F6',
  // Thanh điều hướng luôn là mảng màu mực đậm, cả ở chế độ sáng, để làm điểm nhận diện.
  'nav': '#0B1D28', 'nav-fg': '#C5D6DF', 'nav-muted': '#6E8A99', 'nav-hover': '#12303E', 'nav-active': '#164B5A', 'nav-active-fg': '#FFFFFF', 'nav-accent': '#4FD1E8', 'nav-line': '#1A3442',
};
const dark = {
  'primary': '#59C6DB', 'on-primary': '#00323B', 'primary-container': '#0F6B7C', 'on-primary-container': '#D3F4FA',
  'primary-fixed': '#C6EEF6', 'primary-fixed-dim': '#8AD3E3', 'on-primary-fixed': '#00252C', 'on-primary-fixed-variant': '#00525F',
  'inverse-primary': '#0B6E80', 'surface-tint': '#59C6DB',
  'secondary': '#A3B8C4', 'on-secondary': '#12262F', 'secondary-container': '#253945', 'on-secondary-container': '#C9DAE4',
  'secondary-fixed': '#D6E4EB', 'secondary-fixed-dim': '#B7C8D2', 'on-secondary-fixed': '#0B1D27', 'on-secondary-fixed-variant': '#3A4D59',
  'tertiary': '#A9BDFA', 'on-tertiary': '#0E2A6B', 'tertiary-container': '#3558A8', 'on-tertiary-container': '#DCE4FF',
  'tertiary-fixed': '#DCE4FF', 'tertiary-fixed-dim': '#B3C4FA', 'on-tertiary-fixed': '#001849', 'on-tertiary-fixed-variant': '#26427F',
  'error': '#FFB4AB', 'on-error': '#601410', 'error-container': '#5E1C1A', 'on-error-container': '#FFDAD6',
  'background': '#0A141B', 'on-background': '#E1ECF1',
  'surface': '#0A141B', 'surface-dim': '#070F14', 'surface-bright': '#223340',
  'surface-container-lowest': '#101D27', 'surface-container-low': '#0D1920', 'surface-container': '#16252F',
  'surface-container-high': '#1D2F3B', 'surface-container-highest': '#253A48', 'surface-variant': '#1D2F3B',
  'on-surface': '#E1ECF1', 'on-surface-variant': '#A6BAC6', 'outline': '#738A98', 'outline-variant': '#2B404E',
  'inverse-surface': '#E1ECF1', 'inverse-on-surface': '#1F323E',
  'nav': '#071118', 'nav-fg': '#C5D6DF', 'nav-muted': '#6E8A99', 'nav-hover': '#0F2330', 'nav-active': '#124151', 'nav-active-fg': '#FFFFFF', 'nav-accent': '#4FD1E8', 'nav-line': '#15303C',
};

// ── 2. Bảng màu mặc định của Tailwind: tách theo ngữ cảnh nền / chữ / viền ──
const families = ['slate', 'gray', 'red', 'amber', 'emerald', 'green', 'sky', 'blue', 'rose', 'orange', 'purple', 'indigo', 'yellow', 'teal', 'cyan', 'violet', 'pink'];
const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
// Chế độ tối: sắc nhạt (50-300) thành sắc tối đậm; sắc đậm làm chữ (700-950) thành sắc sáng.
const bgDark = { 50: '950', 100: '900', 200: '800', 300: '700' };            // nền: 400-950 giữ nguyên (nút có chữ trắng)
const bdDark = { 50: '900', 100: '800', 200: '800', 300: '700' };
const txDark = { 100: '900', 200: '800', 300: '700', 500: '400', 600: '400', 700: '300', 800: '200', 900: '100', 950: '50' };
const redText600 = '#E5484D';
// Chế độ sáng: chữ màu nhạt trên nền trắng khó đọc (tỉ lệ < 4.5), đẩy xuống một bậc cho các họ màu dễ bị nhạt.
const txLight = (f, s) => {
  if ((f === 'slate' || f === 'gray') && s === '400') return '500';
  if (f === 'amber' && s === '500') return '600';
  if (['amber', 'emerald', 'sky', 'orange', 'yellow', 'teal', 'cyan', 'green'].includes(f) && s === '600') return '700';
  return s;
};

let rootVars = '';
let darkVars = '';
for (const [k, v] of Object.entries(light)) rootVars += `  --${k}: ${hex2rgb(v)};\n`;
for (const [k, v] of Object.entries(dark)) darkVars += `  --${k}: ${hex2rgb(v)};\n`;
for (const f of families) {
  for (const s of shades) {
    const base = colors[f][s];
    rootVars += `  --bg-${f}-${s}: ${hex2rgb(base)};\n  --bd-${f}-${s}: ${hex2rgb(base)};\n  --tx-${f}-${s}: ${hex2rgb(colors[f][txLight(f, s)])};\n`;
    darkVars += `  --bg-${f}-${s}: ${hex2rgb(colors[f][bgDark[s] || s])};\n`;
    darkVars += `  --bd-${f}-${s}: ${hex2rgb(colors[f][bdDark[s] || s])};\n`;
    const tx = f === 'red' && s === '600' ? redText600 : colors[f][txDark[s] || s];
    darkVars += `  --tx-${f}-${s}: ${hex2rgb(tx)};\n`;
  }
}
const css = `/* TỆP SINH TỰ ĐỘNG bởi scripts/gen-theme.mjs, không sửa tay. */\n:root {\n  color-scheme: light;\n${rootVars}}\n\n.dark {\n  color-scheme: dark;\n${darkVars}}\n`;
writeFileSync(new URL('../src/theme.generated.css', import.meta.url), css);
console.log(`Đã sinh ${css.split('\n').length} dòng.`);
