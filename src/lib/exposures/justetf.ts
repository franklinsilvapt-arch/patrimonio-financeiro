// ---------------------------------------------------------------------------
// JustETF scraper – fetches country & sector allocations for ETFs
// Uses Wicket AJAX endpoints to get the full expanded list (not just top 5)
// ---------------------------------------------------------------------------

import * as cheerio from 'cheerio';

const JUSTETF_BASE = 'https://www.justetf.com';
const PROFILE_PATH = '/en/etf-profile.html';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Country name → ISO 3166-1 alpha-2 mapping
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  'united states': 'US',
  'japan': 'JP',
  'united kingdom': 'UK',
  'china': 'CN',
  'france': 'FR',
  'canada': 'CA',
  'switzerland': 'CH',
  'germany': 'DE',
  'australia': 'AU',
  'india': 'IN',
  'south korea': 'KR',
  'taiwan': 'TW',
  'netherlands': 'NL',
  'sweden': 'SE',
  'denmark': 'DK',
  'italy': 'IT',
  'spain': 'ES',
  'brazil': 'BR',
  'hong kong': 'HK',
  'singapore': 'SG',
  'norway': 'NO',
  'ireland': 'IE',
  'south africa': 'ZA',
  'mexico': 'MX',
  'saudi arabia': 'SA',
  'belgium': 'BE',
  'finland': 'FI',
  'israel': 'IL',
  'austria': 'AT',
  'portugal': 'PT',
  'poland': 'PL',
  'indonesia': 'ID',
  'thailand': 'TH',
  'malaysia': 'MY',
  'new zealand': 'NZ',
  'philippines': 'PH',
  'chile': 'CL',
  'colombia': 'CO',
  'turkey': 'TR',
  'czech republic': 'CZ',
  'greece': 'GR',
  'hungary': 'HU',
  'peru': 'PE',
  'egypt': 'EG',
  'qatar': 'QA',
  'united arab emirates': 'AE',
  'kuwait': 'KW',
  'other': 'OTHER',
};

export interface JustETFCountry {
  country: string;      // ISO code
  countryName: string;  // Full name
  weight: number;       // 0.0 – 1.0
}

export interface JustETFSector {
  sector: string;
  weight: number;       // 0.0 – 1.0
}

export interface JustETFResult {
  countries: JustETFCountry[];
  sectors: JustETFSector[];
  referenceDate: Date;
  source: string;
}

function countryNameToISO(name: string): string {
  return COUNTRY_NAME_TO_ISO[name.toLowerCase().trim()] ?? name.substring(0, 2).toUpperCase();
}

function parsePercent(text: string): number {
  const cleaned = text.replace(/[%\s]/g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val / 100;
}

function parseReferenceDate(text: string): Date {
  const match = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }
  return new Date();
}

function parseCountryRows($: cheerio.CheerioAPI): JustETFCountry[] {
  const countries: JustETFCountry[] = [];
  $('[data-testid="etf-holdings_countries_row"]').each((_, row) => {
    const name = $(row).find('[data-testid="tl_etf-holdings_countries_value_name"]').text().trim();
    const pctText = $(row).find('[data-testid="tl_etf-holdings_countries_value_percentage"]').text().trim();
    if (name && pctText) {
      countries.push({
        country: countryNameToISO(name),
        countryName: name,
        weight: parsePercent(pctText),
      });
    }
  });
  return countries;
}

function parseSectorRows($: cheerio.CheerioAPI): JustETFSector[] {
  const sectors: JustETFSector[] = [];
  $('[data-testid="etf-holdings_sectors_row"]').each((_, row) => {
    const name = $(row).find('[data-testid="tl_etf-holdings_sectors_value_name"]').text().trim();
    const pctText = $(row).find('[data-testid="tl_etf-holdings_sectors_value_percentage"]').text().trim();
    if (name && pctText) {
      sectors.push({ sector: name, weight: parsePercent(pctText) });
    }
  });
  return sectors;
}

/** Parse Wicket AJAX XML response — data is inside CDATA blocks */
function parseWicketResponse(xml: string, parser: ($: cheerio.CheerioAPI) => unknown[]): unknown[] {
  const cdataMatches = [...xml.matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)];
  for (const m of cdataMatches) {
    const $ = cheerio.load(m[1]);
    const results = parser($);
    if (results.length > 0) return results;
  }
  return [];
}

async function fetchWicketAjax(
  path: string,
  isin: string,
  profileUrl: string,
  cookies: string,
): Promise<string | null> {
  const url = `${JUSTETF_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/xml',
      'Wicket-Ajax': 'true',
      'Wicket-Ajax-BaseURL': `en/etf-profile.html?isin=${isin}`,
      'Cookie': cookies,
      'Referer': profileUrl,
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  if (!res.ok) return null;
  return res.text();
}

/**
 * Fetch ETF country & sector allocations from JustETF.
 * First loads the profile page to get top-5 data and Wicket AJAX URLs,
 * then fetches expanded data via AJAX for the full breakdown.
 */
export async function fetchJustETF(isin: string): Promise<JustETFResult | null> {
  const profileUrl = `${JUSTETF_BASE}${PROFILE_PATH}?isin=${encodeURIComponent(isin)}`;

  const response = await fetch(profileUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!response.ok) {
    console.warn(`JustETF fetch failed for ${isin}: HTTP ${response.status}`);
    return null;
  }

  const html = await response.text();
  const cookies = (response.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');
  const $ = cheerio.load(html);

  // Parse reference date from main page
  const dateText = $('[data-testid="tl_etf-holdings_reference-date"]').text().trim();
  const referenceDate = parseReferenceDate(dateText);

  // Extract Wicket AJAX URLs for "Show more" links
  const countryPath = html.match(/"u":"(\/en\/etf-profile\.html\?[^"]*loadMoreCountries[^"]*)"/)?.[1];
  const sectorPath = html.match(/"u":"(\/en\/etf-profile\.html\?[^"]*loadMoreSectors[^"]*)"/)?.[1];

  // Fetch expanded countries (or fall back to top-5 from main page)
  let countries: JustETFCountry[] = [];
  if (countryPath) {
    const xml = await fetchWicketAjax(countryPath, isin, profileUrl, cookies);
    if (xml) {
      countries = parseWicketResponse(xml, parseCountryRows) as JustETFCountry[];
    }
  }
  if (countries.length === 0) {
    countries = parseCountryRows($);
  }

  // Fetch expanded sectors (or fall back to top-5 from main page)
  let sectors: JustETFSector[] = [];
  if (sectorPath) {
    const xml = await fetchWicketAjax(sectorPath, isin, profileUrl, cookies);
    if (xml) {
      sectors = parseWicketResponse(xml, parseSectorRows) as JustETFSector[];
    }
  }
  if (sectors.length === 0) {
    sectors = parseSectorRows($);
  }

  if (countries.length === 0 && sectors.length === 0) {
    console.warn(`JustETF: no allocation data found for ${isin}`);
    return null;
  }

  return {
    countries,
    sectors,
    referenceDate,
    source: `justetf_${isin}`,
  };
}
