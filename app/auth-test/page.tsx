'use client';

import { useSession } from 'next-auth/react';

export default function AuthTestPage() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold mb-6">Auth Session Test</h1>
        
        <div className="space-y-4">
          <div>
            <strong>Status:</strong> {status}
          </div>
          
          {status === 'loading' && (
            <div className="text-blue-600">Loading session...</div>
          )}
          
          {status === 'unauthenticated' && (
            <div className="text-red-600">
              No session found. Please <a href="/login" className="underline">log in</a>.
            </div>
          )}
          
          {status === 'authenticated' && session && (
            <div className="space-y-2">
              <div className="text-green-600 font-semibold">✓ Authenticated</div>
              <div><strong>Email:</strong> {session.user?.email}</div>
              <div><strong>Name:</strong> {session.user?.name}</div>
              <div><strong>Role:</strong> {session.user?.role}</div>
              <div><strong>State:</strong> {session.user?.state}</div>
              <div><strong>District:</strong> {(session.user as any)?.district}</div>
              
              <div className="mt-6 p-4 bg-slate-100 rounded-lg">
                <strong>Full Session Object:</strong>
                <pre className="mt-2 text-xs overflow-auto">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
