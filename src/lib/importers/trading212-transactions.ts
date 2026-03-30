import { parse } from 'csv-parse/sync';
import type { BrokerImporter, ImportParseResult, ParsedPosition, RawImportRow } from './types';
import { normalizeCSVContent, detectAssetClass } from './base';

// ---------------------------------------------------------------------------
// Trading 212 CSV (transactions) parser
// Parses Market buy/sell transactions and aggregates into current positions.
// Ignores card debits, interest, cashback, deposits, withdrawals, etc.
// ---------------------------------------------------------------------------

interface Transaction {
  date: Date;
  product: string;
  isin: string;
  ticker: string;
  type: 'buy' | 'sell';
  quantity: number;
  pricePerShare: number;
  priceCurrency: string;
  exchangeRate: number;
  result: number;
  totalEur: number;
  conversionFee: number;
}

export class Trading212TransactionsImporter implements BrokerImporter {
  brokerSlug = 'trading212-transactions';

  detectFormat(content: string): boolean {
    const normalized = normalizeCSVContent(content);
    const firstLine = normalized.split('\n')[0] || '';
    // Trading 212 has these specific columns
    return (
      firstLine.includes('Action') &&
      firstLine.includes('No. of shares') &&
      firstLine.includes('Price / share') &&
      firstLine.includes('Currency (Price / share)')
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

    // Extract buy/sell transactions
    const transactions: Transaction[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const action = row['Action']?.trim() || '';

      // Only process Market buy/sell and Limit buy/sell
      const isBuy = action === 'Market buy' || action === 'Limit buy';
      const isSell = action === 'Market sell' || action === 'Limit sell';
      if (!isBuy && !isSell) continue;

      const isin = row['ISIN']?.trim() || '';
      const ticker = row['Ticker']?.trim() || '';
      const name = row['Name']?.trim() || '';
      const timeStr = row['Time']?.trim() || '';
      const sharesStr = row['No. of shares']?.trim() || '';
      const priceStr = row['Price / share']?.trim() || '';
      const priceCurrency = row['Currency (Price / share)']?.trim() || 'EUR';
      const exchangeRateStr = row['Exchange rate']?.trim() || '1';
      const resultStr = row['Result']?.trim() || '0';
      const totalStr = row['Total']?.trim() || '0';
      const totalCurrency = row['Currency (Total)']?.trim() || 'EUR';
      const conversionFeeStr = row['Currency conversion fee']?.trim() || '0';

      if (!isin || !name) {
        warnings.push(`Linha ${i + 2}: a ignorar transação sem ISIN/nome`);
        continue;
      }

      const quantity = parseFloat(sharesStr);
      const pricePerShare = parseFloat(priceStr);
      const exchangeRate = parseFloat(exchangeRateStr) || 1;
      const result = parseFloat(resultStr) || 0;
      const totalValue = Math.abs(parseFloat(totalStr) || 0);
      const conversionFee = Math.abs(parseFloat(conversionFeeStr) || 0);

      if (isNaN(quantity) || quantity === 0) {
        warnings.push(`Linha ${i + 2}: a ignorar "${name}" com quantidade zero`);
        continue;
      }

      // Parse date: "2025-05-12 07:07:05"
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) {
        warnings.push(`Linha ${i + 2}: data inválida para "${name}"`);
        continue;
      }

      // Total is in EUR (or the account currency)
      // For buys, total is the cost; for sells, total is the proceeds
      const totalEur = totalCurrency === 'EUR' ? totalValue : totalValue / exchangeRate;

      transactions.push({
        date,
        product: name,
        isin,
        ticker,
        type: isBuy ? 'buy' : 'sell',
        quantity,
        pricePerShare,
        priceCurrency,
        exchangeRate,
        result,
        totalEur,
        conversionFee,
      });
    }

    if (transactions.length === 0) {
      return {
        positions: [],
        errors: ['Nenhuma transação de compra/venda encontrada neste ficheiro.'],
        warnings: [],
        referenceDate: null,
      };
    }

    // Aggregate into current positions
    const positionMap = new Map<string, {
      product: string;
      isin: string;
      ticker: string;
      totalQuantity: number;
      totalCostEur: number;
      totalFees: number;
      totalResult: number;
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
          existing.totalCostEur += tx.totalEur;
          existing.buyCount++;
        } else {
          existing.totalQuantity -= tx.quantity;
          existing.totalCostEur -= tx.totalEur;
          existing.sellCount++;
          existing.totalResult += tx.result;
        }
        existing.totalFees += tx.conversionFee;
        if (tx.date < existing.firstDate) existing.firstDate = tx.date;
        if (tx.date > existing.lastDate) existing.lastDate = tx.date;
      } else {
        positionMap.set(tx.isin, {
          product: tx.product,
          isin: tx.isin,
          ticker: tx.ticker,
          totalQuantity: tx.type === 'buy' ? tx.quantity : -tx.quantity,
          totalCostEur: tx.type === 'buy' ? tx.totalEur : -tx.totalEur,
          totalFees: tx.conversionFee,
          totalResult: tx.type === 'sell' ? tx.result : 0,
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
      // Round to avoid floating point dust (Trading 212 uses fractional shares)
      const qty = Math.round(pos.totalQuantity * 10000000) / 10000000;

      if (qty <= 0.0000001) {
        warnings.push(`${pos.product}: posição fechada (${pos.buyCount} compras, ${pos.sellCount} vendas)`);
        continue;
      }

      const avgCost = pos.totalCostEur / qty;
      const assetClass = detectAssetClass(pos.product, pos.ticker);

      positions.push({
        name: pos.product,
        ticker: pos.ticker || null,
        isin: pos.isin,
        quantity: qty,
        price: avgCost,
        marketValue: pos.totalCostEur,
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

    // Summary
    const totalBuys = transactions.filter(t => t.type === 'buy').length;
    const totalSells = transactions.filter(t => t.type === 'sell').length;
    const totalFees = transactions.reduce((sum, t) => sum + t.conversionFee, 0);
    warnings.unshift(
      `${transactions.length} transações processadas (${totalBuys} compras, ${totalSells} vendas). Taxas de conversão: ${totalFees.toFixed(2)}€.`
    );

    return {
      positions,
      errors,
      warnings,
      referenceDate: latestDate,
    };
  }
}
