import {
  normalizeSecurityName,
  findMatchingSecurity,
  type ParsedSecurityInput,
  type ExistingSecurity,
} from '@/lib/normalization/index';

/**
 * Tests that the normalization module correctly identifies the same security
 * across different brokers, enabling portfolio aggregation.
 */
describe('Cross-broker security aggregation', () => {
  // Simulate existing securities already in the database
  const existingSecurities: ExistingSecurity[] = [
    {
      id: 'sec-apple',
      isin: 'US0378331005',
      ticker: 'AAPL',
      normalizedName: 'apple inc',
      exchange: 'NASDAQ',
    },
    {
      id: 'sec-vwce',
      isin: 'IE00BK5BQT80',
      ticker: 'VWCE',
      normalizedName: 'vanguard ftse allworld ucits etf usd acc',
      exchange: 'XETRA',
    },
    {
      id: 'sec-msft',
      isin: 'US5949181045',
      ticker: 'MSFT',
      normalizedName: 'microsoft corp',
      exchange: 'NASDAQ',
    },
  ];

  it('identifies the same security (AAPL) from IBKR and Trading 212 by ISIN', () => {
    // Simulating parsed output from IBKR
    const fromIbkr: ParsedSecurityInput = {
      isin: 'US0378331005',
      ticker: 'AAPL',
      name: 'APPLE INC',
      currency: 'USD',
    };

    // Simulating parsed output from Trading 212
    const fromT212: ParsedSecurityInput = {
      isin: 'US0378331005',
      ticker: 'AAPL',
      name: 'Apple Inc',
      currency: 'USD',
    };

    const matchIbkr = findMatchingSecurity(fromIbkr, existingSecurities);
    const matchT212 = findMatchingSecurity(fromT212, existingSecurities);

    // Both should resolve to the same security
    expect(matchIbkr.securityId).toBe('sec-apple');
    expect(matchT212.securityId).toBe('sec-apple');
    expect(matchIbkr.securityId).toBe(matchT212.securityId);
    expect(matchIbkr.matchType).toBe('isin');
    expect(matchT212.matchType).toBe('isin');
  });

  it('identifies VWCE from DEGIRO and Lightyear by ISIN', () => {
    const fromDegiro: ParsedSecurityInput = {
      isin: 'IE00BK5BQT80',
      name: 'Vanguard FTSE All-World UCITS ETF USD Acc',
      currency: 'EUR',
    };

    const fromLightyear: ParsedSecurityInput = {
      isin: 'IE00BK5BQT80',
      ticker: 'VWCE',
      name: 'Vanguard FTSE All-World UCITS ETF',
      currency: 'EUR',
    };

    const matchDegiro = findMatchingSecurity(fromDegiro, existingSecurities);
    const matchLightyear = findMatchingSecurity(fromLightyear, existingSecurities);

    expect(matchDegiro.securityId).toBe('sec-vwce');
    expect(matchLightyear.securityId).toBe('sec-vwce');
    expect(matchDegiro.securityId).toBe(matchLightyear.securityId);
  });

  it('matches by normalized name when ISIN is missing from one broker', () => {
    const withoutIsin: ParsedSecurityInput = {
      name: 'Microsoft Corp',
      currency: 'USD',
    };

    const match = findMatchingSecurity(withoutIsin, existingSecurities);
    expect(match.securityId).toBe('sec-msft');
    expect(match.matchType).toBe('name');
    expect(match.confidence).toBe(0.6);
  });
});

describe('Portfolio value aggregation', () => {
  it('correctly sums market values across brokers for the same security', () => {
    // Simulating holdings from multiple brokers for the same security
    const holdings = [
      { broker: 'ibkr', securityId: 'sec-apple', quantity: 100, marketValue: 17850 },
      { broker: 'trading212', securityId: 'sec-apple', quantity: 8, marketValue: 1428 },
      { broker: 'degiro', securityId: 'sec-vwce', quantity: 50, marketValue: 5765 },
      { broker: 'lightyear', securityId: 'sec-vwce', quantity: 10, marketValue: 1153 },
    ];

    // Aggregate by security
    const aggregated = new Map<string, { totalQuantity: number; totalValue: number }>();
    for (const h of holdings) {
      const existing = aggregated.get(h.securityId) ?? { totalQuantity: 0, totalValue: 0 };
      existing.totalQuantity += h.quantity;
      existing.totalValue += h.marketValue;
      aggregated.set(h.securityId, existing);
    }

    const apple = aggregated.get('sec-apple');
    expect(apple).toBeDefined();
    expect(apple!.totalQuantity).toBe(108);
    expect(apple!.totalValue).toBe(19278);

    const vwce = aggregated.get('sec-vwce');
    expect(vwce).toBeDefined();
    expect(vwce!.totalQuantity).toBe(60);
    expect(vwce!.totalValue).toBe(6918);
  });

  it('calculates total portfolio value', () => {
    const holdings = [
      { marketValue: 17850 },
      { marketValue: 1428 },
      { marketValue: 5765 },
      { marketValue: 1153 },
    ];

    const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    expect(totalValue).toBe(26196);
  });

  it('calculates portfolio weight per security', () => {
    const totalValue = 26196;
    const securityValues = [
      { securityId: 'sec-apple', totalValue: 19278 },
      { securityId: 'sec-vwce', totalValue: 6918 },
    ];

    const weights = securityValues.map((s) => ({
      securityId: s.securityId,
      weight: s.totalValue / totalValue,
    }));

    // Apple should be ~73.6% of portfolio
    const appleWeight = weights.find((w) => w.securityId === 'sec-apple');
    expect(appleWeight!.weight).toBeCloseTo(0.736, 2);

    // VWCE should be ~26.4%
    const vwceWeight = weights.find((w) => w.securityId === 'sec-vwce');
    expect(vwceWeight!.weight).toBeCloseTo(0.264, 2);

    // Weights should sum to 1.0
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 10);
  });
});
