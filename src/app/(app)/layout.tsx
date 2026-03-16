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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto w-full max-w-7xl px-6 flex h-14 items-center justify-between">
          <div className="flex items-center">
            <a className="mr-6 flex items-center space-x-2" href="/">
              <span className="font-bold text-xl">Património financeiro</span>
            </a>
            <AppNav />
          </div>
          <HeaderAuth />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-6 py-6">{children}</main>
    </div>
  );
}
