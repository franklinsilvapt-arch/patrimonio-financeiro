import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth/get-user';
import {
  calculateTTWROR,
  annualizeReturn,
  calculatePeriodReturns,
  calculateMaxDrawdown,
  calculateVolatility,
  type SnapshotPoint,
} from '@/lib/performance';

export async function GET(request: NextRequest) {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const scope = request.nextUrl.searchParams.get('scope'); // "personal", "business", or null

    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });

    if (snapshots.length === 0) {
      return NextResponse.json({
        ttwror: null,
        annualizedReturn: null,
        maxDrawdown: 0,
        volatility: null,
        periodReturns: { '1m': null, '3m': null, '6m': null, '1y': null, ytd: null, total: null },
        snapshotCount: 0,
        firstDate: null,
        lastDate: null,
      });
    }

    // For scoped views, skip snapshots where the scope value was never recorded (null = no data yet)
    const scopedSnapshots = scope === 'business'
      ? snapshots.filter((s) => s.businessValue != null)
      : scope === 'personal'
        ? snapshots.filter((s) => s.personalValue != null)
        : snapshots;

    const points: SnapshotPoint[] = scopedSnapshots.map((s) => ({
      date: s.date,
      totalValue: scope === 'personal'
        ? (s.personalValue ?? s.totalValue)
        : scope === 'business'
          ? (s.businessValue ?? 0)
          : s.totalValue,
    }));

    if (points.length === 0) {
      return NextResponse.json({
        ttwror: null,
        annualizedReturn: null,
        maxDrawdown: 0,
        volatility: null,
        periodReturns: { '1m': null, '3m': null, '6m': null, '1y': null, ytd: null, total: null },
        snapshotCount: 0,
        firstDate: null,
        lastDate: null,
      });
    }

    const ttwror = calculateTTWROR(points);
    const firstDate = points[0].date;
    const lastDate = points[points.length - 1].date;
    const daySpan = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
    const annualized = ttwror !== null ? annualizeReturn(ttwror, daySpan) : null;

    // Build period date labels (from → to)
    const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
    const periodDates: Record<string, string> = {};
    const addPeriodDate = (key: string, daysAgo: number) => {
      const target = new Date(lastDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      // find closest snapshot before target
      let closest = points[0];
      for (const p of points) {
        if (p.date <= target) closest = p;
      }
      periodDates[key] = `${fmtDate(closest.date)} → ${fmtDate(lastDate)}`;
    };
    addPeriodDate('1m', 30);
    addPeriodDate('3m', 90);
    addPeriodDate('6m', 180);
    addPeriodDate('1y', 365);
    // YTD
    const yearStart = new Date(lastDate.getFullYear(), 0, 1);
    let ytdClosest = points[0];
    for (const p of points) {
      if (p.date <= yearStart) ytdClosest = p;
    }
    periodDates['ytd'] = `${fmtDate(ytdClosest.date)} → ${fmtDate(lastDate)}`;
    periodDates['total'] = `${fmtDate(firstDate)} → ${fmtDate(lastDate)}`;

    // Calendar year period dates
    const firstYear = firstDate.getFullYear();
    const lastYear = lastDate.getFullYear();
    for (let year = firstYear; year <= lastYear; year++) {
      const yearBegin = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59);
      let yearStartSnap = points[0];
      for (const p of points) {
        if (p.date <= yearBegin) yearStartSnap = p;
      }
      let yearEndSnap = points[points.length - 1];
      if (year < lastYear) {
        for (const p of points) {
          if (p.date <= yearEnd) yearEndSnap = p;
        }
      }
      periodDates[`year_${year}`] = `${fmtDate(yearStartSnap.date)} → ${fmtDate(yearEndSnap.date)}`;
    }

    return NextResponse.json({
      ttwror,
      annualizedReturn: annualized,
      maxDrawdown: calculateMaxDrawdown(points),
      volatility: calculateVolatility(points),
      periodReturns: calculatePeriodReturns(points),
      periodDates,
      snapshotCount: snapshots.length,
      firstDate: firstDate.toISOString(),
      lastDate: lastDate.toISOString(),
    });
  } catch (error) {
    console.error('Error calculating performance:', error);
    return NextResponse.json({ error: 'Failed to calculate performance' }, { status: 500 });
  }
}
