// ---------------------------------------------------------------------------
// ECB exchange rates – fetches daily rates from the European Central Bank
// ---------------------------------------------------------------------------

const ECB_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
const ECB_HIST_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml';

export interface ExchangeRates {
  date: string;
  rates: Record<string, number>; // currency code -> rate vs EUR (e.g., USD: 1.08)
}

/**
 * Parse ECB XML response into exchange rates.
 */
function parseECBXml(xml: string): ExchangeRates[] {
  const results: ExchangeRates[] = [];
  // Match each Cube with time attribute
  const timeRegex = /<Cube\s+time='(\d{4}-\d{2}-\d{2})'>([\s\S]*?)<\/Cube>/g;
  let timeMatch;

  while ((timeMatch = timeRegex.exec(xml)) !== null) {
    const date = timeMatch[1];
    const rates: Record<string, number> = { EUR: 1 };
    const rateRegex = /currency='([A-Z]+)'\s+rate='([\d.]+)'/g;
    let rateMatch;
    while ((rateMatch = rateRegex.exec(timeMatch[2])) !== null) {
      rates[rateMatch[1]] = parseFloat(rateMatch[2]);
    }
    results.push({ date, rates });
  }

  return results;
}

/**
 * Fetch latest ECB exchange rates.
 */
export async function fetchLatestRates(): Promise<ExchangeRates | null> {
  try {
    const res = await fetch(ECB_URL, {
      headers: { 'Accept': 'application/xml' },
      next: { revalidate: 3600 }, // cache for 1 hour
    });
    if (!res.ok) return null;
    const xml = await res.text();
    const parsed = parseECBXml(xml);
    return parsed[0] ?? null;
  } catch (err) {
    console.error('Failed to fetch ECB rates:', err);
    return null;
  }
}

/**
 * Fetch historical ECB rates (last 90 days).
 */
export async function fetchHistoricalRates(): Promise<ExchangeRates[]> {
  try {
    const res = await fetch(ECB_HIST_URL, {
      headers: { 'Accept': 'application/xml' },
      next: { revalidate: 86400 }, // cache for 24 hours
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseECBXml(xml);
  } catch (err) {
    console.error('Failed to fetch ECB historical rates:', err);
    return [];
  }
}

/**
 * Convert an amount from one currency to another using ECB rates.
 * All rates are relative to EUR.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
): number {
  if (fromCurrency === toCurrency) return amount;

  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];

  if (!fromRate || !toRate) {
    console.warn(`Missing rate for ${fromCurrency} or ${toCurrency}`);
    return amount;
  }

  // Convert: amount in FROM -> EUR -> TO
  // EUR = amount / fromRate
  // TO = EUR * toRate
  return (amount / fromRate) * toRate;
}
