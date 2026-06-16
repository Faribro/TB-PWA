'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Calendar,
  MapPin,
  Download,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { exportPatientsToXLSX } from '@/lib/export-xlsx';

interface Patient {
  id: number;
  inmate_name: string;
  screening_district: string;
  screening_state: string;
  screening_date: string;
  referral_date: string | null;
  tb_diagnosed: string | null;
  att_start_date: string | null;
  xray_result?: string;
  facility_name?: string;
  staff_name?: string;
}

interface DistrictDrillDashboardProps {
  district: string;
  patients: Patient[];
  onClose: () => void;
}

export function DistrictDrillDashboard({
  district,
  patients,
  onClose,
}: DistrictDrillDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Filter patients by time range
  const filteredPatients = useMemo(() => {
    if (timeRange === 'all') return patients;
    
    const now = Date.now();
    const ranges = { '7d': 7, '30d': 30, '90d': 90 };
    const days = ranges[timeRange];
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    
    return patients.filter(p => {
      const screeningDate = p.screening_date ? new Date(p.screening_date).getTime() : 0;
      return screeningDate >= cutoff;
    });
  }, [patients, timeRange]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = filteredPatients.length;
    const suspected = filteredPatients.filter(p => 
      p.xray_result?.toLowerCase().includes('suspected') ||
      p.xray_result?.toLowerCase().includes('abnormal')
    ).length;
    const diagnosed = filteredPatients.filter(p => 
      p.tb_diagnosed === 'Y' || p.tb_diagnosed === 'Yes'
    ).length;
    const attInitiated = filteredPatients.filter(p => p.att_start_date).length;
    
    const breaches = filteredPatients.filter(p => {
      const screeningDate = p.screening_date ? new Date(p.screening_date) : null;
      if (!screeningDate) return false;
      const daysSince = (Date.now() - screeningDate.getTime()) / (1000 * 60 * 60 * 24);
      return !p.referral_date && daysSince > 7;
    }).length;

    const suspectedRate = total > 0 ? (suspected / total) * 100 : 0;
    const diagnosisRate = suspected > 0 ? (diagnosed / suspected) * 100 : 0;
    const initiationRate = diagnosed > 0 ? (attInitiated / diagnosed) * 100 : 0;
    const breachRate = total > 0 ? (breaches / total) * 100 : 0;

    return {
      total,
      suspected,
      diagnosed,
      attInitiated,
      breaches,
      suspectedRate,
      diagnosisRate,
      initiationRate,
      breachRate,
    };
  }, [filteredPatients]);

  // Facility breakdown
  const facilityStats = useMemo(() => {
    const facilityMap = new Map<string, { total: number; suspected: number; diagnosed: number }>();
    
    filteredPatients.forEach(p => {
      const facility = p.facility_name || 'Unknown';
      if (!facilityMap.has(facility)) {
        facilityMap.set(facility, { total: 0, suspected: 0, diagnosed: 0 });
      }
      const stats = facilityMap.get(facility)!;
      stats.total++;
      if (p.xray_result?.toLowerCase().includes('suspected')) stats.suspected++;
      if (p.tb_diagnosed === 'Y' || p.tb_diagnosed === 'Yes') stats.diagnosed++;
    });

    return Array.from(facilityMap.entries())
      .map(([facility, stats]) => ({
        facility,
        ...stats,
        suspectedRate: (stats.suspected / stats.total) * 100,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredPatients]);

  // Weekly trend
  const weeklyTrend = useMemo(() => {
    const weeks = 8;
    const now = Date.now();
    const weekData = Array.from({ length: weeks }, (_, i) => {
      const weekStart = now - (weeks - i) * 7 * 24 * 60 * 60 * 1000;
      const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
      
      const weekPatients = patients.filter(p => {
        const date = p.screening_date ? new Date(p.screening_date).getTime() : 0;
        return date >= weekStart && date < weekEnd;
      });

      return {
        week: `W${weeks - i}`,
        count: weekPatients.length,
        suspected: weekPatients.filter(p => p.xray_result?.toLowerCase().includes('suspected')).length,
      };
    });

    return weekData;
  }, [patients]);

  const handleExport = () => {
    exportPatientsToXLSX(filteredPatients as any, {
      filename: `${district}-drill-down`,
      includeMetrics: true,
      districtFilter: district,
    });
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUpRight className="w-4 h-4 text-red-500" />;
    if (current < previous) return <ArrowDownRight className="w-4 h-4 text-emerald-500" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
          className="relative w-full max-w-7xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{district} District</h2>
                  <p className="text-sm text-white/80">Deep Dive Analytics</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Export Excel
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-2 mt-4">
              {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    timeRange === range
                      ? 'bg-white text-teal-600 shadow-lg'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {range === 'all' ? 'All Time' : range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6 space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                icon={Users}
                label="Total Screened"
                value={metrics.total}
                trend={getTrendIcon(metrics.total, patients.length)}
                color="blue"
              />
              <MetricCard
                icon={AlertTriangle}
                label="Suspected Cases"
                value={metrics.suspected}
                subtitle={`${metrics.suspectedRate.toFixed(1)}% of total`}
                color="amber"
              />
              <MetricCard
                icon={Activity}
                label="TB Diagnosed"
                value={metrics.diagnosed}
                subtitle={`${metrics.diagnosisRate.toFixed(1)}% yield`}
                color="red"
              />
              <MetricCard
                icon={CheckCircle2}
                label="On Treatment"
                value={metrics.attInitiated}
                subtitle={`${metrics.initiationRate.toFixed(1)}% initiation`}
                color="emerald"
              />
            </div>

            {/* SLA Breach Alert */}
            {metrics.breachRate > 20 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-900">High SLA Breach Rate Detected</p>
                    <p className="text-sm text-red-700">
                      {metrics.breaches} patients ({metrics.breachRate.toFixed(1)}%) have exceeded 7-day referral SLA
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Trend */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Screening Trend (8 Weeks)</h3>
                  <BarChart3 className="w-4 h-4 text-slate-400" />
                </div>
                <div className="space-y-2">
                  {weeklyTrend.map((week, i) => {
                    const maxCount = Math.max(...weeklyTrend.map(w => w.count));
                    const width = maxCount > 0 ? (week.count / maxCount) * 100 : 0;
                    
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-500 w-8">{week.week}</span>
                        <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${width}%` }}
                            transition={{ delay: i * 0.05, duration: 0.5 }}
                            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-end pr-2"
                          >
                            {week.count > 0 && (
                              <span className="text-xs font-bold text-white">{week.count}</span>
                            )}
                          </motion.div>
                        </div>
                        <span className="text-xs text-amber-600 font-semibold w-8 text-right">
                          {week.suspected}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 text-xs">
                  <span className="text-slate-500">Total</span>
                  <span className="text-slate-500">Suspected</span>
                </div>
              </div>

              {/* Top Facilities */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Top 5 Facilities</h3>
                  <PieChart className="w-4 h-4 text-slate-400" />
                </div>
                <div className="space-y-3">
                  {facilityStats.map((facility, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700 truncate flex-1">
                          {facility.facility}
                        </span>
                        <span className="text-xs font-bold text-slate-900 ml-2">
                          {facility.total}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(facility.total / metrics.total) * 100}%` }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                          />
                        </div>
                        <span className="text-xs text-amber-600 font-semibold">
                          {facility.suspected} susp.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PerformanceCard
                label="Diagnosis Yield"
                value={metrics.diagnosisRate}
                target={15}
                unit="%"
                description="Suspected → Diagnosed conversion"
              />
              <PerformanceCard
                label="Treatment Initiation"
                value={metrics.initiationRate}
                target={95}
                unit="%"
                description="Diagnosed → On ATT conversion"
              />
              <PerformanceCard
                label="SLA Compliance"
                value={100 - metrics.breachRate}
                target={90}
                unit="%"
                description="Within 7-day referral window"
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Metric Card Component
function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  subtitle?: string;
  trend?: React.ReactNode;
  color: 'blue' | 'amber' | 'red' | 'emerald';
}) {
  const colors = {
    blue: 'from-blue-500 to-cyan-500',
    amber: 'from-amber-500 to-orange-500',
    red: 'from-red-500 to-rose-500',
    emerald: 'from-emerald-500 to-teal-500',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend}
      </div>
      <p className="text-3xl font-bold text-slate-900 mb-1">{value.toLocaleString()}</p>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}

// Performance Card Component
function PerformanceCard({
  label,
  value,
  target,
  unit,
  description,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  description: string;
}) {
  const percentage = Math.min((value / target) * 100, 100);
  const status = value >= target ? 'success' : value >= target * 0.8 ? 'warning' : 'danger';
  
  const statusColors = {
    success: 'from-emerald-500 to-teal-500',
    warning: 'from-amber-500 to-orange-500',
    danger: 'from-red-500 to-rose-500',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-slate-900">{label}</h4>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
          status === 'success' ? 'bg-emerald-100 text-emerald-700' :
          status === 'warning' ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }`}>
          {value.toFixed(1)}{unit}
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-3">{description}</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Target: {target}{unit}</span>
          <span className="text-slate-700 font-semibold">{percentage.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full bg-gradient-to-r ${statusColors[status]}`}
          />
        </div>
      </div>
    </div>
  );
}
