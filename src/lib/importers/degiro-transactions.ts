import { parse } from 'csv-parse/sync';
import type { BrokerImporter, ImportParseResult, ParsedPosition, RawImportRow } from './types';
import { normalizeCSVContent, detectAssetClass } from './base';

// ---------------------------------------------------------------------------
// DEGIRO Account CSV (transactions) parser
// Parses buy/sell transactions and aggregates into current positions
// with average cost basis.
// ---------------------------------------------------------------------------

interface Transaction {
  date: Date;
  product: string;
  isin: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  totalCost: number;  // negative for buys, positive for sells (in EUR)
  fee: number;
  currency: string;
  orderId: string;
}

function parsePortugueseNumber(str: string | null | undefined): number | null {
  if (!str) return null;
  // Portuguese format: "1.234,56" or "1 234,56" or just "1234,56"
  const cleaned = str.trim()
    .replace(/\s/g, '')     // remove spaces
    .replace(/\./g, '')     // remove dot (thousands separator)
    .replace(',', '.');     // comma → decimal point
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseDate(str: string): Date | null {
  // Format: DD-MM-YYYY
  const match = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
}

export class DegiroTransactionsImporter implements BrokerImporter {
  brokerSlug = 'degiro-transactions';

  detectFormat(content: string): boolean {
    const normalized = normalizeCSVContent(content);
    const firstLine = normalized.split('\n')[0] || '';
    // DEGIRO Account CSV has specific columns: Date,Time,Value date,Product,ISIN,Description,FX,Change,,Balance,,Order Id
    return (
      firstLine.includes('Value date') &&
      firstLine.includes('Description') &&
      firstLine.includes('Order Id') &&
      (firstLine.includes('Balance') || firstLine.includes('Change'))
    );
  }

  async parseCSV(content: string): Promise<ImportParseResult> {
    const normalized = normalizeCSVContent(content);
    const errors: string[] = [];
    const warnings: string[] = [];

    let rows: RawImportRow[];
    try {
      rows = parse(normalized, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ',',
        trim: true,
        relax_column_count: true,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { positions: [], errors: [`Erro ao processar CSV: ${msg}`], warnings: [], referenceDate: null };
    }

    if (rows.length === 0) {
      return { positions: [], errors: ['O ficheiro CSV não contém dados'], warnings: [], referenceDate: null };
    }

    // Extract transactions
    const transactions: Transaction[] = [];
    const feesByOrderId = new Map<string, number>();

    // First pass: collect fees by order ID
    for (const row of rows) {
      const desc = row['Description'] || '';
      const orderId = row['Order Id']?.trim() || '';
      if (!orderId) continue;

      const isFee = desc.includes('Comiss') || desc.includes('commission') || desc.includes('taxas de terceiros');
      if (isFee) {
        // Change column: the value after the currency code
        const changeVal = this.extractChangeValue(row);
        if (changeVal !== null) {
          feesByOrderId.set(orderId, Math.abs(changeVal));
        }
      }
    }

    // Second pass: extract buy/sell transactions
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const desc = row['Description'] || '';
      const product = row['Product']?.trim() || '';
      const isin = row['ISIN']?.trim() || '';
      const orderId = row['Order Id']?.trim() || '';
      const dateStr = row['Date']?.trim() || '';

      if (!product || !isin || !orderId) continue;

      // Parse buy: "Compra X name@price EUR (ISIN)" or "Buy X name@price EUR"
      const buyMatch = desc.match(/(?:Compra|Buy)\s+(\d+)\s+.+@([\d.,]+)\s+(\w{3})/);
      // Parse sell: "Venda X name@price EUR (ISIN)" or "Sell X name@price EUR"
      const sellMatch = desc.match(/(?:Venda|Sell)\s+(\d+)\s+.+@([\d.,]+)\s+(\w{3})/);

      const match = buyMatch || sellMatch;
      if (!match) continue;

      const type = buyMatch ? 'buy' : 'sell';
      const quantity = parseInt(match[1]);
      const price = parsePortugueseNumber(match[2]);
      const currency = match[3];

      if (!price || quantity === 0) continue;

      const date = parseDate(dateStr);
      if (!date) continue;

      const changeVal = this.extractChangeValue(row);
      const totalCost = changeVal !== null ? Math.abs(changeVal) : quantity * price;
      const fee = feesByOrderId.get(orderId) || 0;

      transactions.push({
        date,
        product,
        isin,
        type,
        quantity,
        price,
        totalCost,
        fee,
        currency,
        orderId,
      });
    }

    if (transactions.length === 0) {
      return {
        positions: [],
        errors: ['Nenhuma transação de compra/venda encontrada. Este ficheiro pode não conter transações.'],
        warnings: [],
        referenceDate: null,
      };
    }

    // Aggregate into current positions
    const positionMap = new Map<string, {
      product: string;
      isin: string;
      currency: string;
      totalQuantity: number;
      totalCost: number;      // total amount spent (buys) minus sells
      totalFees: number;
      buyCount: number;
      sellCount: number;
      firstDate: Date;
      lastDate: Date;
    }>();

    for (const tx of transactions) {
      const existing = positionMap.get(tx.isin);
      if (existing) {
        if (tx.type === 'buy') {
          existing.totalQuantity += tx.quantity;
          existing.totalCost += tx.totalCost;
          existing.buyCount++;
        } else {
          existing.totalQuantity -= tx.quantity;
          existing.totalCost -= tx.totalCost;
          existing.sellCount++;
        }
        existing.totalFees += tx.fee;
        if (tx.date < existing.firstDate) existing.firstDate = tx.date;
        if (tx.date > existing.lastDate) existing.lastDate = tx.date;
      } else {
        positionMap.set(tx.isin, {
          product: tx.product,
          isin: tx.isin,
          currency: tx.currency,
          totalQuantity: tx.type === 'buy' ? tx.quantity : -tx.quantity,
          totalCost: tx.type === 'buy' ? tx.totalCost : -tx.totalCost,
          totalFees: tx.fee,
          buyCount: tx.type === 'buy' ? 1 : 0,
          sellCount: tx.type === 'sell' ? 1 : 0,
          firstDate: tx.date,
          lastDate: tx.date,
        });
      }
    }

    // Convert to positions
    const positions: ParsedPosition[] = [];
    let latestDate: Date | null = null;

    for (const [, pos] of positionMap) {
      if (pos.totalQuantity <= 0) {
        warnings.push(`${pos.product}: posição fechada (${pos.buyCount} compras, ${pos.sellCount} vendas)`);
        continue;
      }

      const avgCost = pos.totalCost / pos.totalQuantity;
      const assetClass = detectAssetClass(pos.product, null);

      positions.push({
        name: pos.product,
        ticker: null,
        isin: pos.isin,
        quantity: pos.totalQuantity,
        price: avgCost,  // average cost as price (will be updated with current price)
        marketValue: pos.totalCost,  // cost basis as initial value
        currency: 'EUR',
        assetClass,
        exchange: null,
        positionDate: pos.lastDate,
        priceDate: pos.lastDate,
      });

      if (!latestDate || pos.lastDate > latestDate) {
        latestDate = pos.lastDate;
      }
    }

    // Add summary to warnings
    const totalTxs = transactions.length;
    const totalBuys = transactions.filter(t => t.type === 'buy').length;
    const totalSells = transactions.filter(t => t.type === 'sell').length;
    const totalFees = transactions.reduce((sum, t) => sum + t.fee, 0);
    warnings.unshift(
      `${totalTxs} transações processadas (${totalBuys} compras, ${totalSells} vendas). Comissões totais: ${totalFees.toFixed(2)}€.`
    );

    return {
      positions,
      errors,
      warnings,
      referenceDate: latestDate,
    };
  }

  private extractChangeValue(row: RawImportRow): number | null {
    // The Change column in DEGIRO Account CSV has format: EUR,"1.234,56"
    // Due to CSV parsing with comma delimiter, the currency and value may be split
    const keys = Object.keys(row);
    // Look for the Change column (column index 7-8 typically)
    const changeKey = keys.find(k => k === 'Change');
    if (changeKey) {
      const val = parsePortugueseNumber(row[changeKey]);
      if (val !== null) return val;
    }
    // Sometimes the value is in an unnamed column after "Change"
    // Try scanning for a numeric value near the change position
    for (const key of keys) {
      if (key === '' || key.startsWith('__')) {
        const val = parsePortugueseNumber(row[key]);
        if (val !== null && Math.abs(val) > 0) return val;
      }
    }
    return null;
  }
}
