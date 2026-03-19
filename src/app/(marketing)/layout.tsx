import { HeaderAuth } from '@/components/header-auth';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm h-20">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-6 h-full">
          <a className="text-xl font-bold tracking-tighter text-black" href="/">
            Património Financeiro
          </a>
          <HeaderAuth />
        </div>
      </nav>
      <main className="pt-20">
        {children}
      </main>
    </div>
  );
}
