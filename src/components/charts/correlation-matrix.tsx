'use client';

interface CorrelationMatrixProps {
  assets: string[];
  matrix: Array<{ asset1: string; asset2: string; correlation: number }>;
}

function correlationColor(v: number): string {
  if (v >= 0.8) return 'bg-red-500 text-white';
  if (v >= 0.5) return 'bg-red-300 text-red-900';
  if (v >= 0.2) return 'bg-orange-200 text-orange-900';
  if (v >= -0.2) return 'bg-gray-100 text-gray-700';
  if (v >= -0.5) return 'bg-blue-200 text-blue-900';
  return 'bg-blue-500 text-white';
}

export function CorrelationMatrix({ assets, matrix }: CorrelationMatrixProps) {
  if (assets.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        Sem dados de preços suficientes para calcular correlações
      </div>
    );
  }

  // Build lookup: key "asset1|asset2" → correlation
  const lookup: Record<string, number> = {};
  for (const m of matrix) {
    lookup[`${m.asset1}|${m.asset2}`] = m.correlation;
    lookup[`${m.asset2}|${m.asset1}`] = m.correlation;
  }

  const getCorr = (a1: string, a2: string) => lookup[`${a1}|${a2}`] ?? 0;

  return (
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th className="p-1.5" />
            {assets.map((a) => (
              <th key={a} className="p-1.5 font-medium text-muted-foreground text-center min-w-[52px]">
                {a}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assets.map((row) => (
            <tr key={row}>
              <td className="p-1.5 font-medium text-muted-foreground text-right pr-2 whitespace-nowrap">
                {row}
              </td>
              {assets.map((col) => {
                const v = getCorr(row, col);
                return (
                  <td
                    key={col}
                    className={`p-1.5 text-center tabular-nums rounded-sm ${correlationColor(v)}`}
                    title={`${row} / ${col}: ${v.toFixed(3)}`}
                  >
                    {v.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> &lt; -0.5</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-200 inline-block" /> -0.5 a -0.2</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-100 border inline-block" /> -0.2 a 0.2</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-200 inline-block" /> 0.2 a 0.5</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-300 inline-block" /> 0.5 a 0.8</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> &gt; 0.8</span>
      </div>
    </div>
  );
}
