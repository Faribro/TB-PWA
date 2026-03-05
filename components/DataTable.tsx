'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { RefreshCw, Search, AlertCircle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface DataTableProps {
  showDuplicates?: boolean;
}

export function DataTable({ showDuplicates = false }: DataTableProps) {
  const [patients, setPatients] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 100;

  const loadData = async () => {
    setLoading(true);
    
    if (showDuplicates) {
      // Find duplicates by unique_id or kobo_uuid
      const { data } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) {
        const duplicates = data.filter((patient, index, arr) => 
          arr.findIndex(p => 
            p.unique_id === patient.unique_id || 
            (p.kobo_uuid && p.kobo_uuid === patient.kobo_uuid)
          ) !== index
        );
        setPatients(duplicates);
        setTotalCount(duplicates.length);
      }
    } else {
      const { data, count } = await supabase
        .from('patients')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      
      setPatients(data || []);
      setTotalCount(count || 0);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [page, showDuplicates]);

  const filtered = patients.filter(p => 
    p.inmate_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.unique_id?.toLowerCase().includes(search.toLowerCase()) ||
    p.facility_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full bg-white/70 backdrop-blur-lg border border-gray-200/50 rounded-3xl overflow-hidden shadow-lg"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200/50">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder={showDuplicates ? "Search duplicates..." : "Search patients..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          {showDuplicates && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Duplicate Records</span>
            </div>
          )}
        </div>
        <Button onClick={loadData} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">State</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Facility</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Screening</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200/50">
            {filtered.map((patient, index) => (
              <motion.tr 
                key={patient.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-4 py-3 text-gray-700 font-mono text-xs">{patient.unique_id}</td>
                <td className="px-4 py-3 text-gray-900 font-medium">{patient.inmate_name}</td>
                <td className="px-4 py-3 text-gray-600">{patient.screening_state}</td>
                <td className="px-4 py-3 text-gray-600">{patient.facility_name}</td>
                <td className="px-4 py-3 text-gray-600">{patient.screening_date}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    patient.tb_diagnosed === 'Yes' ? 'bg-red-100 text-red-700' :
                    patient.referral_date ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {patient.tb_diagnosed === 'Yes' ? 'Diagnosed' : patient.referral_date ? 'Referred' : 'Screened'}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {!showDuplicates && (
        <div className="px-4 py-3 border-t border-gray-200/50 flex items-center justify-between bg-gray-50/30">
          <div className="text-xs text-gray-600">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()} patients
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} size="sm" variant="outline">
              Previous
            </Button>
            <div className="flex items-center gap-2 px-3 text-xs text-gray-500">
              Page {page} of {Math.ceil(totalCount / pageSize)}
            </div>
            <Button onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))} disabled={page >= Math.ceil(totalCount / pageSize)} size="sm" variant="outline">
              Next
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
