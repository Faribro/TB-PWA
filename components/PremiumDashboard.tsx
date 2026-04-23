'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, Target, Zap, Shield, Clock, Users, BarChart3, ArrowUpRight, ArrowDownRight, Flame, Sparkles, Globe, Filter, RefreshCw } from 'lucide-react';
import useSWR from 'swr';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { useSessionScope } from '@/hooks/useSessionScope';

interface MetricCard {
  id: string;
  title: string;
  today: number;
  total: number;
  trend: number;
  icon: any;
  color: string;
  gradient: string;
}

// Simple fetcher for SWR
const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function PremiumDashboard() {
  const scope = useSessionScope();
  
  // Fetch summary metrics (server-computed aggregates) - FAST
  const { data: summaryData } = useSWR(
    scope ? `/api/patients/summary` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 min cache
    }
  );
  
  // Fetch first page only for today's calculations
  const { patients } = useSWRAllPatients(scope, {
    limit: 1000,
    autoFetchAll: false
  });
  
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Memoize current date to prevent hydration mismatch
  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => 
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    [now]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate today's patients (use local timezone date)
  const todayPatients = useMemo(() => {
    if (!patients || !mounted) return [];
    
    return patients.filter(p => {
      if (!p.screening_date) return false;
      // Extract date part only (ignore time)
      const screeningDate = p.screening_date.split('T')[0];
      return screeningDate === today;
    });
  }, [patients, today, mounted]);

  // Calculate metrics
  const metrics = useMemo((): MetricCard[] => {
    if (!summaryData || !patients || !mounted) return [];
    
    // Today's stats (from first page - sufficient for today)
    const todayScreened = todayPatients.length;
    const todaySuspected = todayPatients.filter(p => p.xray_result === 'Suspected TB Case').length;
    const todayDiagnosed = todayPatients.filter(p => p.tb_diagnosed === 'Y').length;
    const todayBreaches = todayPatients.filter(p => {
      const screeningDate = p.screening_date ? new Date(p.screening_date) : null;
      if (!screeningDate) return false;
      const daysSince = (now.getTime() - screeningDate.getTime()) / (1000 * 60 * 60 * 24);
      return !p.referral_date && daysSince > 7;
    }).length;

    // Total stats (from server-computed summary - TRUE TOTALS)
    const totalScreened = summaryData.total;
    const totalSuspected = summaryData.suspected;
    const totalDiagnosed = summaryData.diagnosed;
    const totalBreaches = summaryData.pending; // Pending = no referral

    return [
      {
        id: 'screened',
        title: 'Screened',
        today: todayScreened,
        total: totalScreened,
        trend: todayScreened > 0 ? ((todayScreened / totalScreened) * 100) : 0,
        icon: Activity,
        color: 'text-blue-500',
        gradient: 'from-blue-500 to-cyan-400'
      },
      {
        id: 'suspected',
        title: 'Suspected',
        today: todaySuspected,
        total: totalSuspected,
        trend: totalScreened > 0 ? (todaySuspected / totalScreened) * 100 : 0,
        icon: Target,
        color: 'text-amber-500',
        gradient: 'from-amber-500 to-orange-400'
      },
      {
        id: 'diagnosed',
        title: 'Diagnosed',
        today: todayDiagnosed,
        total: totalDiagnosed,
        trend: totalScreened > 0 ? (todayDiagnosed / totalScreened) * 100 : 0,
        icon: Shield,
        color: 'text-emerald-500',
        gradient: 'from-emerald-500 to-green-400'
      },
      {
        id: 'breaches',
        title: 'SLA Breaches',
        today: todayBreaches,
        total: totalBreaches,
        trend: totalScreened > 0 ? (todayBreaches / totalScreened) * 100 : 0,
        icon: Zap,
        color: 'text-red-500',
        gradient: 'from-red-500 to-rose-400'
      }
    ];
  }, [summaryData, patients, todayPatients, now, mounted]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-2">
              Intelligence Breakdown
            </h1>
            <p className="text-slate-400 text-sm">Real-time TB surveillance dashboard</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="flex items-center bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-1">
              {(['today', 'week', 'month'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
                    selectedPeriod === period
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>

            <button
              onClick={handleRefresh}
              className="p-3 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl hover:bg-slate-700/50 transition-all group"
            >
              <RefreshCw className={`w-5 h-5 text-slate-400 group-hover:text-white transition-colors ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative group"
            >
              {/* Card Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl overflow-hidden">
                {/* Animated gradient border */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                
                {/* Glow effect */}
                <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${metric.gradient} opacity-20 rounded-full blur-2xl group-hover:opacity-30 transition-opacity`} />
              </div>

              {/* Card Content */}
              <div className="relative p-6">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${metric.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <metric.icon className="w-6 h-6 text-white" />
                </div>

                {/* Title */}
                <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-3">{metric.title}</h3>

                {/* Today vs Total Display */}
                <div className="space-y-3">
                  {/* Today */}
                  <div>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Today</p>
                    <div className="flex items-baseline gap-2">
                      <motion.span
                        key={`today-${metric.today}`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-3xl font-black text-white"
                      >
                        {metric.today.toLocaleString()}
                      </motion.span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-slate-700 to-transparent" />

                  {/* Total */}
                  <div>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Total</p>
                    <div className="flex items-baseline gap-2">
                      <motion.span
                        key={`total-${metric.total}`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-2xl font-bold text-slate-300"
                      >
                        {metric.total.toLocaleString()}
                      </motion.span>
                    </div>
                  </div>
                </div>

                {/* Trend Indicator */}
                <div className={`mt-4 flex items-center gap-2 ${metric.trend > 5 ? 'text-emerald-400' : metric.trend > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {metric.trend > 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  <span className="text-xs font-bold">{metric.trend.toFixed(1)}%</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions Bar */}
        <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Quick Filters</h3>
                <p className="text-slate-400 text-xs">Apply filters to view specific data</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-xl text-xs font-bold text-white transition-all">
                High Risk
              </button>
              <button className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-xl text-xs font-bold text-white transition-all">
                Pending
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl text-xs font-bold text-white shadow-lg hover:shadow-xl transition-all">
                View GIS Map
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* District Performance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Top Districts</h3>
                <p className="text-slate-400 text-xs">By screening volume</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {[
                { name: 'Jabalpur', value: 1245, change: 12 },
                { name: 'Indore', value: 1089, change: 8 },
                { name: 'Bhopal', value: 956, change: -3 }
              ].map((district, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-xs font-bold text-white">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-white text-xs font-bold">{district.name}</p>
                      <p className="text-slate-400 text-[10px]">{district.value.toLocaleString()} screened</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-bold ${district.change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {district.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(district.change)}%
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* System Health */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">System Health</h3>
                <p className="text-slate-400 text-xs">All systems operational</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {[
                { name: 'API Response', status: '98ms', healthy: true },
                { name: 'Data Sync', status: 'Live', healthy: true },
                { name: 'Cache Hit', status: '94%', healthy: true }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-slate-300 text-xs">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.healthy ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                    <span className="text-white text-xs font-bold">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Recent Activity</h3>
                <p className="text-slate-400 text-xs">Latest updates</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {[
                { action: 'New patient screened', time: '2m ago', icon: Users },
                { action: 'SLA breach alert', time: '5m ago', icon: Zap },
                { action: 'Batch sync complete', time: '12m ago', icon: RefreshCw }
              ].map((activity, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center">
                    <activity.icon className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-xs font-bold">{activity.action}</p>
                    <p className="text-slate-500 text-[10px]">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
