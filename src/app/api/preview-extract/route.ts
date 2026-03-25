import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Simplified system prompt for anonymous preview — just extract positions, no Morningstar
const PREVIEW_SYSTEM_PROMPT = `You are a financial data extraction assistant. You receive screenshots of brokerage/investment platforms and extract portfolio positions.

Extract ALL positions visible in the image. For each position, extract:
- name: security name or description
- ticker: ticker symbol (if visible)
- isin: ISIN code (if visible)
- quantity: number of shares/units
- price: price per share (if visible)
- marketValue: total market value
- currency: currency code (EUR, USD, GBP, etc.)
- assetClass: one of EQUITY, ETF, BOND, FUND, CASH, CRYPTO, COMMODITY

IMPORTANT RULES:
- SKIP options (puts, calls, spreads).
- For ALL cash/balance positions, use name="Liquidez" and assetClass="CASH".
- If there are multiple cash entries in different currencies, create separate positions: "Liquidez EUR", "Liquidez USD", etc.

Also extract:
- brokerName: the broker/platform name (e.g., "Lightyear", "DEGIRO", "Interactive Brokers", "Banco CTT", "Trading 212", "eToro", "Freedom24", "Revolut", "Novo Banco", "Coverflex", "XTB", "Trade Republic")
- If you see a total portfolio value, extract it as "totalValue".

Known platforms:
- "Banco CTT": "Conta à Ordem", "Saldo disponível" → CASH position
- "Novo Banco": green branding, "Todas as contas" → CASH position
- "Lightyear": purple/violet branding, lightning bolt, "Conta pessoal"/"Saldo"/"Investimentos"
- "DEGIRO": portfolio overview with positions table
- "Interactive Brokers" / "IBKR": "Your Holdings", "Cash Holdings" sections
- "Revolut": dark blue branding, "Investments"
- "Trading 212": "INVEST", "ACCOUNT VALUE", "MAIN POT" + "SPENDING POT" = total cash
- "eToro": green branding, "Account value", "Available Cash", "Invested & P/L"
- "Freedom24": portfolio positions
- "Coverflex": meal/benefits card, always CASH
- Portuguese banks (Millennium BCP, BPI, Montepio, Santander, Bankinter, ActivoBank, CGD): account balances as CASH

Return ONLY valid JSON:
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
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Serviço temporariamente indisponível.' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhuma imagem enviada' }, { status: 400 });
    }

    // Limit file size to 5MB for anonymous requests
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Imagem demasiado grande. Máximo 5MB.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    const mimeType = file.type || 'image/png';
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(mimeType)) {
      return NextResponse.json({ error: 'Formato não suportado. Usa PNG, JPEG, WEBP ou GIF.' }, { status: 400 });
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
      system: PREVIEW_SYSTEM_PROMPT,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'Sem resposta do modelo' }, { status: 500 });
    }

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
    console.error('Error processing preview image:', error);
    const message = error instanceof Error ? error.message : 'Erro ao processar imagem';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
