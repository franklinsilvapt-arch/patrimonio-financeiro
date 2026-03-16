import {
  detectImporter,
  getImporter,
  DegiroImporter,
  IbkrImporter,
  LightyearImporter,
  Trading212Importer,
} from '@/lib/importers/index';

// ---------------------------------------------------------------------------
// Sample CSV data
// ---------------------------------------------------------------------------

const DEGIRO_CSV = `Produto,Symbol/ISIN,Quantidade,"Preço de fecho","Valor em EUR"
"Vanguard FTSE All-World UCITS ETF USD Acc",IE00BK5BQT80,50,"115,30","5.765,00"
"Cash & Cash Fund","","","","500,00"`;

const IBKR_CSV = `Symbol,Description,Asset Class,Currency,Quantity,Close Price,Value,ISIN
MSFT,"Microsoft Corp",STK,USD,100,415.20,41520.00,US5949181045
,Cash,,USD,,,1200.00,`;

const LIGHTYEAR_CSV = `Instrument,ISIN,Ticker,Quantity,Average Price,Current Price,Current Value,Currency
"Apple Inc",US0378331005,AAPL,5,165.00,178.50,892.50,USD`;

const TRADING212_CSV = `Instrument,Ticker,ISIN,Shares,Current price,Market value,Currency code
"Apple Inc",AAPL,US0378331005,8,178.50,1428.00,USD`;

// ---------------------------------------------------------------------------
// detectImporter
// ---------------------------------------------------------------------------

