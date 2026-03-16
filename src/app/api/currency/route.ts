import { NextRequest, NextResponse } from 'next/server';
import { fetchLatestRates, fetchHistoricalRates, convertCurrency } from '@/lib/currency/ecb';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const historical = searchParams.get('historical') === 'true';

  try {
    if (historical) {
      const rates = await fetchHistoricalRates();
      return NextResponse.json({ rates });
    }

    const data = await fetchLatestRates();
    if (!data) {
      return NextResponse.json({ error: 'Failed to fetch ECB rates' }, { status: 502 });
    }

    return NextResponse.json({
      date: data.date,
      rates: data.rates,
    });
  } catch (error) {
    console.error('Error fetching currency rates:', error);
    return NextResponse.json({ error: 'Failed to fetch rates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { amount, from, to } = await request.json();
    if (!amount || !from || !to) {
      return NextResponse.json({ error: 'amount, from, to required' }, { status: 400 });
    }

    const data = await fetchLatestRates();
    if (!data) {
      return NextResponse.json({ error: 'Failed to fetch ECB rates' }, { status: 502 });
    }

    const converted = convertCurrency(amount, from, to, data.rates);

    return NextResponse.json({
      amount,
      from,
      to,
      converted,
      rate: data.rates[from] && data.rates[to]
        ? data.rates[to] / data.rates[from]
        : null,
      date: data.date,
    });
  } catch (error) {
    console.error('Error converting currency:', error);
    return NextResponse.json({ error: 'Failed to convert' }, { status: 500 });
  }
}
