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
          {/* Dashboard Preview — screenshot */}
          <div className="relative max-w-6xl mx-auto mb-12">
            <div className="rounded-2xl shadow-2xl border border-slate-200/50 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/dashboard-preview.png"
                alt="Dashboard do Património Financeiro mostrando alocação por corretora, tipo de ativo, evolução do património e métricas de rentabilidade"
                className="w-full h-auto"
              />
            </div>
          </div>

          {/* Começa aqui — upload CTA */}
          <a
            href="/import"
            className="group relative flex flex-col items-center gap-4 border-2 border-dashed border-slate-300 hover:border-black rounded-2xl p-8 md:p-12 cursor-pointer transition-all duration-300 hover:shadow-lg mx-auto max-w-xl mb-6"
          >
            <div className="w-14 h-14 bg-slate-100 group-hover:bg-black rounded-full flex items-center justify-center transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 group-hover:text-white transition-colors duration-300"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            </div>
            <div>
              <p className="text-lg font-bold text-black">
                Começa aqui — carrega um screenshot ou CSV
              </p>
              <p className="text-sm text-slate-400 mt-1">
                DEGIRO, Interactive Brokers, Trading 212, Lightyear, bancos e mais
              </p>
            </div>
            <span className="absolute -bottom-4 bg-black text-white text-xs font-bold px-4 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Leva menos de 1 minuto →
            </span>
          </a>
          <a
            href="/demo"
            className="inline-block text-sm text-slate-400 hover:text-black transition-colors mb-6"
          >
            Ou experimenta a demo →
          </a>
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

const features = [
  {
    icon: 'upload_file',
    title: 'Importação multi-corretora',
    description: 'DEGIRO, Interactive Brokers, Trading 212, Lightyear, via CSV, screenshot ou entrada manual.',
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
