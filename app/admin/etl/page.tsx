'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, CheckCircle, XCircle, Database, StopCircle } from 'lucide-react';

interface PageResult {
  page: number;
  fetched: number;
  upserted: number;
  skippedRows: number;
  rowErrorSample: string[];
  batchError: string | null;
  elapsedSeconds: number;
}

export default function ETLAdminPage() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [pages, setPages] = useState<PageResult[]>([]);
  const [totalKobo, setTotalKobo] = useState<number | null>(null);
  const [totalUpserted, setTotalUpserted] = useState(0);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const progress = totalKobo ? Math.min(100, Math.round((totalUpserted / totalKobo) * 100)) : 0;

  async function runSync() {
    setRunning(true);
    setDone(false);
    setPages([]);
    setTotalKobo(null);
    setTotalUpserted(0);
    setFatalError(null);
    abortRef.current = false;

    let cursor: string | null = null;
    let pageNum = 0;
    let cumUpserted = 0;

    while (true) {
      if (abortRef.current) break;

      try {
        const res = await fetch('/api/etl/kobo-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cursor }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          setFatalError(data.error || `HTTP ${res.status}`);
          break;
        }

        pageNum++;
        cumUpserted += data.upserted ?? 0;

        if (data.total && totalKobo === null) setTotalKobo(data.total);
        setTotalUpserted(cumUpserted);

        setPages(prev => [...prev, {
          page: pageNum,
          fetched: data.fetched,
          upserted: data.upserted,
          skippedRows: data.skippedRows,
          rowErrorSample: data.rowErrorSample ?? [],
          batchError: data.batchError,
          elapsedSeconds: data.elapsedSeconds,
        }]);

        if (data.done) { setDone(true); break; }
        cursor = data.nextCursor;

        // Small breathing room between pages to avoid hammering Supabase
        await new Promise(r => setTimeout(r, 300));
      } catch (err: any) {
        setFatalError(err.message || 'Network error');
        break;
      }
    }

    setRunning(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex items-center gap-4">
          <Database className="w-10 h-10 text-emerald-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">KoboToolbox ETL Pipeline</h1>
            <p className="text-gray-600">Cursor-paginated sync — one 500-row page per serverless call</p>
          </div>
        </div>

        {/* Control Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Full Sync</h2>
              <p className="text-sm text-gray-600 mt-1">
                Fetches all Kobo records page-by-page. Safe to re-run — upserts by <code className="bg-gray-100 px-1 rounded text-xs">kobo_uuid</code>.
              </p>
            </div>
            <div className="flex gap-3">
              {running && (
                <Button
                  onClick={() => { abortRef.current = true; }}
                  variant="outline"
                  size="lg"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <StopCircle className="w-5 h-5 mr-2" />
                  Stop
                </Button>
              )}
              <Button
                onClick={runSync}
                disabled={running}
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {running ? (
                  <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />Syncing...</>
                ) : (
                  <><Database className="w-5 h-5 mr-2" />Start Full Sync</>
                )}
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          {(running || done) && totalKobo !== null && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold text-gray-700">
                <span>{totalUpserted.toLocaleString()} / {totalKobo.toLocaleString()} records</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          )}

          {/* Done banner */}
          {done && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900">Sync complete</p>
                <p className="text-sm text-emerald-700 mt-1">
                  {pages.length} pages · {totalUpserted.toLocaleString()} records upserted
                </p>
              </div>
            </div>
          )}

          {/* Fatal error */}
          {fatalError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Sync stopped</p>
                <p className="text-sm text-red-700 mt-1">{fatalError}</p>
              </div>
            </div>
          )}
        </Card>

        {/* Per-page log */}
        {pages.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Page Log</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {[...pages].reverse().map((p) => (
                <div
                  key={p.page}
                  className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                    p.batchError ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'
                  }`}
                >
                  <span className="font-black text-slate-500 w-16 shrink-0">Page {p.page}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-emerald-700 font-bold">{p.upserted} upserted</span>
                    {p.skippedRows > 0 && (
                      <span className="text-amber-600 font-bold ml-3">{p.skippedRows} skipped</span>
                    )}
                    {p.batchError && (
                      <p className="text-red-600 text-xs mt-1 truncate">{p.batchError}</p>
                    )}
                    {p.rowErrorSample.length > 0 && (
                      <details className="mt-1">
                        <summary className="text-xs text-amber-600 cursor-pointer">
                          {p.rowErrorSample.length} row error(s)
                        </summary>
                        <ul className="mt-1 space-y-0.5">
                          {p.rowErrorSample.map((e, i) => (
                            <li key={i} className="text-[11px] text-slate-500 font-mono truncate">{e}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                  <span className="text-slate-400 text-xs shrink-0">{p.elapsedSeconds}s</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Config */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Configuration</h3>
          <div className="space-y-2 text-sm">
            {[
              ['Endpoint', '/api/etl/kobo-sync'],
              ['Page size', '500 rows'],
              ['Conflict key', 'kobo_uuid'],
              ['Timeout per page', '25s (safe under 60s Vercel limit)'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-gray-600">{k}:</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">{v}</code>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
}
