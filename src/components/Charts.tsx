import React, { useState } from 'react';

export interface LineChartPoint {
  label: string;
  value: number;
  subtitle?: string;
}

export function LinePerformanceChart({
  data,
  height = 220,
  unit = '%',
}: {
  data: LineChartPoint[];
  height?: number;
  unit?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-zinc-500 dark:text-[#837F9C]">
        No data points recorded yet.
      </div>
    );
  }

  const width = 640;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxVal = 100;
  const minVal = 0;

  const coords = data.map((pt, i) => {
    const x =
      data.length === 1
        ? padLeft + plotW / 2
        : padLeft + (i / (data.length - 1)) * plotW;
    const clamped = Math.max(minVal, Math.min(maxVal, pt.value));
    const y = padTop + plotH - ((clamped - minVal) / (maxVal - minVal)) * plotH;
    return { x, y, pt };
  });

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const areaPath =
    coords.length > 0
      ? `M ${coords[0].x},${padTop + plotH} L ${coords
          .map((c) => `${c.x},${c.y}`)
          .join(' L ')} L ${coords[coords.length - 1].x},${padTop + plotH} Z`
      : '';

  const hovered = hoveredIdx !== null ? coords[hoveredIdx] : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Performance trend line chart"
      >
        <defs>
          <linearGradient id="purpleAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {[0, 25, 50, 75, 100].map((tick) => {
          const y = padTop + plotH - (tick / 100) * plotH;
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                className="stroke-zinc-200 dark:stroke-[#232136]"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-zinc-400 dark:fill-[#7D7996] text-[10px] font-mono tabular-nums"
              >
                {tick}
                {unit}
              </text>
            </g>
          );
        })}

        {coords.length > 1 && <path d={areaPath} fill="url(#purpleAreaGrad)" />}

        {coords.length > 1 && (
          <polyline
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polyline}
          />
        )}

        {coords.map((c, idx) => (
          <g key={idx}>
            {idx === 0 ||
            idx === coords.length - 1 ||
            coords.length <= 8 ||
            idx % Math.ceil(coords.length / 6) === 0 ? (
              <text
                x={c.x}
                y={height - 10}
                textAnchor="middle"
                className="fill-zinc-400 dark:fill-[#7D7996] text-[10px] font-mono"
              >
                {c.pt.label}
              </text>
            ) : null}

            <circle
              cx={c.x}
              cy={c.y}
              r={hoveredIdx === idx ? 6 : 4}
              className="fill-violet-500 stroke-white dark:stroke-[#0E0E16] cursor-pointer transition-all"
              strokeWidth="2"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          </g>
        ))}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 px-3 py-2 rounded-lg bg-zinc-900 dark:bg-[#1B192B] text-white border border-violet-500/40 shadow-lg text-xs"
          style={{
            left: `${Math.min(82, Math.max(8, (hovered.x / width) * 100))}%`,
            top: `${Math.max(4, (hovered.y / height) * 100 - 22)}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold font-mono tabular-nums text-violet-300">
            {hovered.pt.value.toFixed(1)}
            {unit}
          </div>
          {hovered.pt.subtitle && (
            <div className="text-[11px] text-zinc-300 whitespace-nowrap">
              {hovered.pt.subtitle}
            </div>
          )}
          <div className="text-[10px] text-zinc-400">{hovered.pt.label}</div>
        </div>
      )}
    </div>
  );
}

export interface BarChartDatum {
  label: string;
  value: number;
  color?: string;
  subtitle?: string;
}

export function BarComparisonChart({
  data,
  maxValue = 100,
  unit = '%',
  goalLine,
}: {
  data: BarChartDatum[];
  maxValue?: number;
  unit?: string;
  goalLine?: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-zinc-500 dark:text-[#837F9C]">
        No data available yet.
      </div>
    );
  }

  const effectiveMax = Math.max(
    maxValue,
    ...data.map((d) => d.value),
    goalLine || 0,
    1
  );

  const width = 640;
  const height = 220;
  const padLeft = 42;
  const padRight = 16;
  const padTop = 20;
  const padBottom = 38;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const slotW = plotW / data.length;
  const barW = Math.min(44, Math.max(14, slotW * 0.56));

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Comparison bar chart"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const val = Math.round(effectiveMax * frac);
          const y = padTop + plotH - frac * plotH;
          return (
            <g key={frac}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                className="stroke-zinc-200 dark:stroke-[#232136]"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-zinc-400 dark:fill-[#7D7996] text-[10px] font-mono tabular-nums"
              >
                {val}
                {unit}
              </text>
            </g>
          );
        })}

        {goalLine !== undefined && goalLine > 0 && (
          <line
            x1={padLeft}
            y1={padTop + plotH - (Math.min(goalLine, effectiveMax) / effectiveMax) * plotH}
            x2={width - padRight}
            y2={padTop + plotH - (Math.min(goalLine, effectiveMax) / effectiveMax) * plotH}
            stroke="#C084FC"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
        )}

        {data.map((d, idx) => {
          const h = Math.max(2, (d.value / effectiveMax) * plotH);
          const x = padLeft + idx * slotW + (slotW - barW) / 2;
          const y = padTop + plotH - h;
          const fill = d.color || '#8B5CF6';
          return (
            <g
              key={d.label + idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx="6"
                fill={fill}
                opacity={hoveredIdx === null || hoveredIdx === idx ? 0.92 : 0.45}
              />
              <text
                x={x + barW / 2}
                y={height - 12}
                textAnchor="middle"
                className="fill-zinc-500 dark:fill-[#9591AD] text-[10px]"
              >
                {d.label.length > 10 ? d.label.slice(0, 9) + '…' : d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          className="pointer-events-none absolute z-10 px-3 py-2 rounded-lg bg-zinc-900 dark:bg-[#1B192B] text-white border border-violet-500/40 shadow-lg text-xs"
          style={{
            left: `${Math.min(
              85,
              Math.max(15, ((padLeft + (hoveredIdx + 0.5) * slotW) / width) * 100)
            )}%`,
            top: '6px',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-semibold text-white">{data[hoveredIdx].label}</div>
          <div className="font-mono tabular-nums text-violet-300">
            {Number.isInteger(data[hoveredIdx].value)
              ? data[hoveredIdx].value
              : data[hoveredIdx].value.toFixed(1)}
            {unit}
          </div>
          {data[hoveredIdx].subtitle && (
            <div className="text-[11px] text-zinc-400">
              {data[hoveredIdx].subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
