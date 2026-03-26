// ---------------------------------------------------------------------------
// Performance metrics: TTWROR (True Time-Weighted Rate of Return)
// ---------------------------------------------------------------------------

export interface SnapshotPoint {
  date: Date;
  totalValue: number;
}

/**
 * Calculate True Time-Weighted Rate of Return (TTWROR).
 * Uses the chain-linking method across snapshot periods.
 * TTWROR = (V1/V0) * (V2/V1) * ... * (Vn/Vn-1) - 1
 *
 * This method eliminates the impact of cash flows (imports/withdrawals)
 * and measures pure investment performance.
 */
export function calculateTTWROR(snapshots: SnapshotPoint[]): number | null {
  if (snapshots.length < 2) return null;

  const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());

  let cumulativeReturn = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].totalValue;
    const curr = sorted[i].totalValue;
    if (prev <= 0) continue;
    cumulativeReturn *= curr / prev;
  }

  return cumulativeReturn - 1;
}

/**
 * Annualize a cumulative return over a given number of days.
 */
export function annualizeReturn(cumulativeReturn: number, days: number): number {
  if (days <= 0) return 0;
  return Math.pow(1 + cumulativeReturn, 365 / days) - 1;
}

/**
 * Calculate rolling returns for different periods.
 */
export function calculatePeriodReturns(
  snapshots: SnapshotPoint[]
): Record<string, number | null> {
  if (snapshots.length < 2) {
    return { '1m': null, '3m': null, '6m': null, '1y': null, ytd: null, total: null };
  }

  const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
  const latest = sorted[sorted.length - 1];
  const now = latest.date;

  const findClosestBefore = (targetDate: Date): SnapshotPoint | null => {
    let closest: SnapshotPoint | null = null;
    for (const s of sorted) {
      if (s.date <= targetDate) closest = s;
    }
    return closest;
  };

  const calcReturn = (daysAgo: number): number | null => {
    const target = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const start = findClosestBefore(target);
    if (!start || start.totalValue <= 0 || start === latest) return null;
    return (latest.totalValue - start.totalValue) / start.totalValue;
  };

  // YTD: from Jan 1 of current year
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const ytdStart = findClosestBefore(yearStart) || sorted[0];
  const ytd = ytdStart && ytdStart.totalValue > 0 && ytdStart !== latest
    ? (latest.totalValue - ytdStart.totalValue) / ytdStart.totalValue
    : null;

  // Total return
  const first = sorted[0];
  const total = first.totalValue > 0
    ? (latest.totalValue - first.totalValue) / first.totalValue
    : null;

  // Calendar year returns: for each complete year covered by the data
  const yearReturns: Record<string, number | null> = {};
  const firstYear = sorted[0].date.getFullYear();
  const lastYear = now.getFullYear();
  for (let year = firstYear; year <= lastYear; year++) {
    const yearBegin = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);
    const startSnap = findClosestBefore(yearBegin);
    // For the end: if year is current, use latest; otherwise find closest before Dec 31
    const endSnap = year < lastYear ? findClosestBefore(yearEnd) : latest;
    if (
      startSnap &&
      endSnap &&
      startSnap !== endSnap &&
      startSnap.totalValue > 0
    ) {
      yearReturns[`year_${year}`] =
        (endSnap.totalValue - startSnap.totalValue) / startSnap.totalValue;
    } else {
      yearReturns[`year_${year}`] = null;
    }
  }

  // 1m: fim do mês anterior (não "30 dias atrás")
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const prevMonthSnap = findClosestBefore(prevMonthEnd);
  const oneMonth = prevMonthSnap && prevMonthSnap.totalValue > 0 && prevMonthSnap !== latest
    ? (latest.totalValue - prevMonthSnap.totalValue) / prevMonthSnap.totalValue
    : null;

  return {
    '1m': oneMonth,
    '3m': calcReturn(90),
    '6m': calcReturn(180),
    '1y': calcReturn(365),
    ytd,
    total,
    ...yearReturns,
  };
}

/**
 * Calculate max drawdown from snapshots.
 */
export function calculateMaxDrawdown(snapshots: SnapshotPoint[]): number {
  if (snapshots.length < 2) return 0;

  const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
  let peak = sorted[0].totalValue;
  let maxDrawdown = 0;

  for (const s of sorted) {
    if (s.totalValue > peak) peak = s.totalValue;
    const drawdown = peak > 0 ? (peak - s.totalValue) / peak : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  return maxDrawdown;
}

/**
 * Calculate volatility (annualized standard deviation of period returns).
 */
export function calculateVolatility(snapshots: SnapshotPoint[]): number | null {
  if (snapshots.length < 3) return null;

  const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
  const returns: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].totalValue;
    if (prev > 0) {
      returns.push((sorted[i].totalValue - prev) / prev);
    }
  }

  if (returns.length < 2) return null;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);

  // Annualize: assume monthly snapshots (~12 per year)
  const avgDaysBetween = (sorted[sorted.length - 1].date.getTime() - sorted[0].date.getTime()) /
    (1000 * 60 * 60 * 24 * (sorted.length - 1));
  const periodsPerYear = 365 / avgDaysBetween;

  return stdDev * Math.sqrt(periodsPerYear);
}
