import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { apiFetch } from '../../lib/api';
import { Upload, AlertCircle, CheckCircle2, FileSpreadsheet } from 'lucide-react';

interface CsvRowError {
  row: number;
  field: string;
  reason: string;
}

interface DryRunResult {
  dryRun: boolean;
  totalRows: number;
  validCount: number;
  errorCount: number;
  errors: CsvRowError[];
}

export interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export function CsvImportModal({ isOpen, onClose, onImportSuccess }: CsvImportModalProps) {
  const [csvContent, setCsvContent] = useState('');
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sampleCsv = [
    'name,email,phone,department,designation,joinDate,basicSalary',
    'Ali Ahmed,ali@company.com,+923001234567,Engineering,Software Engineer,2026-03-01,70000',
    'Fatima Noor,fatima@company.com,+923007654321,HR,HR Specialist,2026-03-01,65000',
  ].join('\n');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      setDryRunResult(null);
      setError(null);
    };
    reader.readAsText(file);
  };

  const handleDryRun = async () => {
    if (!csvContent.trim()) {
      setError('Please paste or upload CSV content');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<DryRunResult>('/employees/import?dryRun=true', {
        method: 'POST',
        body: JSON.stringify({ csvContent }),
      });
      setDryRunResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Dry run check failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    setImporting(true);
    setError(null);
    try {
      await apiFetch('/employees/import?dryRun=false', {
        method: 'POST',
        body: JSON.stringify({ csvContent }),
      });
      onImportSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const loadSample = () => {
    setCsvContent(sampleCsv);
    setDryRunResult(null);
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Employee CSV Import"
      description="Upload a CSV spreadsheet. All rows are validated in dry-run mode before saving."
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-control text-xs text-danger font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-control text-xs font-semibold text-navy bg-surface hover:bg-bg cursor-pointer transition-colors shadow-sm">
            <Upload className="w-3.5 h-3.5 text-primary" />
            <span>Choose CSV File</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={loadSample}
            className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Insert Template Sample</span>
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-navy/80 mb-1">
            CSV Plain Text / Content
          </label>
          <textarea
            rows={5}
            value={csvContent}
            onChange={(e) => {
              setCsvContent(e.target.value);
              setDryRunResult(null);
            }}
            placeholder={sampleCsv}
            className="w-full rounded-control border border-border bg-surface p-2.5 font-mono text-xs text-navy placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Action Button: Dry Run */}
        <div className="flex justify-between items-center pt-1 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDryRun}
            isLoading={isLoading}
            disabled={!csvContent.trim()}
          >
            Verify CSV (Dry Run)
          </Button>

          {dryRunResult && dryRunResult.errorCount === 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmImport}
              isLoading={importing}
              className="flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Confirm & Import ({dryRunResult.validCount} Employees)</span>
            </Button>
          )}
        </div>

        {/* Dry Run Feedback Table */}
        {dryRunResult && (
          <div className="pt-2 border-t border-border space-y-3">
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 className="w-4 h-4" />
                {dryRunResult.validCount} Ready to Import
              </span>
              {dryRunResult.errorCount > 0 && (
                <span className="flex items-center gap-1 text-danger">
                  <AlertCircle className="w-4 h-4" />
                  {dryRunResult.errorCount} Row Errors Found
                </span>
              )}
            </div>

            {dryRunResult.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-control border border-red-200 bg-red-50/50 p-2 text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-red-200 text-danger font-bold">
                      <th className="p-1">Row</th>
                      <th className="p-1">Field</th>
                      <th className="p-1">Validation Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dryRunResult.errors.map((err, idx) => (
                      <tr key={idx} className="border-b border-red-100 text-red-900">
                        <td className="p-1 font-mono font-bold">{err.row}</td>
                        <td className="p-1 font-semibold capitalize">{err.field}</td>
                        <td className="p-1">{err.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
