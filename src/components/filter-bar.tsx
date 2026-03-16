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

function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">Todos</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
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
        <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
