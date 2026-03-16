import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Upload,
  Globe,
  Building2,
  ShieldCheck,
  LineChart,
} from 'lucide-react';

const features = [
  {
    icon: Upload,
    title: 'Importação multi-corretora',
    description: 'DEGIRO, Interactive Brokers, Trading 212, Lightyear e outras, via CSV ou screenshot.',
  },
  {
    icon: PieChart,
    title: 'Dashboard completo',
    description: 'Valor total, alocação por corretora, exposição por país, setor e moeda.',
  },
  {
    icon: TrendingUp,
    title: 'Rentabilidade real',
    description: 'TWR, retorno anualizado, YTD, mensal, trimestral e máximo drawdown.',
  },
  {
    icon: LineChart,
    title: 'Evolução do património',
    description: 'Gráficos em valor absoluto (€) e percentual (%), com filtros por período.',
  },
  {
    icon: Building2,
    title: 'Pessoal e empresarial',
    description: 'Separa contas pessoais e empresariais e alterna entre elas facilmente.',
  },
  {
    icon: Globe,
    title: 'Conversão cambial',
    description: 'Posições em USD convertidas automaticamente para EUR com taxas BCE.',
  },
  {
    icon: BarChart3,
    title: 'Enriquecimento de ETFs',
    description: 'Dados de país, setor e fatores obtidos automaticamente via JustETF.',
  },
  {
    icon: ShieldCheck,
    title: 'Seguro e privado',
    description: 'Os teus dados ficam protegidos com autenticação e encriptação. Sem tracking.',
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto w-full max-w-7xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          O teu património financeiro,
          <br />
          <span className="text-primary">numa única vista.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Agrega posições de todas as tuas corretoras e bancos num só dashboard.
          Visualiza alocação, rentabilidade e evolução, sem partilhar dados com terceiros.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button size="lg" asChild>
            <a href="/demo">Experimentar demo</a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="/dashboard">Começar agora</a>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-7xl px-6 pb-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title}>
              <CardContent className="pt-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <div className="mx-auto w-full max-w-7xl px-6">
          Criado por Franklin Carneiro da Silva, cofundador do{' '}
          <a href="https://literaciafinanceira.pt" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:underline">
            LiteraciaFinanceira.pt
          </a>
        </div>
      </footer>
    </>
  );
}
