import { useEffect, useRef } from 'react';

/**
 * Nền toàn màn hình: nhu cầu bán theo ngày (cột), đường dự báo 18 ngày tới với vùng bất định loe dần.
 * Hình minh họa, không phải số liệu thật. Con trỏ chuột đi qua làm các cột sáng lên như một gợn sóng.
 */

const W = 1200;
const H = 420;
const PITCH = 20;
const BAR_W = 12;
const SCALE = 2.1;
const PAST_COUNT = 40;
const FORECAST_COUNT = 18;

const WEEK = [0, 6, 10, 4, 22, 38, 20];
const NOISE = [3, -2, 5, 0, -4, 2, 4, -1];
const PAST = Array.from({ length: PAST_COUNT }, (_, i) => 40 + i * 0.55 + WEEK[i % 7] + NOISE[i % NOISE.length]);
const FORECAST = Array.from({ length: FORECAST_COUNT }, (_, k) => {
  const i = PAST_COUNT + k;
  return 40 + i * 0.55 + WEEK[i % 7] + NOISE[i % NOISE.length] * 0.5;
});

const barX = (i) => 6 + i * PITCH;
const yOf = (value) => H - value * SCALE;
const f = (n) => n.toFixed(1);

/** Đường cong mượt qua các điểm (Catmull-Rom đổi sang Bézier). */
function curve(pts) {
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    d += ` C${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
}

const startX = barX(PAST_COUNT - 1) + BAR_W / 2;
const series = [{ x: startX, v: PAST[PAST_COUNT - 1], spread: 0 }].concat(
  FORECAST.map((v, k) => ({ x: startX + (k + 1) * PITCH, v, spread: v * (0.03 + 0.011 * (k + 1)) }))
);
const linePts = series.map((p) => ({ x: p.x, y: yOf(p.v) }));
const upperPts = series.map((p) => ({ x: p.x, y: yOf(p.v + p.spread) }));
const lowerPts = series.map((p) => ({ x: p.x, y: yOf(p.v - p.spread) })).reverse();
const linePath = curve(linePts);
const bandPath = `${curve(upperPts)} L${f(lowerPts[0].x)} ${f(lowerPts[0].y)} ${curve(lowerPts).replace(/^M[^C]*/, '')} Z`;
const end = linePts[linePts.length - 1];
const todayX = barX(PAST_COUNT - 1) + BAR_W + 4;
const BAR_COUNT = PAST_COUNT;

const baseOpacity = (i) => (i >= BAR_COUNT - 7 ? 0.2 : 0.1);

export default function ForecastScene() {
  const svgRef = useRef(null);

  // Gợn sáng theo con trỏ: chỉ đổi độ đậm của cột (không đụng transform đang dùng cho hoạt ảnh mọc lên).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const bars = Array.from(svg.querySelectorAll('rect[data-bar]'));
    let frame = 0;
    let pointerX = null;

    const paint = () => {
      frame = 0;
      const rect = svg.getBoundingClientRect();
      const x = pointerX === null ? null : ((pointerX - rect.left) / rect.width) * W;
      bars.forEach((bar, i) => {
        const cx = barX(i) + BAR_W / 2;
        const boost = x === null ? 0 : 0.34 * Math.exp(-(((cx - x) / 110) ** 2));
        bar.style.fillOpacity = String(baseOpacity(i) + boost);
      });
    };
    const onMove = (event) => {
      pointerX = event.clientX;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      pointerX = null;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    window.addEventListener('pointermove', onMove);
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0" aria-hidden="true">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" preserveAspectRatio="xMidYMax meet">
        {PAST.map((value, i) => (
          <rect
            key={i}
            data-bar
            className="scene-bar"
            style={{ '--i': i, fillOpacity: baseOpacity(i) }}
            x={barX(i)}
            y={yOf(value)}
            width={BAR_W}
            height={value * SCALE}
            rx="3"
            fill="rgb(var(--primary))"
          />
        ))}
        <line
          className="scene-today"
          x1={todayX}
          x2={todayX}
          y1={H * 0.28}
          y2={H}
          stroke="rgb(var(--primary) / 0.35)"
          strokeWidth="1.5"
          strokeDasharray="3 5"
        />
        <path className="scene-band" d={bandPath} fill="rgb(var(--primary) / 0.13)" />
        <path
          className="scene-line"
          d={linePath}
          pathLength="1"
          fill="none"
          stroke="rgb(var(--primary))"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle className="scene-pulse" cx={end.x} cy={end.y} r="5" fill="rgb(var(--primary))" />
        <circle className="scene-dot" cx={end.x} cy={end.y} r="5" fill="rgb(var(--primary))" />
      </svg>
    </div>
  );
}
