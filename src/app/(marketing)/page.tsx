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

          {/* Dashboard Preview Mockup */}
          <div className="relative max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-8 border border-slate-200/50 overflow-hidden">
              <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2.5"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Património Total</p>
                    <p className="text-2xl font-black text-black">€626.227,74</p>
                  </div>
                </div>
                <div className="hidden md:flex gap-4">
                  <div className="px-3 py-1 bg-emerald-100 rounded-full text-xs font-bold text-emerald-800 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>
                    +7.7% YTD
                  </div>
                  <div className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600">EUR/USD 1.15</div>
                </div>
              </div>

              {/* Charts Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 bg-slate-50 rounded-xl p-6 h-80 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-black font-[family-name:var(--font-manrope)]">Evolução do Património</h3>
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-600" />
                      <div className="w-2 h-2 rounded-full bg-slate-300" />
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-48 px-4">
                    <svg className="w-full h-full" viewBox="0 0 1000 200">
                      <defs>
                        <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#009668" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#009668" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,180 Q100,160 200,170 T400,140 T600,100 T800,60 T1000,40 L1000,200 L0,200 Z" fill="url(#chartGradient)" />
                      <path d="M0,180 Q100,160 200,170 T400,140 T600,100 T800,60 T1000,40" fill="none" stroke="#009668" strokeLinecap="round" strokeWidth="4" />
                    </svg>
                  </div>
                  <div className="grid grid-cols-6 mt-32 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    <span>Jan</span><span>Mar</span><span>Mai</span><span>Jul</span><span>Set</span><span>Nov</span>
                  </div>
                </div>

                <div className="md:col-span-4 bg-slate-50 rounded-xl p-6 h-80 flex flex-col items-center justify-center">
                  <h3 className="font-bold text-black mb-6 w-full text-left font-[family-name:var(--font-manrope)]">Alocação por tipo de ativo</h3>
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" fill="none" r="16" stroke="#eceef0" strokeWidth="4" />
                      <circle cx="18" cy="18" fill="none" r="16" stroke="#009668" strokeDasharray="91, 100" strokeWidth="4" />
                      <circle cx="18" cy="18" fill="none" r="16" stroke="#10b981" strokeDasharray="5, 100" strokeDashoffset="-91" strokeWidth="4" />
                      <circle cx="18" cy="18" fill="none" r="16" stroke="#34d399" strokeDasharray="3, 100" strokeDashoffset="-96" strokeWidth="4" />
                      <circle cx="18" cy="18" fill="none" r="16" stroke="#6ee7b7" strokeDasharray="1, 100" strokeDashoffset="-99" strokeWidth="4" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold uppercase text-slate-500">ETFs</span>
                      <span className="text-xl font-black">91%</span>
                    </div>
                  </div>
                  <div className="mt-6 w-full space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-600" /> ETFs</span>
                      <span className="font-bold">91.3%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Liquidez</span>
                      <span className="font-bold">4.6%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Ações</span>
                      <span className="font-bold">2.6%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-300" /> Matérias-primas</span>
                      <span className="font-bold">1.3%</span>
                    </div>
                  </div>
                </div>
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

      {/* Credits Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-8 flex flex-col items-center justify-center border-t border-slate-100 pt-12">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Franklin Carneiro da Silva"
              src="/franklin-silva.jpg"
              className="w-12 h-12 rounded-full object-cover border-2 border-black"
            />
            <div className="text-left">
              <p className="text-sm font-bold text-black leading-tight">
                Criado por Franklin Carneiro da Silva
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Cofundador do{' '}
                <a
                  href="https://literaciafinanceira.pt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-black hover:underline"
                >
                  LiteraciaFinanceira.pt
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-12 bg-slate-50">
        <div className="flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto px-8 gap-8">
          <div className="text-lg font-black text-black">
            Património Financeiro
          </div>
          <div className="text-[10px] font-medium text-slate-400 text-center md:text-right max-w-xs">
            © PatrimonioFinanceiro.pt - Por Franklin Carneiro da Silva &amp; LiteraciaFinanceira.pt
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
