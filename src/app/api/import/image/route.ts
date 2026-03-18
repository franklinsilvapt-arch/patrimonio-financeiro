import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAuthUserId } from '@/lib/auth/get-user';

const SYSTEM_PROMPT = `You are a financial data extraction assistant. You receive screenshots of brokerage/investment platforms and extract portfolio positions.

Extract ALL positions visible in the image. For each position, extract:
- name: security name or description
- ticker: ticker symbol (if visible)
- isin: ISIN code (if visible)
- quantity: number of shares/units
- price: price per share (if visible)
- marketValue: total market value
- currency: currency code (EUR, USD, GBP, etc.)
- assetClass: one of EQUITY, ETF, BOND, FUND, CASH, CRYPTO, COMMODITY

Also extract:
- brokerName: the broker/platform name (e.g., "Lightyear", "DEGIRO", "Interactive Brokers", "Banco CTT")
- accountCash: any cash balance shown (as a position with assetClass=CASH)

Known platforms to identify:
- "Banco CTT" (bancoctt logo, Portuguese bank): look for "Conta à Ordem", "Saldo disponível", "Saldo contabilístico". Extract the balance as a CASH position.
- "Novo Banco" (novobanco logo, green branding): look for "Todas as contas", "Saldo disponível", IBAN starting with PT50. Extract the balance as a CASH position.
- "Lightyear": look for portfolio positions with "Latest price", "Avg. buy price", "Value" columns and any cash/"Uninvested" balance. May show company name like "FRANKLIN CAPITAL" for business accounts.
- "DEGIRO": look for portfolio overview with positions.
- "Interactive Brokers" / "IBKR": look for account summary or portfolio positions.
- "Revolut": look for "Investments", stock/crypto positions, and cash balances.
- "Freedom24" / "Freedom Finance": look for portfolio positions.
- "eToro": look for portfolio with positions and available balance.
- "Investing.com": look for a portfolio table with columns like "Nome", "Símbolo", "Tipo" (Compra/Venda), "Valor" (quantity), "Preço Méd.", "Preço atual", "Valor Merc.", "G/P Diários", "Resultado Líquido (%)", "G/P Líquido". Extract name, ticker (from "Símbolo"), quantity (from "Valor"), price (from "Preço atual"), marketValue (from "Valor Merc."), assetClass=EQUITY. Currency is usually EUR unless marked otherwise ($ means USD). Flags next to names indicate country of origin, not currency.

If you see a total portfolio value, extract it as "totalValue".

Return ONLY valid JSON in this exact format:
{
  "brokerName": "string",
  "totalValue": number or null,
  "positions": [
    {
      "name": "string",
      "ticker": "string or null",
      "isin": "string or null",
      "quantity": number,
      "price": number or null,
      "marketValue": number,
      "currency": "string",
      "assetClass": "string"
    }
  ]
}

If you cannot read the image clearly, return: {"error": "description of the problem"}
Be precise with numbers — extract them exactly as shown.`;

export async function POST(request: NextRequest) {
  try {
    await getAuthUserId();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY não configurada. Adicione ao ficheiro .env para usar importação por imagem.' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhuma imagem enviada' }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    // Determine media type
    const mimeType = file.type || 'image/png';
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(mimeType)) {
      return NextResponse.json({ error: 'Formato de imagem não suportado. Use PNG, JPEG, WEBP ou GIF.' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
                data: base64,
              },
            },
            {
              type: 'text',
              text: 'Extract all portfolio positions from this screenshot. Return only JSON.',
            },
          ],
        },
      ],
      system: SYSTEM_PROMPT,
    });

    // Extract text from response
    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'Sem resposta do modelo' }, { status: 500 });
    }

    // Parse JSON from response (may be wrapped in markdown code block)
    let jsonStr = textBlock.text.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const extracted = JSON.parse(jsonStr);

    if (extracted.error) {
      return NextResponse.json({ error: extracted.error }, { status: 422 });
    }

    return NextResponse.json(extracted);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    console.error('Error processing image:', error);
    const message = error instanceof Error ? error.message : 'Erro ao processar imagem';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
