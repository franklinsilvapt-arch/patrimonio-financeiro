import {
  calculateTotalValue,
  type HoldingForSnapshot,
} from '@/lib/snapshots/index';

// ---------------------------------------------------------------------------
// Helper: compute broker and asset class breakdowns without DB access
// ---------------------------------------------------------------------------

interface SnapshotCalculation {
  totalValue: number;
  brokerBreakdown: Record<string, number>;
  assetBreakdown: Record<string, number>;
}

function calculateSnapshotData(
  holdings: HoldingForSnapshot[],
  brokerMap: Record<string, string>,
): SnapshotCalculation {
  const totalValue = holdings.reduce((sum, h) => sum + (h.marketValue ?? 0), 0);

  const brokerBreakdown: Record<string, number> = {};
  for (const holding of holdings) {
    const slug = brokerMap[holding.accountId] ?? holding.brokerSlug;
    brokerBreakdown[slug] = (brokerBreakdown[slug] ?? 0) + (holding.marketValue ?? 0);
  }

  const assetBreakdown: Record<string, number> = {};
  for (const holding of holdings) {
    assetBreakdown[holding.assetClass] =
      (assetBreakdown[holding.assetClass] ?? 0) + (holding.marketValue ?? 0);
  }

  return { totalValue, brokerBreakdown, assetBreakdown };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('calculateTotalValue', () => {
  it('sums all market values', () => {
    const holdings: HoldingForSnapshot[] = [
      {
        securityId: 's1',
        assetClass: 'EQUITY',
        marketValue: 10000,
        currency: 'EUR',
        accountId: 'acc-1',
        brokerSlug: 'ibkr',
      },
      {
        securityId: 's2',
        assetClass: 'ETF',
        marketValue: 5000,
        currency: 'EUR',
        accountId: 'acc-2',
        brokerSlug: 'degiro',
      },
    ];

    expect(calculateTotalValue(holdings)).toBe(15000);
  });

  it('treats null market values as zero', () => {
    const holdings: HoldingForSnapshot[] = [
      {
        securityId: 's1',
        assetClass: 'EQUITY',
        marketValue: 10000,
        currency: 'EUR',
        accountId: 'acc-1',
        brokerSlug: 'ibkr',
      },
      {
        securityId: 's2',
        assetClass: 'CASH',
        marketValue: null,
        currency: 'EUR',
        accountId: 'acc-2',
        brokerSlug: 'degiro',
      },
    ];

    expect(calculateTotalValue(holdings)).toBe(10000);
  });

  it('returns 0 for empty holdings', () => {
    expect(calculateTotalValue([])).toBe(0);
  });
});

describe('Snapshot broker breakdown', () => {
  const holdings: HoldingForSnapshot[] = [
    {
      securityId: 's1',
      assetClass: 'EQUITY',
      marketValue: 10000,
      currency: 'EUR',
      accountId: 'acc-ibkr',
      brokerSlug: 'ibkr',
    },
    {
      securityId: 's2',
      assetClass: 'ETF',
      marketValue: 5000,
      currency: 'EUR',
      accountId: 'acc-degiro',
      brokerSlug: 'degiro',
    },
    {
      securityId: 's3',
      assetClass: 'EQUITY',
      marketValue: 3000,
      currency: 'EUR',
      accountId: 'acc-ibkr',
      brokerSlug: 'ibkr',
    },
    {
      securityId: 's4',
      assetClass: 'ETF',
      marketValue: 2000,
      currency: 'EUR',
      accountId: 'acc-t212',
      brokerSlug: 'trading212',
    },
  ];

  const brokerMap: Record<string, string> = {
    'acc-ibkr': 'ibkr',
    'acc-degiro': 'degiro',
    'acc-t212': 'trading212',
  };

  it('groups values by broker correctly', () => {
    const result = calculateSnapshotData(holdings, brokerMap);

    expect(result.brokerBreakdown['ibkr']).toBe(13000);
    expect(result.brokerBreakdown['degiro']).toBe(5000);
    expect(result.brokerBreakdown['trading212']).toBe(2000);
  });

  it('broker breakdown sums to total value', () => {
    const result = calculateSnapshotData(holdings, brokerMap);
    const brokerSum = Object.values(result.brokerBreakdown).reduce(
      (sum, v) => sum + v,
      0,
    );
    expect(brokerSum).toBe(result.totalValue);
  });
});

describe('Snapshot asset class breakdown', () => {
  const holdings: HoldingForSnapshot[] = [
    {
      securityId: 's1',
      assetClass: 'EQUITY',
      marketValue: 10000,
      currency: 'EUR',
      accountId: 'acc-1',
      brokerSlug: 'ibkr',
    },
    {
      securityId: 's2',
      assetClass: 'ETF',
      marketValue: 5000,
      currency: 'EUR',
      accountId: 'acc-2',
      brokerSlug: 'degiro',
    },
    {
      securityId: 's3',
      assetClass: 'EQUITY',
      marketValue: 3000,
      currency: 'EUR',
      accountId: 'acc-3',
      brokerSlug: 'trading212',
    },
    {
      securityId: 's4',
      assetClass: 'CASH',
      marketValue: 1500,
      currency: 'EUR',
      accountId: 'acc-4',
      brokerSlug: 'lightyear',
    },
    {
      securityId: 's5',
      assetClass: 'BOND',
      marketValue: 2500,
      currency: 'EUR',
      accountId: 'acc-5',
      brokerSlug: 'ibkr',
    },
  ];

  const brokerMap: Record<string, string> = {
    'acc-1': 'ibkr',
    'acc-2': 'degiro',
    'acc-3': 'trading212',
    'acc-4': 'lightyear',
    'acc-5': 'ibkr',
  };

  it('groups values by asset class correctly', () => {
    const result = calculateSnapshotData(holdings, brokerMap);

    expect(result.assetBreakdown['EQUITY']).toBe(13000);
    expect(result.assetBreakdown['ETF']).toBe(5000);
    expect(result.assetBreakdown['CASH']).toBe(1500);
    expect(result.assetBreakdown['BOND']).toBe(2500);
  });

  it('asset class breakdown sums to total value', () => {
    const result = calculateSnapshotData(holdings, brokerMap);
    const assetSum = Object.values(result.assetBreakdown).reduce(
      (sum, v) => sum + v,
      0,
    );
    expect(assetSum).toBe(result.totalValue);
  });

  it('total value matches calculateTotalValue', () => {
    const result = calculateSnapshotData(holdings, brokerMap);
    expect(result.totalValue).toBe(calculateTotalValue(holdings));
  });
});

describe('Snapshot edge cases', () => {
  it('handles holdings with null market values in breakdowns', () => {
    const holdings: HoldingForSnapshot[] = [
      {
        securityId: 's1',
        assetClass: 'EQUITY',
        marketValue: 5000,
        currency: 'EUR',
        accountId: 'acc-1',
        brokerSlug: 'ibkr',
      },
      {
        securityId: 's2',
        assetClass: 'EQUITY',
        marketValue: null,
        currency: 'EUR',
        accountId: 'acc-2',
        brokerSlug: 'degiro',
      },
    ];

    const brokerMap: Record<string, string> = {
      'acc-1': 'ibkr',
      'acc-2': 'degiro',
    };

    const result = calculateSnapshotData(holdings, brokerMap);
    expect(result.totalValue).toBe(5000);
    expect(result.brokerBreakdown['ibkr']).toBe(5000);
    expect(result.brokerBreakdown['degiro']).toBe(0);
    expect(result.assetBreakdown['EQUITY']).toBe(5000);
  });

  it('handles empty holdings list', () => {
    const result = calculateSnapshotData([], {});
    expect(result.totalValue).toBe(0);
    expect(result.brokerBreakdown).toEqual({});
    expect(result.assetBreakdown).toEqual({});
  });

  it('falls back to brokerSlug when accountId is not in brokerMap', () => {
    const holdings: HoldingForSnapshot[] = [
      {
        securityId: 's1',
        assetClass: 'ETF',
        marketValue: 7000,
        currency: 'EUR',
        accountId: 'unknown-acc',
        brokerSlug: 'lightyear',
      },
    ];

    const result = calculateSnapshotData(holdings, {});
    expect(result.brokerBreakdown['lightyear']).toBe(7000);
  });
});
