'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp, Trash2, Plus, ImageIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDateTime, formatCurrency } from '@/lib/utils';

const BROKERS = [
  { slug: 'bancoctt', label: 'Banco CTT' },
  { slug: 'coverflex', label: 'Coverflex' },
  { slug: 'degiro', label: 'DEGIRO' },
  { slug: 'etoro', label: 'eToro' },
  { slug: 'freedom24', label: 'Freedom24' },
  { slug: 'ibkr', label: 'Interactive Brokers' },
  { slug: 'lightyear', label: 'Lightyear' },
  { slug: 'novobanco', label: 'Novo Banco' },
  { slug: 'revolut', label: 'Revolut' },
  { slug: 'traderepublic', label: 'Trade Republic' },
  { slug: 'trading212', label: 'Trading 212' },
  { slug: 'xtb', label: 'XTB' },
];

const ASSET_CLASSES = [
  { value: 'EQUITY', label: 'Ação' },
  { value: 'ETF', label: 'ETF' },
  { value: 'BOND', label: 'Obrigação' },
  { value: 'FUND', label: 'Fundo' },
  { value: 'CASH', label: 'Liquidez' },
  { value: 'CRYPTO', label: 'Cripto' },
  { value: 'COMMODITY', label: 'Commodity' },
];

interface PreviewPosition {
  name: string;
  ticker: string;
  isin: string;
  quantity: number;
  price: number;
  marketValue: number;
  currency: string;
}

const IMAGE_BROKER_MAP: Record<string, string> = {
  'banco ctt': 'bancoctt', 'bancoctt': 'bancoctt',
  'lightyear': 'lightyear', 'degiro': 'degiro',
  'interactive brokers': 'ibkr', 'ibkr': 'ibkr',
  'trading 212': 'trading212', 'trading212': 'trading212',
  'revolut': 'revolut', 'freedom24': 'freedom24', 'freedom 24': 'freedom24',
  'etoro': 'etoro', 'novo banco': 'novobanco', 'novobanco': 'novobanco',
  'investing.com': 'investing', 'investing': 'investing',
};

