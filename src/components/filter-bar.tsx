'use client';

import { Button } from '@/components/ui/button';

interface FilterBarProps {
  brokers: string[];
  assetClasses: string[];
  countries: string[];
  sectors: string[];
  currencies: string[];
  selectedBroker: string;
  selectedAssetClass: string;
  selectedCountry: string;
  selectedSector: string;
  selectedCurrency: string;
  onBrokerChange: (value: string) => void;
  onAssetClassChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onSectorChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onClear: () => void;
}

const ASSET_CLASS_LABELS: Record<string, string> = {
  EQUITY: 'Ações',
  ETF: 'ETF',
  BOND: 'Obrigações',
  FUND: 'Fundo',
  CASH: 'Liquidez',
  CRYPTO: 'Crypto',
  COMMODITY: 'Matérias-primas',
  OTHER: 'Outros',
};

function FilterSelect({
  label,
  options,
  value,
  onChange,
  labelMap,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  labelMap?: Record<string, string>;
}) {
  if (options.length === 0) return null;

  return (
    <div className="relative min-w-[160px]">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-100 border-none rounded-lg py-2.5 pl-3 pr-10 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-black/10 appearance-none cursor-pointer"
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {labelMap?.[opt] ?? opt}
          </option>
        ))}
      </select>
      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </div>
  );
}

export function FilterBar({
  brokers,
  assetClasses,
  countries,
  sectors,
  currencies,
  selectedBroker,
  selectedAssetClass,
  selectedCountry,
  selectedSector,
  selectedCurrency,
  onBrokerChange,
  onAssetClassChange,
  onCountryChange,
  onSectorChange,
  onCurrencyChange,
  onClear,
}: FilterBarProps) {
  const hasFilters =
    selectedBroker || selectedAssetClass || selectedCountry || selectedSector || selectedCurrency;

  return (
    <div className="flex flex-wrap items-end gap-4">
      <FilterSelect
        label="Corretora/banco"
        options={brokers}
        value={selectedBroker}
        onChange={onBrokerChange}
      />
      <FilterSelect
        label="Classe"
        options={assetClasses}
        value={selectedAssetClass}
        onChange={onAssetClassChange}
        labelMap={ASSET_CLASS_LABELS}
      />
      <FilterSelect
        label="País"
        options={countries}
        value={selectedCountry}
        onChange={onCountryChange}
      />
      <FilterSelect
        label="Setor"
        options={sectors}
        value={selectedSector}
        onChange={onSectorChange}
      />
      <FilterSelect
        label="Moeda"
        options={currencies}
        value={selectedCurrency}
        onChange={onCurrencyChange}
      />
      {hasFilters && (
        <button onClick={onClear} className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors underline">
          Limpar filtros
        </button>
      )}
    </div>
  );
}
