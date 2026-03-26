// ---------------------------------------------------------------------------
// Yahoo Finance live price fetcher
// Uses the unofficial Yahoo Finance API – 15-min delayed quotes
// ---------------------------------------------------------------------------

const PRICE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const TICKER_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for ISIN→ticker mapping

export interface LivePrice {
  price: number;
  currency: string;
  dailyChange: number;
  dailyChangePercent: number;
  timestamp: number; // Unix ms
  ticker: string;
}

// In-memory caches (shared within a warm serverless instance)
const priceCache = new Map<string, { data: Map<string, LivePrice | null>; fetchedAt: number }>();
const tickerCache = new Map<string, { ticker: string | null; fetchedAt: number }>();

// Exchange code → Yahoo Finance suffix
const EXCHANGE_SUFFIX: Record<string, string> = {
  XAMS: '.AS', AMS: '.AS', ENXTAM: '.AS',
  XLON: '.L', LSE: '.L',
  XETR: '.DE', ETR: '.DE', XFRA: '.DE', FRA: '.DE',
  XPAR: '.PA', PAR: '.PA',
  XMIL: '.MI', MIL: '.MI',
  XSWX: '.SW', SWX: '.SW',
  XBRU: '.BR', BRU: '.BR',
  XLIS: '.LS', LIS: '.LS',
  XSTO: '.ST', STO: '.ST',
  XHEL: '.HE', HEL: '.HE',
  XOSL: '.OL', OSL: '.OL',
};

async function resolveYahooTicker(isin: string): Promise<string | null> {
  const cached = tickerCache.get(isin);
  if (cached && Date.now() - cached.fetchedAt < TICKER_CACHE_TTL_MS) return cached.ticker;

  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(isin)}&lang=en-US&region=US&quotesCount=5&newsCount=0&enableFuzzyQuery=false`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      tickerCache.set(isin, { ticker: null, fetchedAt: Date.now() });
      return null;
    }
    const data = await res.json();
    const quotes: Array<{ symbol: string; quoteType: string }> = data.quotes ?? [];
    // Prefer ETF/EQUITY type
    const best =
      quotes.find((q) => q.quoteType === 'ETF' || q.quoteType === 'EQUITY') ?? quotes[0];
    const ticker = best?.symbol ?? null;
    tickerCache.set(isin, { ticker, fetchedAt: Date.now() });
    return ticker;
  } catch {
    tickerCache.set(isin, { ticker: null, fetchedAt: Date.now() });
    return null;
  }
}

export interface SecurityRef {
  id: string;
  isin?: string | null;
  ticker?: string | null;
  exchange?: string | null;
}

/**
 * Fetch live prices for a list of securities in one batch request.
 * Returns a map of securityId → LivePrice (or null if unavailable).
 */
export async function fetchLivePrices(
  securities: SecurityRef[]
): Promise<Map<string, LivePrice | null>> {
  const CACHE_KEY = 'batch';
  const cached = priceCache.get(CACHE_KEY);
  const now = Date.now();

  // Resolve Yahoo tickers for all securities
  const resolvedTickers = await Promise.all(
    securities.map(async (s) => {
      let yahooTicker: string | null = null;

      // 1. Search by ISIN (most reliable)
      if (s.isin) {
        yahooTicker = await resolveYahooTicker(s.isin);
      }
      // 2. Fallback: ticker + exchange suffix
      if (!yahooTicker && s.ticker) {
        const suffix = s.exchange ? (EXCHANGE_SUFFIX[s.exchange.toUpperCase()] ?? '') : '';
        yahooTicker = `${s.ticker}${suffix}`;
      }

      return { id: s.id, yahooTicker };
    })
  );

  const symbolMap = new Map<string, string>(); // symbol → securityId (first match)
  const idToSymbol = new Map<string, string>(); // securityId → symbol
  for (const { id, yahooTicker } of resolvedTickers) {
    if (yahooTicker) {
      if (!symbolMap.has(yahooTicker)) symbolMap.set(yahooTicker, id);
      idToSymbol.set(id, yahooTicker);
    }
  }

  const symbols = Array.from(new Set(idToSymbol.values()));
  if (symbols.length === 0) {
    return new Map(securities.map((s) => [s.id, null]));
  }

  // Check if we have a fresh cache for ALL symbols we need
  if (cached && now - cached.fetchedAt < PRICE_CACHE_TTL_MS) {
    const result = new Map<string, LivePrice | null>();
    let allCached = true;
    for (const s of securities) {
      if (cached.data.has(s.id)) {
        result.set(s.id, cached.data.get(s.id) ?? null);
      } else {
        allCached = false;
        break;
      }
    }
    if (allCached) return result;
  }

  // Batch fetch from Yahoo Finance
  let quotesBySymbol = new Map<string, LivePrice>();
  try {
    const symbolsParam = symbols.join(',');
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolsParam)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketTime,currency,previousClose`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      const quotes: Array<{
        symbol: string;
        regularMarketPrice?: number;
        regularMarketChange?: number;
        regularMarketChangePercent?: number;
        regularMarketTime?: number;
        currency?: string;
      }> = data.quoteResponse?.result ?? [];
      for (const q of quotes) {
        if (q.regularMarketPrice != null) {
          quotesBySymbol.set(q.symbol, {
            price: q.regularMarketPrice,
            currency: (q.currency ?? 'USD').toUpperCase(),
            dailyChange: q.regularMarketChange ?? 0,
            dailyChangePercent: q.regularMarketChangePercent ?? 0,
            timestamp: (q.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000,
            ticker: q.symbol,
          });
        }
      }
    }
  } catch {
    // Batch fetch failed — return nulls
  }

  // Build result and update cache
  const result = new Map<string, LivePrice | null>();
  const newCacheData = cached?.data ?? new Map<string, LivePrice | null>();

  for (const s of securities) {
    const sym = idToSymbol.get(s.id);
    const livePrice = sym ? (quotesBySymbol.get(sym) ?? null) : null;
    result.set(s.id, livePrice);
    newCacheData.set(s.id, livePrice);
  }

  priceCache.set(CACHE_KEY, { data: newCacheData, fetchedAt: now });
  return result;
}
