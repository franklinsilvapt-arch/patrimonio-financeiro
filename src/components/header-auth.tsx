'use client';

import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function HeaderAuth() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />;
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {session.user.name || session.user.email}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          Sair
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <a href="/entrar">Entrar</a>
      </Button>
      <Button size="sm" asChild>
        <a href="/registar">Registar</a>
      </Button>
    </div>
  );
}
