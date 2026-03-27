import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAuthUserId } from '@/lib/auth/get-user';
import { prisma } from '@/lib/db';

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

IMPORTANT RULES:
- SKIP options (puts, calls, spreads). If you see "Put", "Call", "P" suffix in option format (e.g., "NKE Apr 10 $51 Put", "MSTR Jul 125/100"), DO NOT include them.
- For ALL cash/balance positions (Available Cash, Cash Balance, Conta à Ordem, Saldo, Main Pot, Spending Pot, etc.), use name="Liquidez" and assetClass="CASH". If there are multiple cash entries in different currencies, create separate positions: "Liquidez EUR", "Liquidez USD", etc.

Also extract:
- brokerName: the broker/platform name (e.g., "Lightyear", "DEGIRO", "Interactive Brokers", "Banco CTT")
- accountCash: any cash balance shown (as a position with assetClass=CASH, name="Liquidez")

Known platforms to identify:
- "Banco CTT" (bancoctt logo, Portuguese bank): look for "Conta à Ordem", "Saldo disponível", "Saldo contabilístico". Extract the balance as a CASH position.
- "Novo Banco" (novobanco logo, green branding): look for "Todas as contas", "Saldo disponível", IBAN starting with PT50. Extract the balance as a CASH position.
- "Lightyear": IMPORTANT — Lightyear has a distinctive purple/violet branding with a lightning bolt icon. Look for "Conta pessoal" or "Conta empresarial", "Saldo", "Investimentos", "Depositar", "Converter", "Levantar" buttons. The app shows "Saldo" as cash balance and "Investimentos" as investment value. On desktop, look for "Latest price", "Avg. buy price", "Value" columns. DO NOT confuse with Revolut — Lightyear uses purple branding, Revolut uses blue/dark.
- "DEGIRO": look for portfolio overview with positions.
- "Interactive Brokers" / "IBKR": look for account summary or portfolio positions, "Your Holdings", "Cash Holdings" sections.
- "Revolut": look for dark blue branding, "Investments" with stock/crypto positions. Revolut does NOT have "Conta pessoal"/"Depositar"/"Converter"/"Levantar" in Portuguese — that's Lightyear.
- "Freedom24" / "Freedom Finance": look for portfolio positions.
- "eToro": Green branding with green chart area. Home screen shows "Account value" (total), "Available Cash" and "Invested & P/L" cards, plus market indices (NQ100, SPX500, BTC, DJ30) and "Daily Highlights" section. The "Available Cash" is CASH. If this is the HOME screen (not Portfolio tab), extract cash as a CASH position and set "investmentsWarning": "eToro mostra investimentos de $X. Tira um screenshot da tab 'Portfolio' para importar as posições." where X is the Invested value. The PORTFOLIO tab shows "My Portfolio" with columns: Asset, Change, P/L, Net Value — extract each asset with ticker, Net Value as marketValue, and assetClass (EQUITY for stocks, ETF for ETFs like SXR8.DE/VTI, CRYPTO for BTC). "Total Available Cash" at the bottom is also CASH. Ignore "Daily Highlights", "Watchlist", and market indices — those are NOT positions.
- "Trading 212": look for "INVEST" branding, "ACCOUNT VALUE", and cards for "INVESTMENTS", "MAIN POT", "SPENDING POT". Cash = "MAIN POT" + "SPENDING POT" values (sum both as a single CASH position). The "INVESTMENTS" card shows total invested value. Items in "Short list", "Most owned", "New on T212" sections are watchlist items, NOT positions — ignore them. If "INVESTMENTS" value is greater than €0.00, add a warning in the response: set "investmentsWarning": "Trading 212 mostra investimentos de X€. Tira um segundo screenshot da tab de investimentos para importar essas posições." where X is the investments value.
- "Investing.com": look for a portfolio table with columns like "Nome", "Símbolo", "Tipo" (Compra/Venda), "Valor" (quantity), "Preço Méd.", "Preço atual", "Valor Merc.", "G/P Diários", "Resultado Líquido (%)", "G/P Líquido". Extract name, ticker (from "Símbolo"), quantity (from "Valor"), price (from "Preço atual"), marketValue (from "Valor Merc."), assetClass=EQUITY. Currency is usually EUR unless marked otherwise ($ means USD). Flags next to names indicate country of origin, not currency.
- "Coverflex": Portuguese meal/benefits card. Look for "Coverflex" branding, "Cartão Refeição", "Saldo", balance amounts. Extract the total balance as a single CASH position with name="Liquidez", brokerName="Coverflex". This is a meal card — always classify as CASH/Liquidez regardless of the card type (refeição, flexível, etc.).
- "XTB": look for "XTB" branding, portfolio positions with ticker/name, quantity, value. Extract all positions.
- "Trade Republic": look for "Trade Republic" branding, portfolio overview with positions and cash balance.
- Portuguese banks (Millennium BCP, BPI, Montepio, Santander, Bankinter, ActivoBank, Caixa Geral de Depósitos): look for account balances, "Saldo", "Conta à Ordem". Extract balances as CASH positions with the bank name as brokerName.

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