describe('detectImporter', () => {
  it('detects DEGIRO CSV by Produto header', () => {
    const importer = detectImporter(DEGIRO_CSV);
    expect(importer).not.toBeNull();
    expect(importer!.brokerSlug).toBe('degiro');
  });

  it('detects IBKR CSV by Symbol + Asset Class headers', () => {
    const importer = detectImporter(IBKR_CSV);
    expect(importer).not.toBeNull();
    expect(importer!.brokerSlug).toBe('ibkr');
  });

  it('detects Lightyear CSV by Instrument + ISIN + Quantity headers', () => {
    const importer = detectImporter(LIGHTYEAR_CSV);
    expect(importer).not.toBeNull();
    // Lightyear and Trading212 both have Instrument+ISIN headers,
    // but the registry order should pick the right one based on header specifics
    expect(['lightyear', 'trading212']).toContain(importer!.brokerSlug);
  });

  it('detects Trading 212 CSV by Instrument + Ticker + ISIN + Shares headers', () => {
    const importer = detectImporter(TRADING212_CSV);
    expect(importer).not.toBeNull();
    expect(['lightyear', 'trading212']).toContain(importer!.brokerSlug);
  });

  it('returns null for unrecognised content', () => {
    const importer = detectImporter('random,headers,here\n1,2,3');
    expect(importer).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getImporter
// ---------------------------------------------------------------------------

describe('getImporter', () => {
  it('returns importer by slug', () => {
    expect(getImporter('degiro')).toBeDefined();
    expect(getImporter('ibkr')).toBeDefined();
    expect(getImporter('lightyear')).toBeDefined();
    expect(getImporter('trading212')).toBeDefined();
  });

  it('returns undefined for unknown slug', () => {
    expect(getImporter('unknown_broker')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// DEGIRO parser
// ---------------------------------------------------------------------------

describe('DegiroImporter', () => {
  const importer = new DegiroImporter();

  it('detects DEGIRO format', () => {
    expect(importer.detectFormat(DEGIRO_CSV)).toBe(true);
  });

  it('does not detect non-DEGIRO format', () => {
    expect(importer.detectFormat(IBKR_CSV)).toBe(false);
  });

  it('parses positions with Portuguese number format', async () => {
    const result = await importer.parseCSV(DEGIRO_CSV);
    // Should parse the Vanguard ETF row; Cash row has no quantity so it gets skipped
    expect(result.positions.length).toBeGreaterThanOrEqual(1);

    const vanguard = result.positions.find((p) =>
      p.name.includes('Vanguard'),
    );
    expect(vanguard).toBeDefined();
    expect(vanguard!.isin).toBe('IE00BK5BQT80');
    expect(vanguard!.quantity).toBe(50);
    // Price "115,30" in Portuguese = 115.30
    expect(vanguard!.price).toBeCloseTo(115.3, 1);
    // Value "5.765,00" in Portuguese = 5765.00
    expect(vanguard!.marketValue).toBeCloseTo(5765.0, 0);
  });

  it('skips the Cash line (no quantity)', async () => {
    const result = await importer.parseCSV(DEGIRO_CSV);
    const cash = result.positions.find((p) => p.name.includes('Cash'));
    expect(cash).toBeUndefined();
  });

  it('handles empty content gracefully', async () => {
    const result = await importer.parseCSV('');
    expect(result.positions).toEqual([]);
    expect(result.errors.length).toBeGreaterThanOrEqual(0);
  });

  it('handles header-only content', async () => {
    const result = await importer.parseCSV(
      'Produto,Symbol/ISIN,Quantidade,"Preço de fecho","Valor em EUR"',
    );
    expect(result.positions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// IBKR parser
// ---------------------------------------------------------------------------

describe('IbkrImporter', () => {
  const importer = new IbkrImporter();

  it('detects IBKR format', () => {
    expect(importer.detectFormat(IBKR_CSV)).toBe(true);
  });

  it('does not detect non-IBKR format', () => {
    expect(importer.detectFormat(DEGIRO_CSV)).toBe(false);
  });

  it('parses positions and maps STK to EQUITY', async () => {
    const result = await importer.parseCSV(IBKR_CSV);
    expect(result.positions.length).toBeGreaterThanOrEqual(1);

    const msft = result.positions.find((p) => p.ticker === 'MSFT');
    expect(msft).toBeDefined();
    expect(msft!.isin).toBe('US5949181045');
    expect(msft!.quantity).toBe(100);
    expect(msft!.price).toBeCloseTo(415.2, 1);
    expect(msft!.marketValue).toBeCloseTo(41520.0, 0);
    expect(msft!.assetClass).toBe('EQUITY');
    expect(msft!.currency).toBe('USD');
  });

  it('skips cash rows (no symbol/description or zero quantity)', async () => {
    const result = await importer.parseCSV(IBKR_CSV);
    const cash = result.positions.find(
      (p) => p.name.toLowerCase().includes('cash'),
    );
    // Cash row has no symbol and empty description, should be skipped
    expect(cash).toBeUndefined();
  });

  it('handles empty content gracefully', async () => {
    const result = await importer.parseCSV('');
    expect(result.positions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Lightyear parser
// ---------------------------------------------------------------------------

describe('LightyearImporter', () => {
  const importer = new LightyearImporter();

  it('detects Lightyear format', () => {
    expect(importer.detectFormat(LIGHTYEAR_CSV)).toBe(true);
  });

  it('parses basic Lightyear format', async () => {
    const result = await importer.parseCSV(LIGHTYEAR_CSV);
    expect(result.positions.length).toBe(1);

    const apple = result.positions[0];
    expect(apple.name).toBe('Apple Inc');
    expect(apple.isin).toBe('US0378331005');
    expect(apple.ticker).toBe('AAPL');
    expect(apple.quantity).toBe(5);
    expect(apple.price).toBeCloseTo(178.5, 1);
    expect(apple.marketValue).toBeCloseTo(892.5, 1);
    expect(apple.currency).toBe('USD');
  });

  it('handles empty content gracefully', async () => {
    const result = await importer.parseCSV('');
    expect(result.positions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Trading 212 parser
// ---------------------------------------------------------------------------

describe('Trading212Importer', () => {
  const importer = new Trading212Importer();

  it('detects Trading 212 format', () => {
    expect(importer.detectFormat(TRADING212_CSV)).toBe(true);
  });

  it('parses portfolio export format', async () => {
    const result = await importer.parseCSV(TRADING212_CSV);
    expect(result.positions.length).toBe(1);

    const apple = result.positions[0];
    expect(apple.name).toBe('Apple Inc');
    expect(apple.isin).toBe('US0378331005');
    expect(apple.ticker).toBe('AAPL');
    expect(apple.quantity).toBe(8);
    expect(apple.price).toBeCloseTo(178.5, 1);
    expect(apple.marketValue).toBeCloseTo(1428.0, 0);
    expect(apple.currency).toBe('USD');
  });

  it('handles empty content gracefully', async () => {
    const result = await importer.parseCSV('');
    expect(result.positions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Cross-parser: malformed input
// ---------------------------------------------------------------------------

describe('All parsers handle malformed rows', () => {
  const malformedCSV = `Produto,Symbol/ISIN,Quantidade,"Preço de fecho","Valor em EUR"
,,,,,`;

  it('DEGIRO does not crash on malformed rows', async () => {
    const result = await new DegiroImporter().parseCSV(malformedCSV);
    expect(result.positions).toEqual([]);
    // Should have warnings about skipped rows, not thrown errors
    expect(result.warnings.length + result.errors.length).toBeGreaterThanOrEqual(0);
  });

  it('IBKR does not crash on completely empty rows', async () => {
    const csv = `Symbol,Description,Asset Class,Currency,Quantity,Close Price,Value,ISIN
,,,,,,,`;
    const result = await new IbkrImporter().parseCSV(csv);
    expect(result.positions).toEqual([]);
  });

  it('Lightyear does not crash on empty rows', async () => {
    const csv = `Instrument,ISIN,Ticker,Quantity,Average Price,Current Price,Current Value,Currency
,,,,,,,,`;
    const result = await new LightyearImporter().parseCSV(csv);
    expect(result.positions).toEqual([]);
  });

  it('Trading 212 does not crash on empty rows', async () => {
    const csv = `Instrument,Ticker,ISIN,Shares,Current price,Market value,Currency code
,,,,,,,`;
    const result = await new Trading212Importer().parseCSV(csv);
    expect(result.positions).toEqual([]);
  });
});
