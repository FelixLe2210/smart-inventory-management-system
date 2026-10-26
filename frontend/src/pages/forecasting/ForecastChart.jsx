import { useMemo, useRef, useState } from 'react';

const WIDTH = 800;
const HEIGHT = 320;
const PADDING = { top: 24, right: 24, bottom: 48, left: 58 };
const TICK_COUNT = 4;

function formatDate(date) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatWeekday(date) {
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`)
  );
}

function formatQuantity(value, digits = 0) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value);
}

/** Bước trục Y "đẹp" (1, 2, 5 × 10^n) để nhãn dễ đọc. */
function niceStep(maxValue) {
  const raw = maxValue / TICK_COUNT;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}

/** Chọn tối đa ~7 nhãn ngày, luôn có ngày đầu và cuối. */
function pickLabelIndexes(length) {
  if (length <= 7) return [...Array(length).keys()];
  const step = Math.ceil((length - 1) / 6);
  const indexes = [];
  for (let i = 0; i < length - 1; i += step) indexes.push(i);
  if (length - 1 - indexes[indexes.length - 1] < step / 2) indexes.pop();
  indexes.push(length - 1);
  return indexes;
}

export default function ForecastChart({ predictions, unit = 'đơn vị', average = null }) {
  const svgRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(null);

  const geometry = useMemo(() => {
    const plotWidth = WIDTH - PADDING.left - PADDING.right;
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
    const maxValue = Math.max(
      1,
      ...predictions.flatMap((point) => [point.predictedDemand, point.upperBound ?? point.predictedDemand])
    );
    const step = niceStep(maxValue);
    const yMax = Math.ceil(maxValue / step) * step;
    const x = (index) =>
      predictions.length === 1
        ? PADDING.left + plotWidth / 2
        : PADDING.left + (index / (predictions.length - 1)) * plotWidth;
    const y = (value) => PADDING.top + plotHeight - (value / yMax) * plotHeight;

    const linePath = predictions
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point.predictedDemand)}`)
      .join(' ');
    const areaPath =
      predictions.length > 1
        ? `${linePath} L ${x(predictions.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`
        : null;

    const bounded = predictions
      .map((point, index) => ({ point, index }))
      .filter(({ point }) => point.lowerBound !== null && point.upperBound !== null);
    const confidencePath =
      bounded.length > 1
        ? [
            ...bounded.map(({ point, index }, i) => `${i === 0 ? 'M' : 'L'} ${x(index)} ${y(point.upperBound)}`),
            ...bounded
              .slice()
              .reverse()
              .map(({ point, index }) => `L ${x(index)} ${y(point.lowerBound)}`),
            'Z',
          ].join(' ')
        : null;

    return {
      plotWidth,
      x,
      y,
      yMax,
      step,
      linePath,
      areaPath,
      confidencePath,
      labelIndexes: pickLabelIndexes(predictions.length),
    };
  }, [predictions]);

  const { x, y, yMax, step } = geometry;

  const handlePointerMove = (event) => {
    const svg = svgRef.current;
    if (!svg || predictions.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const viewX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const ratio = (viewX - PADDING.left) / geometry.plotWidth;
    const index = Math.round(ratio * (predictions.length - 1));
    setActiveIndex(Math.max(0, Math.min(predictions.length - 1, index)));
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      setActiveIndex((current) =>
        Math.max(0, Math.min(predictions.length - 1, (current ?? (delta > 0 ? -1 : predictions.length)) + delta))
      );
    } else if (event.key === 'Escape') {
      setActiveIndex(null);
    }
  };

  const active = activeIndex !== null ? predictions[activeIndex] : null;
  const tooltipLeftPct = active ? (x(activeIndex) / WIDTH) * 100 : 0;
  const tooltipAlign = tooltipLeftPct > 70 ? 'right' : tooltipLeftPct < 30 ? 'left' : 'center';
  const ticks = [];
  for (let value = 0; value <= yMax + step / 2; value += step) ticks.push(value);

  return (
    <div className="relative w-full overflow-x-auto">
      <div className="relative min-w-[560px]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full cursor-crosshair touch-none select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          role="img"
          aria-label={`Biểu đồ dự báo nhu cầu ${predictions.length} ngày. Dùng phím mũi tên để xem từng ngày.`}
          tabIndex={0}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          onPointerLeave={() => setActiveIndex(null)}
          onKeyDown={handleKeyDown}
          onBlur={() => setActiveIndex(null)}
        >
          <defs>
            <linearGradient id="forecast-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((value, index) => (
            <g key={value}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={y(value)}
                y2={y(value)}
                stroke="#e2e8f0"
                strokeDasharray={index === 0 ? undefined : '4 5'}
              />
              <text x={PADDING.left - 10} y={y(value) + 4} textAnchor="end" fill="#64748b" fontSize="11">
                {formatQuantity(value)}
              </text>
            </g>
          ))}

          {geometry.confidencePath && (
            <path d={geometry.confidencePath} fill="#bfdbfe" opacity="0.6" className="animate-[fadeIn_0.5s_ease-out]" />
          )}
          {geometry.areaPath && <path d={geometry.areaPath} fill="url(#forecast-area)" />}

          {Number.isFinite(average) && average > 0 && (
            <g>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={y(average)}
                y2={y(average)}
                stroke="#7c3aed"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              <text x={WIDTH - PADDING.right} y={y(average) - 6} textAnchor="end" fill="#7c3aed" fontSize="11" fontWeight="600">
                TB {formatQuantity(average, 1)}
              </text>
            </g>
          )}

          <path
            d={geometry.linePath}
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            strokeDasharray="1"
            className="forecast-line-draw"
          />

          {active && (
            <line
              x1={x(activeIndex)}
              x2={x(activeIndex)}
              y1={PADDING.top}
              y2={y(0)}
              stroke="#94a3b8"
              strokeDasharray="3 3"
            />
          )}

          {predictions.map((point, index) => {
            const isActive = index === activeIndex;
            if (predictions.length > 31 && !isActive) return null;
            return (
              <circle
                key={point.date}
                cx={x(index)}
                cy={y(point.predictedDemand)}
                r={isActive ? 6 : 3.5}
                fill={isActive ? '#2563eb' : '#fff'}
                stroke="#2563eb"
                strokeWidth="2"
                style={{ transition: 'r 120ms ease-out' }}
              />
            );
          })}

          {geometry.labelIndexes.map((index) => (
            <text
              key={predictions[index].date}
              x={x(index)}
              y={HEIGHT - 16}
              textAnchor="middle"
              fill={index === activeIndex ? '#0f172a' : '#64748b'}
              fontSize="11"
              fontWeight={index === activeIndex ? '600' : '400'}
            >
              {formatDate(predictions[index].date)}
            </text>
          ))}
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-[180px] rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 text-xs shadow-lg backdrop-blur"
            style={{
              left: `${tooltipLeftPct}%`,
              transform:
                tooltipAlign === 'right'
                  ? 'translateX(calc(-100% - 12px))'
                  : tooltipAlign === 'left'
                    ? 'translateX(12px)'
                    : 'translateX(-50%)',
            }}
            role="status"
            aria-live="polite"
          >
            <p className="font-semibold capitalize text-slate-900">
              {formatWeekday(active.date)}, {formatDate(active.date)}
            </p>
            <p className="mt-1.5 flex items-center justify-between gap-4 text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                Dự báo
              </span>
              <span className="font-bold text-slate-900">
                {formatQuantity(active.predictedDemand, 1)} {unit}
              </span>
            </p>
            {active.lowerBound !== null && active.upperBound !== null && (
              <p className="mt-1 flex items-center justify-between gap-4 text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-blue-200" />
                  Khoảng 95%
                </span>
                <span className="font-medium text-slate-800">
                  {formatQuantity(active.lowerBound, 1)} – {formatQuantity(active.upperBound, 1)}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
