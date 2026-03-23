'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { Users, Activity, Calendar, AlertTriangle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RealTimeStats() {
  const [stats, setStats] = useState({ screened: 0, diagnosed: 0, referred: 0, ltfu: 0 });

  const fetchStats = async () => {
    // Task 1: Use HEAD query to bypass 1000-row limit for total count
    const { count: totalCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });

    // Fetch all patient stats in batches (1000 per batch)
    const batchSize = 1000;
    const allPatients: any[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('patients')
        .select('tb_diagnosed, referral_date, att_start_date, att_completion_date')
        .range(offset, offset + batchSize - 1);

      if (error || !data) break;
      allPatients.push(...data);
      hasMore = data.length === batchSize;
      offset += batchSize;
    }

    const newStats = {
      screened: totalCount || 0,
      diagnosed: allPatients.filter(p => p.tb_diagnosed === 'Yes').length,
      referred: allPatients.filter(p => p.referral_date && p.tb_diagnosed !== 'Yes').length,
      ltfu: allPatients.filter(p => {
        if (!p.att_start_date || p.att_completion_date) return false;
        const daysSince = Math.floor((Date.now() - new Date(p.att_start_date).getTime()) / 86400000);
        return daysSince > 30;
      }).length
    };

    setStats(newStats);
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    
    const subscription = supabase
      .channel('patients_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, fetchStats)
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  const statItems = [
    { title: 'Total Screened', val: stats.screened, icon: Users, gradient: 'from-blue-400 to-blue-600', bg: 'from-blue-50 to-blue-100' },
    { title: 'Active Diagnoses', val: stats.diagnosed, icon: Activity, gradient: 'from-red-400 to-red-600', bg: 'from-red-50 to-red-100' },
    { title: 'Pending Referral', val: stats.referred, icon: Calendar, gradient: 'from-amber-400 to-amber-600', bg: 'from-amber-50 to-amber-100' },
    { title: 'High-Risk LTFU', val: stats.ltfu, icon: AlertTriangle, gradient: 'from-purple-400 to-purple-600', bg: 'from-purple-50 to-purple-100' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-gradient-to-br ${stat.bg} border border-white/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="w-2 h-2 bg-emerald-500 rounded-full"
              />
            </div>
            
            <h3 className="text-gray-600 text-sm font-semibold uppercase tracking-wider mb-2">{stat.title}</h3>
            <div className="flex items-baseline gap-2">
              <motion.span 
                key={stat.val}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-3xl font-bold text-gray-900"
              >
                {stat.val.toLocaleString()}
              </motion.span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}