import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth/get-user';

export const maxDuration = 30;

export async function GET() {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada' }, { status: 503 });
  }

  try {
    // Gather all portfolio data
    const holdings = await prisma.holding.findMany({
      where: { account: { userId } },
      include: {
        security: {
          include: {
            countryExposures: true,
            sectorExposures: true,
          },
        },
        account: { include: { broker: true } },
      },
    });

    if (holdings.length === 0) {
      return NextResponse.json({ error: 'Sem posições para analisar' }, { status: 400 });
    }

    // Deduplicate: keep most recent per security+account
    const latest = new Map<string, typeof holdings[0]>();
    for (const h of holdings) {
      const key = `${h.securityId}_${h.accountId}`;
      const existing = latest.get(key);
      if (!existing || h.positionDate > existing.positionDate) {
        latest.set(key, h);
      }
    }
    const active = Array.from(latest.values());
    const totalValue = active.reduce((sum, h) => sum + (h.marketValue || 0), 0);

    // Build summary for AI
    const positionsSummary = active
      .sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0))
      .map((h) => ({
        name: h.security.name,
        ticker: h.security.ticker,
        isin: h.security.isin,
        assetClass: h.security.assetClass,
        broker: h.account.broker.name,
        value: Math.round(h.marketValue || 0),
        weight: totalValue > 0 ? ((h.marketValue || 0) / totalValue * 100).toFixed(1) + '%' : '0%',
        countries: h.security.countryExposures.length > 0
          ? h.security.countryExposures.map((c) => `${c.countryName} ${(c.weight * 100).toFixed(0)}%`).join(', ')
          : h.security.country || 'N/A',
        sectors: h.security.sectorExposures.length > 0
          ? h.security.sectorExposures.slice(0, 5).map((s) => `${s.sector} ${(s.weight * 100).toFixed(0)}%`).join(', ')
          : h.security.sector || 'N/A',
      }));

    // Aggregate country exposure
    const countryMap = new Map<string, number>();
    for (const h of active) {
      const mv = h.marketValue || 0;
      if (h.security.countryExposures.length > 0) {
        for (const ce of h.security.countryExposures) {
          countryMap.set(ce.countryName, (countryMap.get(ce.countryName) || 0) + mv * ce.weight);
        }
      } else if (h.security.country) {
        countryMap.set(h.security.country, (countryMap.get(h.security.country) || 0) + mv);
      }
    }
    const topCountries = Array.from(countryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, val]) => `${name}: ${(val / totalValue * 100).toFixed(1)}%`);

    // Aggregate sector exposure
    const sectorMap = new Map<string, number>();
    for (const h of active) {
      const mv = h.marketValue || 0;
      if (h.security.sectorExposures.length > 0) {
        for (const se of h.security.sectorExposures) {
          sectorMap.set(se.sector, (sectorMap.get(se.sector) || 0) + mv * se.weight);
        }
      } else if (h.security.sector) {
        sectorMap.set(h.security.sector, (sectorMap.get(h.security.sector) || 0) + mv);
      }
    }
    const topSectors = Array.from(sectorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, val]) => `${name}: ${(val / totalValue * 100).toFixed(1)}%`);

    // Asset class breakdown
    const assetMap = new Map<string, number>();
    for (const h of active) {
      const cls = h.security.assetClass;
      assetMap.set(cls, (assetMap.get(cls) || 0) + (h.marketValue || 0));
    }
    const assetBreakdown = Array.from(assetMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cls, val]) => `${cls}: ${(val / totalValue * 100).toFixed(1)}%`);

    const prompt = `Analisa este portfólio de investimento e devolve um JSON com a tua análise. Responde APENAS em português de Portugal (PT-PT).

DADOS DO PORTFÓLIO:
- Valor total: ${Math.round(totalValue).toLocaleString('pt-PT')} €
- Número de posições: ${active.length}
- Corretoras: ${Array.from(new Set(active.map(h => h.account.broker.name))).join(', ')}

POSIÇÕES (por peso):
${positionsSummary.map(p => `${p.name} (${p.ticker || 'N/A'}) — ${p.assetClass} — ${p.value}€ (${p.weight}) — Países: ${p.countries} — Setores: ${p.sectors}`).join('\n')}

EXPOSIÇÃO POR PAÍS (top 10):
${topCountries.join('\n')}

EXPOSIÇÃO POR SETOR (top 10):
${topSectors.join('\n')}

CLASSES DE ATIVO:
${assetBreakdown.join('\n')}

Devolve APENAS um JSON válido com esta estrutura exata:
{
  "score": <número 0-100 representando diversificação global>,
  "grade": "<A, B, C ou D>",
  "scoreExplanation": "<1 frase curta a explicar o score>",
  "concentrationRisk": {
    "title": "<ex: As tuas 3 maiores posições representam X% do portfólio>",
    "detail": "<1-2 frases sobre o risco de concentração>"
  },
  "strengths": ["<ponto forte 1>", "<ponto forte 2>"],
  "risks": ["<risco 1>", "<risco 2>"],
  "overlapNotes": "<Se existirem ETFs com sobreposição de holdings, comenta aqui. Caso contrário, null>"
}

Regras:
- Sê direto e concreto, sem jargão desnecessário
- Usa dados reais do portfólio (não inventes números)
- NÃO dês sugestões de investimento nem aconselhamento financeiro — limita-te a descrever factos sobre a composição do portfólio
- O score deve refletir: diversificação geográfica, setorial, por classe de ativo e concentração
- Se vires ETFs globais (VWCE, IWDA, SWDA, etc.) e ETFs regionais (CSPX, SXR8, etc.) que se sobrepõem, menciona em overlapNotes`;

    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'Sem resposta do modelo' }, { status: 500 });
    }

    let jsonStr = textBlock.text.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const analysis = JSON.parse(jsonStr);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error generating analysis:', error);
    return NextResponse.json({ error: 'Erro ao gerar análise' }, { status: 500 });
  }
}
