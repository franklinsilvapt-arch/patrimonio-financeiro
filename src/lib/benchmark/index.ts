// ---------------------------------------------------------------------------
// Benchmark comparison – compares portfolio performance against an index
// ---------------------------------------------------------------------------

export interface BenchmarkPoint {
  date: string;
  portfolioValue: number;
  benchmarkValue: number;
  portfolioReturn: number; // cumulative return from start
  benchmarkReturn: number; // cumulative return from start
}

/**
 * Normalize a series to start at 100 (index-style).
 * This allows comparing portfolio vs benchmark regardless of absolute values.
 */
export function normalizeToBase100(
  portfolioSnapshots: Array<{ date: string; value: number }>,
  benchmarkPrices: Array<{ date: string; close: number }>,
): BenchmarkPoint[] {
  if (portfolioSnapshots.length === 0 || benchmarkPrices.length === 0) return [];

  // Create a map of benchmark prices by date
  const benchmarkMap = new Map<string, number>();
  for (const b of benchmarkPrices) {
    benchmarkMap.set(b.date, b.close);
  }

  const sorted = [...portfolioSnapshots].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const firstPortfolio = sorted[0].value;
  // Find closest benchmark price to first portfolio date
  let firstBenchmark: number | null = null;
  const firstDate = new Date(sorted[0].date);
  for (let daysBack = 0; daysBack <= 7; daysBack++) {
    const checkDate = new Date(firstDate.getTime() - daysBack * 86400000);
    const dateStr = checkDate.toISOString().split('T')[0];
    if (benchmarkMap.has(dateStr)) {
      firstBenchmark = benchmarkMap.get(dateStr)!;
      break;
    }
  }

  if (!firstBenchmark || firstPortfolio <= 0) return [];

  const result: BenchmarkPoint[] = [];

  for (const snap of sorted) {
    // Find closest benchmark price (look back up to 7 days for weekends)
    let benchPrice: number | null = null;
    const snapDate = new Date(snap.date);
    for (let daysBack = 0; daysBack <= 7; daysBack++) {
      const checkDate = new Date(snapDate.getTime() - daysBack * 86400000);
      const dateStr = checkDate.toISOString().split('T')[0];
      if (benchmarkMap.has(dateStr)) {
        benchPrice = benchmarkMap.get(dateStr)!;
        break;
      }
    }

    if (benchPrice === null) continue;

    result.push({
      date: snap.date,
      portfolioValue: (snap.value / firstPortfolio) * 100,
      benchmarkValue: (benchPrice / firstBenchmark) * 100,
      portfolioReturn: (snap.value - firstPortfolio) / firstPortfolio,
      benchmarkReturn: (benchPrice - firstBenchmark) / firstBenchmark,
    });
  }

  return result;
}