SPECIAL CASE — Morningstar Factor Profile / Portfolio page:
If you detect a Morningstar page (morningstar.com branding, "Factor Profile" section, "Portfolio" tab, etc.), this is NOT a portfolio position import. Instead, extract factor data for the ETF shown.

Look for:
- The ETF name and ISIN at the top (e.g., "iShares Core MSCI World UCITS ETF USD (Acc) IE00B4L5Y983")
- The "Factor Profile" section with factor bars/dots for: Style, Yield, Momentum, Quality, Volatility, Liquidity, Size
- Each factor has a position on a scale from Low to High (or Value to Growth for Style, Small to Large for Size)
- The position labels below each bar (e.g., "Value", "Low", "Low", "Low", "Low", "Low", "Small")

Convert the position to a numeric score:
- For Style: Value=-1, Blend=0, Growth=1 (Gwth=1)
- For Yield/Momentum/Quality/Volatility/Liquidity: Low=-1, Below Avg=-0.5, Average=0, Above Avg=0.5, High=1
- For Size: Small=-1, Mid=0, Large=1

Return this format for Morningstar:
{
  "type": "morningstar_factors",
  "etfName": "string",
  "isin": "string or null",
  "factors": {
    "style": number,
    "yield": number,
    "momentum": number,
    "quality": number,
    "volatility": number,
    "liquidity": number,
    "size": number
  }
}

If you cannot read the image clearly, return: {"error": "description of the problem"}
Be precise with numbers — extract them exactly as shown.`;

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();

    // Free plan: max 2 image imports per month
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, imageUploadsThisMonth: true, imageUploadsResetAt: true },
    }).catch(() => null);
    if (user && user.plan !== 'plus') {
      const now = new Date();
      const resetAt = new Date(user.imageUploadsResetAt);
      const sameMonth = resetAt.getFullYear() === now.getFullYear() && resetAt.getMonth() === now.getMonth();
      const count = sameMonth ? user.imageUploadsThisMonth : 0;
      if (count >= 2) {
        return NextResponse.json({ error: 'IMAGE_LIMIT' }, { status: 403 });
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY não configurada. Adiciona ao ficheiro .env para usar importação por imagem.' },
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

    // Handle Morningstar factor data — save directly to DB
    if (extracted.type === 'morningstar_factors' && extracted.isin && extracted.factors) {
      const security = await prisma.security.findFirst({ where: { isin: extracted.isin } });
      if (!security) {
        return NextResponse.json({
          type: 'morningstar_factors',
          saved: false,
          error: `Nenhum ativo encontrado com ISIN ${extracted.isin}. Importa primeiro as posições.`,
          ...extracted,
        });
      }
      const now = new Date();
      const dateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      // Delete existing factor exposures for this security to avoid duplicates
      await prisma.factorExposure.deleteMany({ where: { securityId: security.id } });
      // Create new factor exposures
      const factorEntries = Object.entries(extracted.factors as Record<string, number>);
      await prisma.factorExposure.createMany({
        data: factorEntries.map(([factor, score]) => ({
          securityId: security.id,
          factor,
          score: score as number,
          method: 'morningstar_screenshot',
          date: dateOnly,
          source: 'morningstar',
          confidence: 0.9,
          coverage: 1,
        })),
      });
      return NextResponse.json({
        type: 'morningstar_factors',
        saved: true,
        etfName: extracted.etfName,
        isin: extracted.isin,
        factorsCount: factorEntries.length,
        securityName: security.name,
      });
    }

    // Increment image upload counter for free users
    const now = new Date();
    const resetAt = user ? new Date(user.imageUploadsResetAt) : now;
    const sameMonth = resetAt.getFullYear() === now.getFullYear() && resetAt.getMonth() === now.getMonth();
    await prisma.user.update({
      where: { id: userId },
      data: {
        imageUploadsThisMonth: sameMonth ? { increment: 1 } : 1,
        imageUploadsResetAt: sameMonth ? undefined : now,
      },
    }).catch(() => {});

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
