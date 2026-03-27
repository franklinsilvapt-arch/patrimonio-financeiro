'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function ContaPage() {
  const { data: session } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As passwords não coincidem' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Erro ao alterar password' });
        return;
      }

      setMessage({ type: 'success', text: 'Password alterada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setMessage({ type: 'error', text: 'Erro de ligação ao servidor' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">A minha conta</h1>
        <p className="text-muted-foreground">Gere as definições da tua conta</p>
      </div>

      {/* Profile info */}
      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Perfil</h2>
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-16">Nome:</span>
            <span className="text-sm font-medium">{session?.user?.name ?? '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-16">Email:</span>
            <span className="text-sm font-medium">{session?.user?.email ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Alterar password</h2>

        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <label htmlFor="currentPassword" className="text-sm font-medium">Password atual</label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-medium">Nova password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar nova password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          {message && (
            <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.text}
            </p>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? 'A alterar...' : 'Alterar password'}
          </Button>
        </form>
      </div>

      {/* Delete account */}
      <div className="rounded-lg border border-red-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-red-600">Apagar conta</h2>
        <p className="text-sm text-muted-foreground">
          Esta ação é irreversível. Todos os teus dados (posições, importações, snapshots) serão permanentemente apagados.
        </p>

        {!deleteConfirm ? (
          <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => setDeleteConfirm(true)}>
            Apagar a minha conta
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-red-600">Tens a certeza? Escreve &quot;apagar&quot; para confirmar.</p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Escreve 'apagar'"
                id="delete-confirm-input"
                className="flex h-10 w-48 rounded-md border border-red-300 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
              />
              <Button
                variant="destructive"
                disabled={deleting}
                onClick={async () => {
                  const input = document.getElementById('delete-confirm-input') as HTMLInputElement;
                  if (input?.value.toLowerCase() !== 'apagar') {
                    setMessage({ type: 'error', text: 'Escreve "apagar" para confirmar' });
                    return;
                  }
                  setDeleting(true);
                  try {
                    const res = await fetch('/api/account/delete', { method: 'POST' });
                    if (res.ok) {
                      await signOut({ callbackUrl: '/' });
                    } else {
                      const data = await res.json();
                      setMessage({ type: 'error', text: data.error ?? 'Erro ao apagar conta' });
                      setDeleting(false);
                    }
                  } catch {
                    setMessage({ type: 'error', text: 'Erro de ligação ao servidor' });
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? 'A apagar...' : 'Confirmar eliminação'}
              </Button>
              <Button variant="outline" onClick={() => setDeleteConfirm(false)} disabled={deleting}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
