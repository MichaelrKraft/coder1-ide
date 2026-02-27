'use client';

interface DataPoint {
  label: string;
  value: number;
}

interface AdminSimpleChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
}

export default function AdminSimpleChart({
  data,
  height = 120,
  color = '#22d3ee',
  formatValue = (v) => String(v),
}: AdminSimpleChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const svgHeight = height;
  const svgWidth = 500;
  const barActualWidth = svgWidth / data.length;
  const padding = 4;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight + 24}`}
        className="w-full"
        style={{ height: svgHeight + 24 }}
      >
        {data.map((d, i) => {
          const barHeight = maxValue > 0 ? (d.value / maxValue) * svgHeight : 0;
          const x = i * barActualWidth + padding / 2;
          const y = svgHeight - barHeight;
          const w = barActualWidth - padding;

          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={w}
                height={barHeight}
                fill={color}
                opacity={0.8}
                rx={2}
              />
              {/* Hover tooltip via title */}
              <title>{d.label}: {formatValue(d.value)}</title>
              {/* Label */}
              <text
                x={x + w / 2}
                y={svgHeight + 16}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
              >
                {d.label.length > 5 ? d.label.slice(-5) : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
