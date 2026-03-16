'use client';

import { formatPercent } from '@/lib/utils';

interface ConcentrationGaugeProps {
  concentration: {
    hhiByPosition: number;
    hhiByBroker: number;
    effectivePositions: number;
    effectiveBrokers: number;
    topPositions: Array<{ name: string; weight: number }>;
    positionCount: number;
  };
}

function hhiLevel(hhi: number): { label: string; color: string } {
  if (hhi < 0.15) return { label: 'Diversificado', color: 'text-green-600' };
  if (hhi < 0.25) return { label: 'Moderado', color: 'text-yellow-600' };
  return { label: 'Concentrado', color: 'text-red-600' };
}

export function ConcentrationGauge({ concentration }: ConcentrationGaugeProps) {
  const posLevel = hhiLevel(concentration.hhiByPosition);
  const brokerLevel = hhiLevel(concentration.hhiByBroker);

  return (
    <div className="space-y-5">
      {/* HHI metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">HHI por posição</p>
          <p className="text-lg font-bold tabular-nums">{(concentration.hhiByPosition * 10000).toFixed(0)}</p>
          <p className={`text-xs font-medium ${posLevel.color}`}>{posLevel.label}</p>
          <p className="text-[10px] text-muted-foreground">
            {concentration.positionCount} posições → {concentration.effectivePositions} efetivas
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">HHI por corretora</p>
          <p className="text-lg font-bold tabular-nums">{(concentration.hhiByBroker * 10000).toFixed(0)}</p>
          <p className={`text-xs font-medium ${brokerLevel.color}`}>{brokerLevel.label}</p>
          <p className="text-[10px] text-muted-foreground">
            → {concentration.effectiveBrokers} corretoras efetivas
          </p>
        </div>
      </div>

      {/* Top positions bar */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Top 10 posições por peso</p>
        {concentration.topPositions.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="text-xs w-16 text-right tabular-nums font-medium truncate" title={p.name}>
              {p.name}
            </span>
            <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-sm"
                style={{ width: `${Math.min(p.weight * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground w-12 text-right">
              {formatPercent(p.weight)}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground">
        HHI: 0 = totalmente diversificado, 10000 = concentrado num único ativo. Valores abaixo de 1500 são considerados diversificados.
      </p>
    </div>
  );
}
