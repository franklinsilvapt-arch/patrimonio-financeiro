import {
  normalizeSecurityName,
  findMatchingSecurity,
  type ParsedSecurityInput,
  type ExistingSecurity,
} from '@/lib/normalization/index';

describe('normalizeSecurityName', () => {
  it('lowercases a standard name', () => {
    expect(normalizeSecurityName('Microsoft Corp')).toBe('microsoft corp');
  });

  it('removes hyphens and special characters', () => {
    expect(
      normalizeSecurityName('Vanguard FTSE All-World UCITS ETF USD Acc'),
    ).toBe('vanguard ftse allworld ucits etf usd acc');
  });

  it('trims leading/trailing whitespace and removes periods', () => {
    expect(normalizeSecurityName('  Apple Inc.  ')).toBe('apple inc');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeSecurityName('')).toBe('');
  });

  it('collapses multiple spaces into one', () => {
    expect(normalizeSecurityName('Hello    World')).toBe('hello world');
  });
});

describe('findMatchingSecurity', () => {
  const existingSecurities: ExistingSecurity[] = [
    {
      id: 'sec-1',
      isin: 'US5949181045',
      ticker: 'MSFT',
      normalizedName: 'microsoft corp',
      exchange: 'NASDAQ',
    },
    {
      id: 'sec-2',
      isin: 'US0378331005',
      ticker: 'AAPL',
      normalizedName: 'apple inc',
      exchange: 'NASDAQ',
    },
    {
      id: 'sec-3',
      isin: 'IE00BK5BQT80',
      ticker: 'VWCE',
      normalizedName: 'vanguard ftse allworld ucits etf usd acc',
      exchange: 'XETRA',
    },
    {
      id: 'sec-4',
      isin: null,
      ticker: 'TSLA',
      normalizedName: 'tesla inc',
      exchange: 'NASDAQ',
    },
  ];

  it('matches by ISIN with confidence 1.0', () => {
    const parsed: ParsedSecurityInput = {
      isin: 'US5949181045',
      ticker: 'MSFT',
      name: 'Microsoft Corp',
      currency: 'USD',
    };

    const result = findMatchingSecurity(parsed, existingSecurities);
    expect(result.securityId).toBe('sec-1');
    expect(result.matchType).toBe('isin');
    expect(result.confidence).toBe(1.0);
  });

  it('matches by ISIN case-insensitively', () => {
    const parsed: ParsedSecurityInput = {
      isin: 'us5949181045',
      name: 'Microsoft',
      currency: 'USD',
    };

    const result = findMatchingSecurity(parsed, existingSecurities);
    expect(result.securityId).toBe('sec-1');
    expect(result.matchType).toBe('isin');
    expect(result.confidence).toBe(1.0);
  });

  it('matches by ticker + exchange when ISIN not available (confidence 0.9)', () => {
    const parsed: ParsedSecurityInput = {
      ticker: 'TSLA',
      exchange: 'NASDAQ',
      name: 'Tesla Inc',
      currency: 'USD',
    };

    const result = findMatchingSecurity(parsed, existingSecurities);
    expect(result.securityId).toBe('sec-4');
    expect(result.matchType).toBe('ticker_exchange');
    expect(result.confidence).toBe(0.9);
  });

  it('matches by ticker only when no exchange provided (confidence 0.8)', () => {
    const parsed: ParsedSecurityInput = {
      ticker: 'TSLA',
      name: 'Tesla Inc',
      currency: 'USD',
    };

    const result = findMatchingSecurity(parsed, existingSecurities);
    expect(result.securityId).toBe('sec-4');
    expect(result.matchType).toBe('ticker_exchange');
    expect(result.confidence).toBe(0.8);
  });

  it('matches by normalized name as fallback (confidence 0.6)', () => {
    const parsed: ParsedSecurityInput = {
      name: 'Apple Inc.',
      currency: 'USD',
    };

    const result = findMatchingSecurity(parsed, existingSecurities);
    expect(result.securityId).toBe('sec-2');
    expect(result.matchType).toBe('name');
    expect(result.confidence).toBe(0.6);
  });

  it('returns matchType "new" when no match found', () => {
    const parsed: ParsedSecurityInput = {
      isin: 'GB0000000000',
      ticker: 'UNKN',
      name: 'Unknown Corp',
      currency: 'GBP',
    };

    const result = findMatchingSecurity(parsed, existingSecurities);
    expect(result.securityId).toBeNull();
    expect(result.matchType).toBe('new');
    expect(result.confidence).toBe(1.0);
  });

  it('returns "new" when matching against an empty list', () => {
    const parsed: ParsedSecurityInput = {
      isin: 'US5949181045',
      name: 'Microsoft Corp',
      currency: 'USD',
    };

    const result = findMatchingSecurity(parsed, []);
    expect(result.securityId).toBeNull();
    expect(result.matchType).toBe('new');
  });

  it('prefers ISIN match over ticker match', () => {
    const parsed: ParsedSecurityInput = {
      isin: 'US0378331005',
      ticker: 'MSFT', // ticker belongs to sec-1, but ISIN belongs to sec-2
      name: 'Apple Inc',
      currency: 'USD',
    };

    const result = findMatchingSecurity(parsed, existingSecurities);
    expect(result.securityId).toBe('sec-2');
    expect(result.matchType).toBe('isin');
  });
});
