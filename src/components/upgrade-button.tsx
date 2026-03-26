'use client';

import { useState } from 'react';

export function UpgradeButton() {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.status === 401) {
        window.location.href = '/registar?upgrade=true';
        return;
      }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      className="inline-block w-full px-10 py-4 bg-emerald-400 text-black font-black rounded-lg shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 text-base text-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
    >
      {loading ? 'A redirecionar...' : 'Começar com Plus →'}
    </button>
  );
}
