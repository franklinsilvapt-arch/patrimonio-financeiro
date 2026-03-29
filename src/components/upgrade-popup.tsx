'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const LIMIT_MESSAGES: Record<string, { title: string; description: string }> = {
  BROKER_LIMIT: {
    title: 'Limite de corretoras atingido',
    description: 'O plano gratuito suporta apenas 1 corretora ou banco. Com o Plus podes adicionar corretoras ilimitadas.',
  },
  IMAGE_LIMIT: {
    title: 'Limite de importações por imagem atingido',
    description: 'O plano gratuito permite 2 importações por imagem por mês. Com o Plus não tens limite.',
  },
  CSV_LIMIT: {
    title: 'Limite de importações CSV atingido',
    description: 'O plano gratuito permite 2 importações CSV por mês. Com o Plus não tens limite.',
  },
  MANUAL_LIMIT: {
    title: 'Limite de posições manuais atingido',
    description: 'O plano gratuito permite até 5 posições manuais. Com o Plus não tens limite.',
  },
};

interface UpgradePopupProps {
  limitType: string;
  onClose: () => void;
}

export function UpgradePopup({ limitType, onClose }: UpgradePopupProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const msg = LIMIT_MESSAGES[limitType] ?? {
    title: 'Limite atingido',
    description: 'Faz upgrade para o Plus para removeres as limitações do plano gratuito.',
  };

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 flex flex-col items-center text-center gap-5" onClick={(e) => e.stopPropagation()}>
        <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold">{msg.title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{msg.description}</p>
        <div className="flex flex-col gap-3 w-full mt-2">
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full bg-black text-white font-bold px-6 py-3 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50 text-sm"
          >
            {loading ? 'A redirecionar...' : 'Fazer upgrade para Plus — 1,99\u20AC/mês'}
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-slate-100 text-slate-600 font-medium px-6 py-3 rounded-lg hover:bg-slate-200 transition-colors text-sm"
          >
            Voltar ao dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
