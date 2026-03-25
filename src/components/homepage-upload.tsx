'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function HomepageUpload() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/preview-extract', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Erro ao processar imagem');
        setProcessing(false);
        return;
      }

      // Store in sessionStorage and redirect to preview
      sessionStorage.setItem('preview-data', JSON.stringify(data));
      router.push('/preview');
    } catch {
      setError('Erro de rede. Tenta novamente.');
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={processing}
        className="group relative flex flex-col items-center gap-4 border-2 border-dashed border-slate-300 hover:border-black rounded-2xl p-8 md:p-10 cursor-pointer transition-all duration-300 hover:shadow-lg w-full disabled:opacity-60 disabled:cursor-wait"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="w-14 h-14 bg-slate-100 group-hover:bg-black rounded-full flex items-center justify-center transition-colors duration-300">
          {processing ? (
            <svg className="w-6 h-6 text-slate-500 group-hover:text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 group-hover:text-white transition-colors duration-300">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
            </svg>
          )}
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-black">
            {processing ? 'A analisar o teu portfolio...' : 'Começa aqui'}
          </p>
          <p className="text-sm text-slate-500 mt-2">
            {processing
              ? 'Estamos a extrair as tuas posições com IA'
              : 'Carrega um screenshot do teu portfolio'}
          </p>
          <p className="text-xs text-slate-400 mt-3">
            DEGIRO, Interactive Brokers, Trading 212, Lightyear, bancos e mais
          </p>
        </div>
        {!processing && (
          <span className="absolute -bottom-4 bg-black text-white text-xs font-bold px-4 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Leva menos de 1 minuto →
          </span>
        )}
      </button>

      {error && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      <a
        href="/demo"
        className="inline-block text-sm text-slate-400 hover:text-black transition-colors mt-8"
      >
        Ou experimenta a demo →
      </a>
    </div>
  );
}
