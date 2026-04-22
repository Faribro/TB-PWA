'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function KoboSyncPage() {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ fetched: 0, upserted: 0, total: 0, pages: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const startSync = async () => {
    setSyncing(true);
    setError(null);
    setLogs([]);
    setProgress({ fetched: 0, upserted: 0, total: 0, pages: 0 });

    addLog('🚀 Starting Kobo → Supabase sync...');

    let cursor: string | null = null;
    let pageCount = 0;
    let totalFetched = 0;
    let totalUpserted = 0;

    try {
      while (true) {
        pageCount++;
        addLog(`📦 Fetching page ${pageCount}...`);

        const res = await fetch('/api/etl/kobo-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cursor }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        
        totalFetched += data.fetched;
        totalUpserted += data.upserted;

        setProgress({
          fetched: totalFetched,
          upserted: totalUpserted,
          total: data.total,
          pages: pageCount,
        });

        addLog(`✅ Page ${pageCount}: ${data.fetched} fetched, ${data.upserted} upserted`);

        if (data.skippedRows > 0) {
          addLog(`⚠️  Skipped ${data.skippedRows} rows with errors`);
        }

        if (data.batchError) {
          addLog(`❌ Batch error: ${data.batchError}`);
        }

        if (data.done) {
          addLog('🎉 Sync complete!');
          break;
        }

        cursor = data.nextCursor;
      }
    } catch (err: any) {
      setError(err.message);
      addLog(`💥 Error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.fetched / progress.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Kobo → Supabase Sync</h1>
          <p className="text-sm text-slate-600 mb-6">
            Import all existing data from KoboToolbox to Supabase database
          </p>

          {progress.total > 0 && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-2xl font-bold text-blue-900">{progress.fetched.toLocaleString()}</div>
                <div className="text-xs text-blue-600">Fetched</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                <div className="text-2xl font-bold text-emerald-900">{progress.upserted.toLocaleString()}</div>
                <div className="text-xs text-emerald-600">Upserted</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="text-2xl font-bold text-slate-900">{progress.total.toLocaleString()}</div>
                <div className="text-xs text-slate-600">Total in Kobo</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="text-2xl font-bold text-purple-900">{progress.pages}</div>
                <div className="text-xs text-purple-600">Pages</div>
              </div>
            </div>
          )}

          {syncing && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-slate-600 mb-2">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="font-medium text-red-900">Sync Failed</div>
                  <div className="text-sm text-red-700 mt-1">{error}</div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={startSync}
            disabled={syncing}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {syncing ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Syncing... (Page {progress.pages})
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Start Full Sync
              </>
            )}
          </button>

          {logs.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Sync Logs</h3>
              <div className="bg-slate-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs text-slate-300">
                {logs.map((log, i) => (
                  <div key={i} className="mb-1">{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
