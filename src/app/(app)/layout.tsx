import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { HeaderAuth } from '@/components/header-auth';
import { AppNav } from '@/components/app-nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/entrar');
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm">
        {/* Main header row */}
        <div className="flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16 w-full max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4 sm:gap-8">
            <a className="text-base sm:text-xl font-bold tracking-tighter text-black whitespace-nowrap" href="/">
              Património Financeiro
            </a>
            <div className="hidden md:block">
              <AppNav />
            </div>
          </div>
          <HeaderAuth />
        </div>
        {/* Mobile nav — scrollable row below header */}
        <div className="md:hidden overflow-x-auto border-t border-slate-100">
          <div className="px-4">
            <AppNav />
          </div>
        </div>
      </nav>
      <main className="flex-grow pt-[7.5rem] sm:pt-24 pb-12 px-4 sm:px-6 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}
