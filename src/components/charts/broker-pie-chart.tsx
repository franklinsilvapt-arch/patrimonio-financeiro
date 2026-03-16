'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils';

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

interface BrokerPieChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
}

const RADIAN = Math.PI / 180;

function renderCustomLabel({
  cx,
  cy,
  midAngle,
  outerRadius,
  name,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  name: string;
  percent: number;
}) {
  const radius = outerRadius + (percent < 0.05 ? 40 : 24);
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.01) return null;

  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fill="#6b7280"
    >
      {name} ({(percent * 100).toFixed(1)}%)
    </text>
  );
}

export function BrokerPieChart({ data }: BrokerPieChartProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Sem dados
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height={isMobile ? 350 : 400}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy={isMobile ? '45%' : '50%'}
          outerRadius={isMobile ? 90 : 110}
          dataKey="value"
          nameKey="name"
          label={isMobile ? undefined : renderCustomLabel}
          labelLine={isMobile ? false : { strokeWidth: 1, stroke: '#9ca3af' }}
        >
          {data.map((entry, index) => (
            <Cell
              key={entry.name}
              fill={entry.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{ fontSize: '0.875rem' }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          wrapperStyle={{ fontSize: '0.75rem' }}
          formatter={(value: string) => {
            const item = data.find((d) => d.name === value);
            const pct = item && total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
            return `${value} (${pct}%)`;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
