'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function RegisterForm() {
  const searchParams = useSearchParams();
  const upgrade = searchParams.get('upgrade') === 'true';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao criar conta');
        setLoading(false);
        return;
      }

      // Auto sign-in after registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Conta criada, mas erro ao entrar. Tenta na página de login.');
      } else if (typeof window !== 'undefined' && sessionStorage.getItem('preview-data')) {
        // Came from homepage preview — auto-import the extracted positions
        const BROKER_MAP: Record<string, string> = {
          'degiro': 'degiro', 'interactive brokers': 'ibkr', 'ibkr': 'ibkr',
          'trading 212': 'trading212', 'lightyear': 'lightyear', 'revolut': 'revolut',
          'etoro': 'etoro', 'freedom24': 'freedom24', 'novo banco': 'novobanco',
          'banco ctt': 'bancoctt', 'coverflex': 'coverflex', 'xtb': 'xtb',
          'trade republic': 'traderepublic', 'millennium bcp': 'millenniumbcp',
          'bpi': 'bpi', 'montepio': 'montepio', 'santander': 'santander',
          'bankinter': 'bankinter', 'activobank': 'activobank',
          'caixa geral de depósitos': 'caixageral', 'investing.com': 'investing',
        };
        try {
          const preview = JSON.parse(sessionStorage.getItem('preview-data')!);
          if (preview.positions?.length > 0) {
            const brokerSlug = (preview.brokerName ? BROKER_MAP[preview.brokerName.toLowerCase()] : null) || 'other';
            const accountName = 'Principal';
            // Clear existing holdings for this broker first
            await fetch('/api/holdings/clear', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ brokerSlug, accountName }),
            }).catch(() => {});
            // Import each position
            for (const pos of preview.positions) {
              await fetch('/api/holdings/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: pos.name,
                  ticker: pos.ticker || undefined,
                  isin: pos.isin || undefined,
                  quantity: pos.quantity,
                  price: pos.price || undefined,
                  marketValue: pos.marketValue,
                  currency: pos.currency || 'EUR',
                  assetClass: pos.assetClass || 'ETF',
                  brokerSlug,
                }),
              }).catch(() => {});
            }
          }
          sessionStorage.removeItem('preview-data');
        } catch {}
        window.location.href = '/dashboard';
      } else if (upgrade) {
        // Came from "Começar com Plus" — go straight to Stripe checkout
        const checkoutRes = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const checkoutData = await checkoutRes.json();
        window.location.href = checkoutData.url ?? '/dashboard';
      } else {
        window.location.href = '/dashboard';
      }
    } catch {
      setError('Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-6 py-20">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Criar conta</CardTitle>
          <p className="text-sm text-muted-foreground">
            Começa a agregar o teu património financeiro
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Nome
              </label>
              <input
                id="name"
                type="text"
                placeholder="O teu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="tu@exemplo.pt"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'A criar conta...' : 'Criar conta'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tens conta?{' '}
            <a href="/entrar" className="font-medium text-primary hover:underline">
              Entrar
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
