export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-black mb-6 leading-tight font-[family-name:var(--font-manrope)]">
            O teu património financeiro,
            <br />
            <span className="text-slate-500">numa única vista.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 mb-10 leading-relaxed">
            Agrega posições de todas as tuas corretoras e bancos num só dashboard.
            Visualiza alocação, rentabilidade e evolução, sem partilhar dados com terceiros.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-20">
            <a
              href="/dashboard"
              className="px-8 py-4 bg-black text-white font-bold rounded-lg shadow-lg hover:bg-opacity-90 active:scale-95 transition-all duration-200 inline-flex items-center justify-center gap-2"
            >
              Começar agora
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </a>
            <a
              href="/demo"
              className="px-8 py-4 bg-slate-200 text-black font-bold rounded-lg active:scale-95 transition-all duration-200 inline-flex items-center justify-center"
            >
              Experimentar demo
            </a>
          </div>

          {/* Dashboard Preview — screenshot */}
          <div className="relative max-w-6xl mx-auto">
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
            Sem cartão de crédito necessário. Configuração em 2 minutos.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-6 text-center text-sm text-slate-500">
        <p>
          Criado por Franklin Carneiro da Silva, cofundador do{' '}
          <a
            href="https://literaciafinanceira.pt"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-black hover:underline"
          >
            LiteraciaFinanceira.pt
          </a>
        </p>
      </footer>
    </>
  );
}

const features = [
  {
    icon: 'upload_file',
    title: 'Importação multi-corretora',
    description: 'DEGIRO, Interactive Brokers, Trading 212, Lightyear, via CSV ou screenshot inteligente.',
  },
  {
    icon: 'dashboard',
    title: 'Dashboard completo',
    description: 'Valor total, alocação por corretora, exposição por país, setor e moeda num relance.',
  },
  {
    icon: 'insights',
    title: 'Rentabilidade real',
    description: 'TWR, retorno anualizado, YTD, mensal, trimestral e métricas de risco máximo drawdown.',
  },
  {
    icon: 'show_chart',
    title: 'Evolução do património',
    description: 'Gráficos dinâmicos em valor absoluto (€) e percentual (%) para análise histórica.',
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
    description: 'Dados integrados via JustETF para análise profunda de composição e rácios.',
  },
  {
    icon: 'encrypted',
    title: 'Seguro e privado',
    description: 'Encriptação de ponta a ponta. Não guardamos credenciais e nunca vendemos dados.',
  },
];
