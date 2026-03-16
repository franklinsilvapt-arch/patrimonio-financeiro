import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Património financeiro',
  description: 'Agregador de património financeiro multi-corretora',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className={inter.className}>
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="mx-auto w-full max-w-7xl px-6 flex h-14 items-center">
                <div className="mr-4 flex">
                  <a className="mr-6 flex items-center space-x-2" href="/">
                    <span className="font-bold text-xl">Património financeiro</span>
                  </a>
                  <nav className="flex items-center space-x-6 text-sm font-medium">
                    <a href="/" className="transition-colors hover:text-foreground/80 text-foreground">
                      Dashboard
                    </a>
                    <a href="/history" className="transition-colors hover:text-foreground/80 text-muted-foreground">
                      Evolução
                    </a>
                    <a href="/holdings" className="transition-colors hover:text-foreground/80 text-muted-foreground">
                      Posições
                    </a>
                    <a href="/import" className="transition-colors hover:text-foreground/80 text-muted-foreground">
                      Importar
                    </a>
                  </nav>
                </div>
              </div>
            </header>
            <main className="mx-auto w-full max-w-7xl px-6 py-6">{children}</main>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
