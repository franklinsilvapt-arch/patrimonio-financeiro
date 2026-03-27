import { HomepageUpload } from '@/components/homepage-upload';
import { UpgradeButton } from '@/components/upgrade-button';

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-black mb-4 leading-tight font-[family-name:var(--font-manrope)]">
            O teu património financeiro,
            <br />
            <span className="text-slate-500">numa única vista.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 mb-8 leading-relaxed">
            Agrega posições de todas as tuas corretoras e bancos num só dashboard.
            Visualiza alocação, rentabilidade e evolução, sem partilhar dados com terceiros.
          </p>
          {/* Começa aqui + Dashboard Preview — side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-6xl mx-auto items-center">
            {/* Começa aqui — upload CTA */}
            <div className="lg:col-span-2 flex flex-col items-center order-2 lg:order-1">
              <HomepageUpload />
            </div>

            {/* Dashboard image — takes more space */}
            <div className="lg:col-span-3 order-1 lg:order-2">
              <div className="rounded-2xl shadow-2xl border border-slate-200/50 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/dashboard-preview.png"
                  alt="Dashboard do Património Financeiro mostrando alocação por corretora, tipo de ativo, evolução do património e métricas de rentabilidade"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-300 bg-black px-3 py-1 rounded">
              Funcionalidades
            </span>
            <h2 className="text-4xl font-extrabold text-black mt-6 tracking-tight font-[family-name:var(--font-manrope)]">
              Tudo o que precisas para gerir a tua riqueza.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f) => (
              <div key={f.title} className="bg-white p-8 rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <span className="material-symbols-outlined text-black text-3xl mb-4">{f.icon}</span>
                <h3 className="text-lg font-bold mb-3 font-[family-name:var(--font-manrope)]">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      {/* NOTE: Update the Plus plan price below as needed — search for "9€/mês" */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16 text-center">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-300 bg-black px-3 py-1 rounded">
              Planos
            </span>
            <h2 className="text-4xl font-extrabold text-black mt-6 tracking-tight font-[family-name:var(--font-manrope)]">
              Simples e transparente.
            </h2>
            <p className="mt-3 text-lg text-slate-500">Começa grátis, faz upgrade quando quiseres.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-8 flex flex-col">
              <div className="mb-6">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Grátis</p>
                <p className="mt-2 text-4xl font-extrabold text-black font-[family-name:var(--font-manrope)]">0€</p>
                <p className="text-sm text-slate-400 mt-1">&nbsp;</p>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {freePlanFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="/registar"
                className="block w-full text-center px-10 py-4 bg-black text-white font-black rounded-lg hover:opacity-80 transition-opacity text-base"
              >
                Criar conta grátis
              </a>
            </div>

            {/* Plus Plan */}
            <div className="bg-black rounded-2xl p-8 flex flex-col relative overflow-hidden">
              {/* Background accent */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400 rounded-full blur-[80px] opacity-20 pointer-events-none" />
              <div className="relative z-10 flex flex-col flex-1">
                <div className="mb-6">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-400">Plus</p>
                    <span className="text-[10px] font-black bg-emerald-400 text-black px-2 py-0.5 rounded uppercase tracking-wider">Popular</span>
                  </div>
                  <p className="mt-2 text-4xl font-extrabold text-white font-[family-name:var(--font-manrope)]">1,99€<span className="text-xl font-semibold text-slate-400">/mês</span></p>
                  <p className="text-sm text-slate-400 mt-1">sem compromisso</p>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  <li className="text-xs font-semibold uppercase tracking-widest text-slate-500 pb-1">Tudo do plano Grátis, mais:</li>
                  {plusPlanExtraFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white">
                      <svg className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <UpgradeButton />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative bg-black text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-400 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-8 tracking-tighter font-[family-name:var(--font-manrope)]">
            Pronto para ter controlo total sobre os teus investimentos?
          </h2>
          <a
            href="/registar"
            className="inline-block px-10 py-5 bg-emerald-400 text-black font-black rounded-lg shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 text-lg"
          >
            Criar conta grátis
          </a>
          <p className="mt-6 text-slate-400 text-sm font-medium">
            Sem cartão de crédito necessário. Importa o teu primeiro extrato em menos de 2 minutos.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <p className="text-lg font-bold text-black font-[family-name:var(--font-manrope)] tracking-tight">Património Financeiro</p>
            <p className="mt-2 text-sm text-slate-500">
              © {new Date().getFullYear()} Património Financeiro.
              <br />
              Todos os direitos reservados.
            </p>
          </div>

          {/* Legal */}
          <div>
            <p className="text-sm font-semibold text-slate-800 mb-3">Legal</p>
            <div className="space-y-2">
              <a href="/termos" className="block text-sm text-slate-500 hover:text-black transition-colors">Termos e Condições</a>
              <a href="/privacidade" className="block text-sm text-slate-500 hover:text-black transition-colors">Política de privacidade</a>
            </div>
          </div>

          {/* Creator */}
          <div>
            <p className="text-sm text-slate-500">
              Criado por{' '}
              <a href="https://www.linkedin.com/in/franklin-carneiro-silva/" target="_blank" rel="noopener noreferrer" className="font-medium text-slate-700 hover:underline">
                Franklin Carneiro da Silva
              </a>
              , cofundador do{' '}
              <a href="https://literaciafinanceira.pt" target="_blank" rel="noopener noreferrer" className="font-medium text-slate-700 hover:underline">
                LiteraciaFinanceira.pt
              </a>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

const freePlanFeatures = [
  '1 corretora ou banco',
  'Dashboard completo: alocação, países, setores, fatores',
  'Rentabilidade real (TWR, YTD, drawdown)',
  'Evolução histórica do portfolio',
  'Importação via screenshot (2/mês), CSV ou manual',
  'Sem cartão de crédito',
];

const plusPlanExtraFeatures = [
  'Corretoras ilimitadas',
  'Importações por imagem ilimitadas',
  'Contas pessoal e empresarial',
  'Visão consolidada de todo o teu património',
];

const features = [
  {
    icon: 'upload_file',
    title: 'Importação multi-corretora',
    description: 'DEGIRO, Interactive Brokers, Trading 212, Lightyear, via CSV, screenshot ou entrada manual.',
  },
  {
    icon: 'dashboard',
    title: 'Dashboard completo',
    description: 'Valor total, alocação por corretora, exposição por país, setor e moeda num único sítio.',
  },
  {
    icon: 'insights',
    title: 'Rentabilidade e evolução',
    description: 'TWR, YTD, drawdown e gráficos de evolução do teu património em valor absoluto (€) e percentual (%).',
  },
  {
    icon: 'corporate_fare',
    title: 'Pessoal e empresarial',
    description: 'Alterna entre as tuas contas pessoais e de empresa com um único clique intuitivo.',
  },
  {
    icon: 'currency_exchange',
    title: 'Conversão cambial',
    description: 'Atualização automática de posições em USD para EUR via taxas oficiais do BCE.',
  },
  {
    icon: 'database',
    title: 'Enriquecimento de ETFs',
    description: 'Exposição por país e setor dos teus ETFs, atualizada automaticamente via JustETF.',
  },
  {
    icon: 'auto_awesome',
    title: 'Raio-X do Portfólio',
    description: 'Análise com IA: score de diversificação, risco de concentração, sobreposição de ETFs e pontos fortes e fracos.',
  },
  {
    icon: 'encrypted',
    title: 'Seguro e privado',
    description: 'Os teus dados ficam protegidos. Não pedimos credenciais de acesso às tuas corretoras e nunca vendemos dados.',
  },
];
