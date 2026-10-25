import { useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Sparkles, FileText, CheckCircle2 } from 'lucide-react';

export function AiSummaryButton({ scope }: { scope: 'attendance' | 'payroll' | 'general' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [bullets, setBullets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setIsOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{
        summary: string;
        bulletPoints?: string[];
      }>('/ai/summary', {
        method: 'POST',
        body: JSON.stringify({ scope }),
      });
      setSummary(res.summary);
      if (res.bulletPoints && res.bulletPoints.length > 0) {
        setBullets(res.bulletPoints);
      } else {
        // Parse bullets from lines starting with - or *
        const lines = res.summary
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.startsWith('-') || l.startsWith('*') || l.startsWith('•'))
          .map((l) => l.replace(/^[-*•]\s*/, ''));
        setBullets(lines);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate AI executive summary';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={fetchSummary}
        className="flex items-center gap-1.5 border-accent/30 text-accent hover:bg-accent/10"
      >
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        <span>AI Summary</span>
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Executive AI Digest"
        description="Auto-generated intelligence digest powered by company activity and records."
      >
        <div className="space-y-4">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                <Sparkles className="w-4 h-4 text-accent absolute inset-0 m-auto" />
              </div>
              <p className="text-xs text-muted font-medium">
                Analyzing trends, anomalies, and metrics for executive digest...
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-card text-danger text-xs">
              <p className="font-semibold">Generation failed</p>
              <p className="mt-0.5 text-[11px]">{error}</p>
            </div>
          )}

          {!loading && !error && summary && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted border-b border-border pb-2">
                <span className="flex items-center gap-1.5 font-medium text-navy">
                  <FileText className="w-3.5 h-3.5 text-accent" />
                  Key Takeaways
                </span>
                <span className="text-[10px] bg-accent/10 text-accent font-semibold px-2 py-0.5 rounded-full border border-accent/20">
                  AI Generated
                </span>
              </div>

              {bullets.length > 0 ? (
                <ul className="space-y-2">
                  {bullets.map((b, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-text leading-relaxed">
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-text leading-relaxed whitespace-pre-wrap">{summary}</p>
              )}

              <div className="p-2.5 bg-bg rounded-control border border-border text-[11px] text-muted flex items-center justify-between">
                <span>Summary scope: <strong className="capitalize">{scope}</strong></span>
                <span>Verified against database</span>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
