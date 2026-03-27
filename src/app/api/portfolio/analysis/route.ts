import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth/get-user';

export const maxDuration = 30;

// ---------------------------------------------------------------------------
// Herfindahl-Hirschman Index (HHI) — measures concentration
// Returns 0 (perfectly concentrated) to 1 (perfectly spread)
// ---------------------------------------------------------------------------
function hhi(weights: number[]): number {
  if (weights.length === 0) return 0;
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  const normalized = weights.map((w) => w / sum);
  const hhi = normalized.reduce((acc, w) => acc + w * w, 0);
  // HHI ranges from 1/n (perfect spread) to 1 (single item)
  // Normalize to 0-1 where 1 = best diversification
  const n = weights.length;
  if (n <= 1) return 0;
  const minHhi = 1 / n;
  return (1 - hhi) / (1 - minHhi);
}

// ---------------------------------------------------------------------------
// Score calculation — 4 dimensions, 25 points each
// ---------------------------------------------------------------------------
function computeScore(data: {
  positionWeights: number[];
  countryWeights: number[];
  sectorWeights: number[];
  assetClassWeights: number[];
  numCountries: number;
  numSectors: number;
  numAssetClasses: number;
  numPositions: number;
}) {
  // 1. Geographic diversification (25 pts)
  // HHI component (max 15) + breadth bonus (max 10)
  const geoHhi = hhi(data.countryWeights);
  const geoBreadth = Math.min(data.numCountries / 10, 1); // 10+ countries = full marks
  const geoScore = Math.round(geoHhi * 15 + geoBreadth * 10);

  // 2. Sector diversification (25 pts)
  const sectorHhi = hhi(data.sectorWeights);
  const sectorBreadth = Math.min(data.numSectors / 8, 1); // 8+ sectors = full marks
  const sectorScore = Math.round(sectorHhi * 15 + sectorBreadth * 10);

  // 3. Asset class mix (25 pts)
  const assetHhi = hhi(data.assetClassWeights);
  const assetBreadth = Math.min(data.numAssetClasses / 4, 1); // 4+ classes = full marks
  const assetScore = Math.round(assetHhi * 15 + assetBreadth * 10);

  // 4. Concentration / position spread (25 pts)
  const posHhi = hhi(data.positionWeights);
  const posBreadth = Math.min(data.numPositions / 15, 1); // 15+ positions = full marks
  const concScore = Math.round(posHhi * 15 + posBreadth * 10);

  const total = geoScore + sectorScore + assetScore + concScore;
  const grade = total >= 75 ? 'A' : total >= 55 ? 'B' : total >= 35 ? 'C' : 'D';

  return {
    total,
    grade,
    breakdown: {
      geographic: { score: geoScore, max: 25, countries: data.numCountries },
      sector: { score: sectorScore, max: 25, sectors: data.numSectors },
      assetClass: { score: assetScore, max: 25, classes: data.numAssetClasses },
      concentration: { score: concScore, max: 25, positions: data.numPositions },
    },
  };
}

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
    const countryWeights = Array.from(countryMap.values());
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
    const sectorWeights = Array.from(sectorMap.values());
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
    const assetClassWeights = Array.from(assetMap.values());
    const assetBreakdown = Array.from(assetMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cls, val]) => `${cls}: ${(val / totalValue * 100).toFixed(1)}%`);

    // Position weights
    const positionWeights = active.map((h) => h.marketValue || 0);

    // Compute deterministic score
    const scoreResult = computeScore({
      positionWeights,
      countryWeights,
      sectorWeights,
      assetClassWeights,
      numCountries: countryMap.size,
      numSectors: sectorMap.size,
      numAssetClasses: assetMap.size,
      numPositions: active.length,
    });

    // Top 3 concentration
    const sortedWeights = positionWeights.sort((a, b) => b - a);
    const top3Pct = totalValue > 0
      ? ((sortedWeights.slice(0, 3).reduce((a, b) => a + b, 0) / totalValue) * 100).toFixed(1)
      : '0';

    const prompt = `Analisa este portfólio de investimento e devolve um JSON com a tua análise. Responde APENAS em português de Portugal (PT-PT).

DADOS DO PORTFÓLIO:
- Valor total: ${Math.round(totalValue).toLocaleString('pt-PT')} €
- Número de posições: ${active.length}
- Corretoras: ${Array.from(new Set(active.map(h => h.account.broker.name))).join(', ')}
- Top 3 posições: ${top3Pct}% do portfólio

POSIÇÕES (por peso):
${positionsSummary.map(p => `${p.name} (${p.ticker || 'N/A'}) — ${p.assetClass} — ${p.value}€ (${p.weight}) — Países: ${p.countries} — Setores: ${p.sectors}`).join('\n')}

EXPOSIÇÃO POR PAÍS (top 10):
${topCountries.join('\n')}

EXPOSIÇÃO POR SETOR (top 10):
${topSectors.join('\n')}

CLASSES DE ATIVO:
${assetBreakdown.join('\n')}

SCORE DE DIVERSIFICAÇÃO (já calculado, NÃO alteres):
- Total: ${scoreResult.total}/100 (${scoreResult.grade})
- Geográfica: ${scoreResult.breakdown.geographic.score}/25 (${scoreResult.breakdown.geographic.countries} países)
- Setorial: ${scoreResult.breakdown.sector.score}/25 (${scoreResult.breakdown.sector.sectors} setores)
- Classes de ativo: ${scoreResult.breakdown.assetClass.score}/25 (${scoreResult.breakdown.assetClass.classes} classes)
- Concentração: ${scoreResult.breakdown.concentration.score}/25 (${scoreResult.breakdown.concentration.positions} posições)

Devolve APENAS um JSON válido com esta estrutura exata:
{
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
- Se vires ETFs globais (VWCE, IWDA, SWDA, etc.) e ETFs regionais (CSPX, SXR8, etc.) que se sobrepõem, menciona em overlapNotes`;

    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
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

    const aiAnalysis = JSON.parse(jsonStr);

    // Merge deterministic score with AI commentary
    return NextResponse.json({
      score: scoreResult.total,
      grade: scoreResult.grade,
      breakdown: scoreResult.breakdown,
      ...aiAnalysis,
    });
  } catch (error) {
    console.error('Error generating analysis:', error);
    return NextResponse.json({ error: 'Erro ao gerar análise' }, { status: 500 });
  }
}
