import { Button } from '@/components/ui/button';

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Demo banner */}
      <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-center text-sm py-2 px-4">
        <span className="font-medium">Modo demonstração</span> — dados fictícios.{' '}
        <Button variant="link" size="sm" className="text-amber-800 underline p-0 h-auto" asChild>
          <a href="/dashboard">Criar conta</a>
        </Button>
      </div>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto w-full max-w-7xl px-6 flex h-14 items-center justify-between">
          <a className="flex items-center space-x-2" href="/">
            <span className="font-bold text-xl">Património financeiro</span>
          </a>
          <Button size="sm" asChild>
            <a href="/dashboard">Começar agora</a>
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-6 py-6">{children}</main>
    </div>
  );
}
