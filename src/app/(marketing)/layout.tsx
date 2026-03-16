import { HeaderAuth } from '@/components/header-auth';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto w-full max-w-7xl px-6 flex h-14 items-center justify-between">
          <a className="flex items-center space-x-2" href="/">
            <span className="font-bold text-xl">Património financeiro</span>
          </a>
          <HeaderAuth />
        </div>
      </header>
      {children}
    </div>
  );
}
