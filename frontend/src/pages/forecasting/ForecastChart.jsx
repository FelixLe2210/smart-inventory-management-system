const WIDTH = 800;
const HEIGHT = 320;
const PADDING = { top: 24, right: 24, bottom: 48, left: 58 };

function formatDate(date) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatQuantity(value) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value);
}

export default function ForecastChart({ predictions }) {
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const maxValue = Math.max(
    1,
    ...predictions.flatMap((point) => [
      point.predictedDemand,
      point.upperBound ?? point.predictedDemand,
    ])
  );
  const yMax = Math.ceil(maxValue / 5) * 5 || 5;
  const x = (index) =>
    predictions.length === 1
      ? PADDING.left + plotWidth / 2
      : PADDING.left + (index / (predictions.length - 1)) * plotWidth;
  const y = (value) => PADDING.top + plotHeight - (value / yMax) * plotHeight;
  const linePath = predictions
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point.predictedDemand)}`)
    .join(' ');
  const boundedPredictions = predictions.filter(
    (point) => point.lowerBound !== null && point.upperBound !== null
  );
  const confidencePath =
    boundedPredictions.length > 1
      ? [
          ...boundedPredictions.map((point) => `L ${x(predictions.indexOf(point))} ${y(point.upperBound)}`),
          ...boundedPredictions
            .slice()
            .reverse()
            .map((point) => `L ${x(predictions.indexOf(point))} ${y(point.lowerBound)}`),
          'Z',
        ].join(' ').replace(/^L/, 'M')
      : null;
  const tickCount = 4;
  const labelIndexes = [...new Set([
    0,
    Math.floor((predictions.length - 1) / 3),
    Math.floor(((predictions.length - 1) * 2) / 3),
    predictions.length - 1,
  ])];

  return (
    <div className="w-full overflow-x-auto" role="img" aria-label="Biểu đồ dự báo nhu cầu theo ngày">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full min-w-[560px]"
        aria-hidden="true"
      >
        {[...Array(tickCount + 1)].map((_, index) => {
          const value = (yMax / tickCount) * index;
          const position = y(value);
          return (
            <g key={index}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={position}
                y2={position}
                stroke="#e2e8f0"
                strokeDasharray={index === 0 ? undefined : '4 5'}
              />
              <text
                x={PADDING.left - 10}
                y={position + 4}
                textAnchor="end"
                fill="#64748b"
                fontSize="11"
              >
                {formatQuantity(value)}
              </text>
            </g>
          );
        })}
        {confidencePath && <path d={confidencePath} fill="#bfdbfe" opacity="0.55" />}
        <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {predictions.map((point, index) => (
          <circle
            key={point.date}
            cx={x(index)}
            cy={y(point.predictedDemand)}
            r="4"
            fill="#fff"
            stroke="#2563eb"
            strokeWidth="2"
          >
            <title>{`${formatDate(point.date)}: ${formatQuantity(point.predictedDemand)}`}</title>
          </circle>
        ))}
        {labelIndexes.map((index) => (
          <text
            key={predictions[index].date}
            x={x(index)}
            y={HEIGHT - 16}
            textAnchor="middle"
            fill="#64748b"
            fontSize="11"
          >
            {formatDate(predictions[index].date)}
          </text>
        ))}
      </svg>
    </div>
  );
}