function ImageImportActions({ brokerName, imageManualBroker, setImageManualBroker, imageAccountType, setImageAccountType, imageImporting, onImport, onCancel }: {
  brokerName: string | null | undefined;
  imageManualBroker: string;
  setImageManualBroker: (v: string) => void;
  imageAccountType: 'personal' | 'business';
  setImageAccountType: (v: 'personal' | 'business') => void;
  imageImporting: boolean;
  onImport: () => void;
  onCancel: () => void;
}) {
  const isDetected = brokerName && IMAGE_BROKER_MAP[brokerName.toLowerCase()];
  const needsBrokerSelect = !isDetected;
  const resolvedBroker = isDetected ? IMAGE_BROKER_MAP[brokerName!.toLowerCase()] : imageManualBroker;
  const showAccountType = resolvedBroker && ['ibkr', 'lightyear'].includes(resolvedBroker);

  return (
    <div className="space-y-3">
      {needsBrokerSelect && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border bg-amber-50 border-amber-200">
          <span className="text-sm text-amber-800">Não foi possível identificar a corretora/banco. Seleciona:</span>
          <select
            value={imageManualBroker}
            onChange={(e) => setImageManualBroker(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Escolhe...</option>
            {BROKERS.map((b) => (
              <option key={b.slug} value={b.slug}>{b.label}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {showAccountType && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Tipo de conta:</span>
            <select
              value={imageAccountType}
              onChange={(e) => setImageAccountType(e.target.value as 'personal' | 'business')}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="personal">Pessoal</option>
              <option value="business">Empresarial</option>
            </select>
          </div>
        )}
        <Button onClick={onImport} disabled={imageImporting || (needsBrokerSelect && !imageManualBroker)}>
          {imageImporting ? 'A importar...' : 'Importar posições'}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

interface PreviewResult {
  positions: PreviewPosition[];
  errors: string[];
  warnings: string[];
}

interface ImportBatchRecord {
  id: string;
  importedAt: string;
  fileName: string;
  rowsImported: number | null;
  rowsFailed: number | null;
  status: string;
  broker: { name: string; slug: string };
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [detectedBroker, setDetectedBroker] = useState<string | null>(null);
  const [selectedBroker, setSelectedBroker] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('Principal');
  const [detecting, setDetecting] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errorsExpanded, setErrorsExpanded] = useState(false);
  const [history, setHistory] = useState<ImportBatchRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Manual entry state
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: '',
    ticker: '',
    isin: '',
    quantity: '',
    price: '',
    marketValue: '',
    currency: 'EUR',
    assetClass: 'EQUITY',
    brokerSlug: 'degiro',
  });
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualResult, setManualResult] = useState<{ success: boolean; message: string } | null>(null);

  // Image import state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [imageResult, setImageResult] = useState<{
    brokerName?: string;
    totalValue?: number;
    positions: Array<{
      name: string; ticker?: string; isin?: string;
      quantity: number; price?: number; marketValue: number;
      currency: string; assetClass: string;
    }>;
    error?: string;
    morningstarResult?: string;
  } | null>(null);
  const [imageImporting, setImageImporting] = useState(false);
  const [imageImportResult, setImageImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [imageAccountType, setImageAccountType] = useState<'personal' | 'business'>('personal');
  const [imageManualBroker, setImageManualBroker] = useState('');

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/import');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      // silently fail
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return;

    setFile(f);
    setPreview(null);
    setImportResult(null);
    setDetectedBroker(null);
    setSelectedBroker('');
    setAccountName('Principal');

    const text = await f.text();
    setFileContent(text);

    // Auto-detect broker
    setDetecting(true);
    try {
      const res = await fetch('/api/import/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.brokerSlug) {
          setDetectedBroker(data.brokerSlug);
          setSelectedBroker(data.brokerSlug);
          setAccountName(['ibkr', 'lightyear'].includes(data.brokerSlug) ? 'Pessoal' : 'Principal');
        }
      }
    } catch {
      // detection failed, user can select manually
    } finally {
      setDetecting(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  });

  const handlePreview = async () => {
    if (!fileContent || !selectedBroker) return;
    setPreviewing(true);
    setPreview(null);
    try {
      const res = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fileContent, brokerSlug: selectedBroker }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreview(data);
      }
    } catch {
      setPreview({ positions: [], errors: ['Erro ao processar ficheiro'], warnings: [] });
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!fileContent || !selectedBroker) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fileContent, brokerSlug: selectedBroker, fileName: file?.name, accountName }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult({
          success: true,
          message: `Importação concluída: ${data.imported} posições importadas${data.failed > 0 ? `, ${data.failed} falharam` : ''}.`,
        });
        fetchHistory();
      } else {
        setImportResult({ success: false, message: data.error || 'Erro na importação' });
      }
    } catch {
      setImportResult({ success: false, message: 'Erro de rede ao importar' });
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteBatch = async (id: string, fileName: string) => {
    if (!window.confirm(`Tem a certeza que quer apagar a importação "${fileName}" e todas as posições associadas?`)) return;
    try {
      const res = await fetch(`/api/import/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchHistory();
      }
    } catch {
      // silently fail
    }
  };

  const handleManualSubmit = async () => {
    const isCash = manualForm.assetClass === 'CASH';
    if (isCash) {
      if (!manualForm.marketValue || !manualForm.brokerSlug) return;
    } else {
      if (!manualForm.name || !manualForm.marketValue || !manualForm.brokerSlug) return;
    }
    setManualSubmitting(true);
    setManualResult(null);
    try {
      const res = await fetch('/api/holdings/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: isCash ? `Cash ${BROKERS.find(b => b.slug === manualForm.brokerSlug)?.label || manualForm.brokerSlug}` : manualForm.name,
          ticker: isCash ? undefined : (manualForm.ticker || undefined),
          isin: isCash ? undefined : (manualForm.isin || undefined),
          quantity: isCash ? 1 : (manualForm.quantity ? parseFloat(manualForm.quantity) : 1),
          price: isCash ? parseFloat(manualForm.marketValue) : (manualForm.price ? parseFloat(manualForm.price) : undefined),
          marketValue: manualForm.marketValue ? parseFloat(manualForm.marketValue) : undefined,
          currency: manualForm.currency,
          assetClass: manualForm.assetClass,
          brokerSlug: manualForm.brokerSlug,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setManualResult({ success: true, message: `Posição "${manualForm.name}" adicionada com sucesso.` });
        setManualForm({ name: '', ticker: '', isin: '', quantity: '', price: '', marketValue: '', currency: 'EUR', assetClass: 'EQUITY', brokerSlug: manualForm.brokerSlug });
        fetchHistory();
      } else {
        setManualResult({ success: false, message: data.error || 'Erro ao adicionar posição' });
      }
    } catch {
      setManualResult({ success: false, message: 'Erro de rede' });
    } finally {
      setManualSubmitting(false);
    }
  };

  const updateManualField = (field: string, value: string) => {
    setManualForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreviewUrl(URL.createObjectURL(f));
    setImageResult(null);
    setImageImportResult(null);
  };

  const handleImageProcess = async () => {
    if (!imageFile) return;
    setImageProcessing(true);
    setImageResult(null);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      const res = await fetch('/api/import/image', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) {
        setImageResult({ positions: [], error: data.error });
      } else if (data.type === 'morningstar_factors') {
        if (data.saved) {
          setImageResult({
            positions: [],
            error: undefined,
            morningstarResult: `Fatores do ${data.securityName || data.etfName} (${data.isin}) importados com sucesso! ${data.factorsCount} fatores guardados. Refresca o dashboard para ver os dados na tab "Fatores".`,
          });
        } else {
          setImageResult({ positions: [], error: data.error || 'Erro ao guardar fatores' });
        }
      } else {
        setImageResult(data);
      }
    } catch {
      setImageResult({ positions: [], error: 'Erro ao processar imagem' });
    } finally {
      setImageProcessing(false);
    }
  };

  const handleImageImport = async () => {
    if (!imageResult || imageResult.positions.length === 0) return;
    setImageImporting(true);
    setImageImportResult(null);
    let imported = 0;
    let failed = 0;
    // Determine broker slug from detected name or manual selection
    const autoSlug = imageResult.brokerName
      ? IMAGE_BROKER_MAP[imageResult.brokerName.toLowerCase()] || null
      : null;
    const detectedSlug = autoSlug || imageManualBroker || 'other';

    for (const pos of imageResult.positions) {
      try {
        const res = await fetch('/api/holdings/manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: pos.name,
            ticker: pos.ticker || undefined,
            isin: pos.isin || undefined,
            quantity: pos.quantity,
            price: pos.price || undefined,
            marketValue: pos.marketValue,
            currency: pos.currency,
            assetClass: pos.assetClass,
            brokerSlug: detectedSlug,
            accountName: imageAccountType === 'business' ? 'Empresarial' : undefined,
          }),
        });
        if (res.ok) imported++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setImageImportResult({
      success: failed === 0,
      message: `${imported} posição(ões) importada(s)${failed > 0 ? `, ${failed} falharam` : ''}.`,
    });
    setImageImporting(false);
    fetchHistory();
  };

  const resetImage = () => {
    setImageFile(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    setImageResult(null);
    setImageImportResult(null);
  };

  const resetUpload = () => {
    setFile(null);
    setFileContent('');
    setDetectedBroker(null);
    setSelectedBroker('');
    setAccountName('Principal');
    setPreview(null);
    setImportResult(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Concluído</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Falhado</Badge>;
      case 'PENDING':
      case 'PROCESSING':
        return <Badge variant="warning">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalIssues = (preview?.errors.length ?? 0) + (preview?.warnings.length ?? 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importar</h1>
        <p className="text-muted-foreground">Carrega ficheiros CSV das tuas corretoras para importar posições.</p>
      </div>

      {/* Upload Area + Image Import side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Carregar ficheiro</CardTitle>
          <CardDescription>Arrasta um ficheiro CSV ou clica para selecionar</CardDescription>
        </CardHeader>
        <CardContent>
          {!file ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              {isDragActive ? (
                <p className="text-lg font-medium">Largue o ficheiro aqui...</p>
              ) : (
                <>
                  <p className="text-lg font-medium">Arrasta o ficheiro CSV para aqui</p>
                  <p className="text-sm text-muted-foreground mt-1">ou clica para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-3">
                    Formatos suportados: DEGIRO, Interactive Brokers, Lightyear, Trading 212
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* File info */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={resetUpload}>
                  Remover
                </Button>
              </div>

              {/* Broker detection / selection */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Corretora:</label>
                {detecting ? (
                  <span className="text-sm text-muted-foreground">A detetar...</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedBroker}
                      onChange={(e) => {
                        setSelectedBroker(e.target.value);
                        setAccountName(['ibkr', 'lightyear'].includes(e.target.value) ? 'Pessoal' : 'Principal');
                      }}
                      className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Selecionar corretora...</option>
                      {BROKERS.map((b) => (
                        <option key={b.slug} value={b.slug}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                    {detectedBroker && (
                      <Badge variant="info">Detetado automaticamente</Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Account name (for IBKR/Lightyear: personal vs business) */}
              {(selectedBroker === 'ibkr' || selectedBroker === 'lightyear') && (
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium">Conta:</label>
                  <select
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="Pessoal">Pessoal</option>
                    <option value="Empresarial">Empresarial</option>
                  </select>
                </div>
              )}

              {/* Preview button */}
              {!preview && !importResult && (
                <Button
                  onClick={handlePreview}
                  disabled={!selectedBroker || previewing}
                >
                  {previewing ? 'A processar...' : 'Pre-visualizar'}
                </Button>
              )}

              {/* Preview results */}
              {preview && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">
                      {preview.positions.length} posições encontradas
                    </span>
                    {totalIssues > 0 && (
                      <button
                        onClick={() => setErrorsExpanded(!errorsExpanded)}
                        className="flex items-center gap-1 text-sm text-yellow-600 hover:text-yellow-700"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        {preview.errors.length} erro(s), {preview.warnings.length} aviso(s)
                        {errorsExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Errors/warnings detail */}
                  {errorsExpanded && totalIssues > 0 && (
                    <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                      {preview.errors.map((msg, i) => (
                        <div key={`err-${i}`} className="flex items-start gap-2 text-sm text-red-600">
                          <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{msg}</span>
                        </div>
                      ))}
                      {preview.warnings.map((msg, i) => (
                        <div key={`warn-${i}`} className="flex items-start gap-2 text-sm text-yellow-600">
                          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{msg}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Preview table */}
                  {preview.positions.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Ticker</TableHead>
                          <TableHead>ISIN</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="text-right">Preço</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Moeda</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.positions.map((p, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell>{p.ticker}</TableCell>
                            <TableCell className="font-mono text-xs">{p.isin}</TableCell>
                            <TableCell className="text-right">{p.quantity}</TableCell>
                            <TableCell className="text-right">
                              {p.price != null ? formatCurrency(p.price, p.currency) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {p.marketValue != null ? formatCurrency(p.marketValue, p.currency) : '-'}
                            </TableCell>
                            <TableCell>{p.currency}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  {/* Import button */}
                  {!importResult && (
                    <div className="flex gap-2">
                      <Button onClick={handleImport} disabled={importing}>
                        {importing ? 'A importar...' : 'Importar'}
                      </Button>
                      <Button variant="outline" onClick={resetUpload}>
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Import result */}
              {importResult && (
                <div
                  className={`flex items-center gap-3 p-4 rounded-lg border ${
                    importResult.success
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0" />
                  )}
                  <span className="font-medium">{importResult.message}</span>
                  <Button variant="outline" size="sm" className="ml-auto" onClick={resetUpload}>
                    Nova importação
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Import */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Importar por imagem</CardTitle>
          <CardDescription>Carrega uma captura de ecrã do teu portfólio para extrair posições automaticamente</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          {!imageFile ? (
            <div className="flex flex-col items-center gap-4 flex-grow">
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg p-8 w-full h-full min-h-[200px] cursor-pointer transition-colors border-muted-foreground/25 hover:border-primary/50"
              >
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium">Clica para selecionar uma imagem</p>
                <p className="text-xs text-muted-foreground">PNG, JPEG, WEBP ou GIF</p>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image preview */}
              <div className="flex items-start gap-4">
                {imagePreviewUrl && (
                  <img
                    src={imagePreviewUrl}
                    alt="Preview"
                    className="max-h-64 rounded-lg border object-contain"
                  />
                )}
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">{imageFile.name}</p>
                  <Button variant="ghost" size="sm" onClick={resetImage}>
                    Remover
                  </Button>
                </div>
              </div>

              {/* Process button */}
              {!imageResult && (
                <Button onClick={handleImageProcess} disabled={imageProcessing}>
                  {imageProcessing ? 'A processar com IA...' : 'Extrair posições'}
                </Button>
              )}

              {/* Error from OCR */}
              {imageResult?.error && (
                <div className="flex items-center gap-3 p-4 rounded-lg border bg-red-50 border-red-200 text-red-800">
                  <XCircle className="h-5 w-5 shrink-0" />
                  <span className="text-sm">{imageResult.error}</span>
                  <Button variant="outline" size="sm" className="ml-auto" onClick={resetImage}>
                    Tentar novamente
                  </Button>
                </div>
              )}

              {/* Morningstar factor success */}
              {imageResult?.morningstarResult && (
                <div className="flex items-center gap-3 p-4 rounded-lg border bg-green-50 border-green-200 text-green-800">
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  <span className="text-sm">{imageResult.morningstarResult}</span>
                  <Button variant="outline" size="sm" className="ml-auto" onClick={resetImage}>
                    Importar outro
                  </Button>
                </div>
              )}

              {/* Extracted positions */}
              {imageResult && !imageResult.error && imageResult.positions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">
                      {imageResult.positions.length} posição(ões) extraída(s)
                      {imageResult.brokerName && ` — ${imageResult.brokerName}`}
                      {imageResult.totalValue != null && ` — Total: ${formatCurrency(imageResult.totalValue, 'EUR')}`}
                    </span>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Ticker</TableHead>
                        <TableHead>Classe</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Moeda</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {imageResult.positions.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>{p.ticker || '-'}</TableCell>
                          <TableCell>{p.assetClass}</TableCell>
                          <TableCell className="text-right">{p.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(p.marketValue, p.currency)}
                          </TableCell>
                          <TableCell>{p.currency}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Broker selector + Account type + Import button */}
                  {!imageImportResult && (
                    <ImageImportActions
                      brokerName={imageResult.brokerName}
                      imageManualBroker={imageManualBroker}
                      setImageManualBroker={setImageManualBroker}
                      imageAccountType={imageAccountType}
                      setImageAccountType={setImageAccountType}
                      imageImporting={imageImporting}
                      onImport={handleImageImport}
                      onCancel={resetImage}
                    />
                  )}
                </div>
              )}

              {/* Import result */}
              {imageImportResult && (
                <div
                  className={`flex items-center gap-3 p-4 rounded-lg border ${
                    imageImportResult.success
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {imageImportResult.success ? (
                    <CheckCircle className="h-5 w-5 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0" />
                  )}
                  <span className="font-medium">{imageImportResult.message}</span>
                  <Button variant="outline" size="sm" className="ml-auto" onClick={resetImage}>
                    Nova imagem
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Manual Entry */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Entrada manual</CardTitle>
              <CardDescription>Adiciona posições manualmente quando o CSV não funciona</CardDescription>
            </div>
            <Button
              variant={manualOpen ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => { setManualOpen(!manualOpen); setManualResult(null); }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {manualOpen ? 'Fechar' : 'Adicionar posição'}
            </Button>
          </div>
        </CardHeader>
        {manualOpen && (
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Name */}
                <div className="md:col-span-2">
                  <label className="text-sm font-medium block mb-1">Nome *</label>
                  <input
                    type="text"
                    placeholder="Ex: iShares Core MSCI World UCITS ETF"
                    value={manualForm.name}
                    onChange={(e) => updateManualField('name', e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                {/* Broker */}
                <div>
                  <label className="text-sm font-medium block mb-1">Corretora/Banco *</label>
                  <select
                    value={manualForm.brokerSlug}
                    onChange={(e) => updateManualField('brokerSlug', e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {BROKERS.map((b) => (
                      <option key={b.slug} value={b.slug}>{b.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Class + Currency row (always visible) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Asset Class */}
                <div>
                  <label className="text-sm font-medium block mb-1">Classe *</label>
                  <select
                    value={manualForm.assetClass}
                    onChange={(e) => updateManualField('assetClass', e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {ASSET_CLASSES.map((ac) => (
                      <option key={ac.value} value={ac.value}>{ac.label}</option>
                    ))}
                  </select>
                </div>
                {/* Currency */}
                <div>
                  <label className="text-sm font-medium block mb-1">Moeda</label>
                  <select
                    value={manualForm.currency}
                    onChange={(e) => updateManualField('currency', e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="CHF">CHF</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
                {/* Market Value — shown for CASH here, for others below */}
                {manualForm.assetClass === 'CASH' && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium block mb-1">Valor (saldo) *</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ex: 2756.48"
                      value={manualForm.marketValue}
                      onChange={(e) => updateManualField('marketValue', e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                )}
              </div>

              {/* Non-cash fields */}
              {manualForm.assetClass !== 'CASH' && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Ticker */}
                    <div>
                      <label className="text-sm font-medium block mb-1">Ticker</label>
                      <input
                        type="text"
                        placeholder="Ex: IWDA"
                        value={manualForm.ticker}
                        onChange={(e) => updateManualField('ticker', e.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                    {/* ISIN */}
                    <div>
                      <label className="text-sm font-medium block mb-1">ISIN</label>
                      <input
                        type="text"
                        placeholder="Ex: IE00B4L5Y983"
                        value={manualForm.isin}
                        onChange={(e) => updateManualField('isin', e.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                    {/* Market Value — primary */}
                    <div>
                      <label className="text-sm font-medium block mb-1">Valor da posição *</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Ex: 2473.50"
                        value={manualForm.marketValue}
                        onChange={(e) => updateManualField('marketValue', e.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                  {/* Quantity + Price — secondary/optional */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground block mb-1">Quantidade <span className="text-xs">(opcional)</span></label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Ex: 30"
                        value={manualForm.quantity}
                        onChange={(e) => updateManualField('quantity', e.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground block mb-1">Preço unitário <span className="text-xs">(opcional)</span></label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Ex: 82.45"
                        value={manualForm.price}
                        onChange={(e) => updateManualField('price', e.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleManualSubmit}
                  disabled={manualSubmitting || (manualForm.assetClass === 'CASH' ? !manualForm.marketValue : (!manualForm.name || !manualForm.marketValue))}
                >
                  {manualSubmitting ? 'A guardar...' : 'Guardar posição'}
                </Button>
                {manualResult && (
                  <div className={`flex items-center gap-2 text-sm ${manualResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {manualResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {manualResult.message}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de importações</CardTitle>
          <CardDescription>Lista de todas as importações realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <p className="text-sm text-muted-foreground py-4">A carregar...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Nenhuma importação encontrada. Carrega um ficheiro CSV acima para começar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Corretora</TableHead>
                  <TableHead>Ficheiro</TableHead>
                  <TableHead className="text-right">Importadas</TableHead>
                  <TableHead className="text-right">Falhadas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{formatDateTime(record.importedAt)}</TableCell>
                    <TableCell>{record.broker?.name ?? '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{record.fileName}</TableCell>
                    <TableCell className="text-right">{record.rowsImported ?? 0}</TableCell>
                    <TableCell className="text-right">{record.rowsFailed ?? 0}</TableCell>
                    <TableCell>{statusBadge(record.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteBatch(record.id, record.fileName)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
