'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '1rem' }}>
          <div style={{ maxWidth: '32rem', width: '100%', background: 'white', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Application Error</h2>
            <pre style={{ fontSize: '0.75rem', color: '#dc2626', background: '#fef2f2', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1.5rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {error.message || 'Unknown error'}
            </pre>
            <button onClick={reset} style={{ padding: '0.75rem 1.5rem', background: '#2563eb', color: 'white', borderRadius: '0.5rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
