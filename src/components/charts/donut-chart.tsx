'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';

const COLORS = [
  '#0f172a', // slate-900
  '#334155', // slate-700
  '#64748b', // slate-500
  '#94a3b8', // slate-400
  '#cbd5e1', // slate-300
  '#e2e8f0', // slate-200
  '#f1f5f9', // slate-100
  '#475569', // slate-600
];

const COLORS_GREEN = [
  '#009668', // emerald deep
  '#10b981', // emerald-500
  '#34d399', // emerald-400
  '#6ee7b7', // emerald-300
  '#a7f3d0', // emerald-200
  '#d1fae5', // emerald-100
  '#059669', // emerald-600
  '#047857', // emerald-700
];

interface DonutChartProps {
  data: Array<{ name: string; value: number }>;
  colorScheme?: 'slate' | 'green';
}

export function DonutChart({ data, colorScheme = 'slate' }: DonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Sem dados
      </div>
    );
  }

  const colors = colorScheme === 'green' ? COLORS_GREEN : COLORS;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const sorted = [...data].sort((a, b) => b.value - a.value);

  // Top item for center label (or hovered item)
  const topItem = sorted[0];
  const centerItem = hoveredIndex !== null ? sorted[hoveredIndex] : topItem;
  const centerPct = total > 0 ? ((centerItem.value / total) * 100).toFixed(0) : '0';

  // Build SVG donut segments
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  const segments = sorted.map((item, i) => {
    const pct = total > 0 ? item.value / total : 0;
    const dashArray = pct * circumference;
    const dashOffset = -cumulativeOffset * circumference;
    cumulativeOffset += pct;
    return { ...item, pct, dashArray, dashOffset, color: colors[i % colors.length], sortedIndex: i };
  });

  // Show max 4 items in legend, group rest as "Outros"
  const legendItems = sorted.length <= 5 ? sorted.map((s, i) => ({ ...s, sortedIndex: i })) : [
    ...sorted.slice(0, 4).map((s, i) => ({ ...s, sortedIndex: i })),
    {
      name: 'Outros',
      value: sorted.slice(4).reduce((s, d) => s + d.value, 0),
      sortedIndex: -1,
    },
  ];

  return (
    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
      {/* Donut SVG */}
      <div className="relative w-44 h-44 shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" fill="transparent" r={radius} stroke="#f2f4f6" strokeWidth="4" />
          {segments.map((seg) => (
            <circle
              key={seg.name}
              cx="18"
              cy="18"
              fill="transparent"
              r={radius}
              stroke={seg.color}
              strokeWidth="4"
              strokeDasharray={`${seg.dashArray} ${circumference - seg.dashArray}`}
              strokeDashoffset={seg.dashOffset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] text-slate-500 font-medium transition-all duration-200">{centerItem.name}</span>
          <span className="text-lg font-bold text-black transition-all duration-200">{centerPct}%</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-grow space-y-3 w-full">
        {legendItems.map((item, i) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
          const isHovered = hoveredIndex === item.sortedIndex;
          const isDimmed = hoveredIndex !== null && !isHovered;
          return (
            <div
              key={item.name}
              className={`flex items-center justify-between cursor-default transition-opacity duration-200 ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
              onMouseEnter={() => item.sortedIndex >= 0 ? setHoveredIndex(item.sortedIndex) : null}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full shrink-0 transition-transform duration-200"
                  style={{
                    backgroundColor: colors[i % colors.length],
                    transform: isHovered ? 'scale(1.4)' : 'scale(1)',
                  }}
                />
                <span className="text-sm font-medium text-slate-600">{item.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-black tabular-nums text-right w-14">{pct}%</span>
                <span className="text-xs text-slate-400 tabular-nums hidden sm:inline text-right w-24">
                  {formatCurrency(item.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
