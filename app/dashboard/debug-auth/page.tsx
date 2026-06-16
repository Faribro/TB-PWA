'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function DebugAuthPage() {
  const { data: session } = useSession();
  const [profileData, setProfileData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.email) {
      fetch('/api/debug-profile?email=' + encodeURIComponent(session.user.email))
        .then(res => res.json())
        .then(data => setProfileData(data))
        .catch(err => setError(err.message));
    }
  }, [session]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black mb-8">Auth Debug Panel</h1>
        
        <div className="bg-white rounded-2xl p-6 mb-6 border border-slate-200">
          <h2 className="text-xl font-bold mb-4">Session Data</h2>
          <pre className="bg-slate-900 text-green-400 p-4 rounded-xl overflow-auto text-xs">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-2xl p-6 mb-6 border border-slate-200">
          <h2 className="text-xl font-bold mb-4">Supabase Profile Lookup</h2>
          {error && <p className="text-red-600 mb-4">Error: {error}</p>}
          <pre className="bg-slate-900 text-green-400 p-4 rounded-xl overflow-auto text-xs">
            {JSON.stringify(profileData, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="text-xl font-bold mb-4">Quick Info</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Email:</strong> {session?.user?.email || 'Not logged in'}</p>
            <p><strong>Role:</strong> {session?.user?.role || 'Not set'}</p>
            <p><strong>State:</strong> {session?.user?.state || 'Not set'}</p>
            <p><strong>District:</strong> {session?.user?.district || 'Not set'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
