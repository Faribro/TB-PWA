'use client';

// PAGE STRUCTURE (TOP TO BOTTOM):
// 1. <ScrollProgressBar />        ← fixed, z-9999
// 2. Ambient Background Layer     ← fixed, z-[-1]
// 3. <Header />                   ← existing, untouched
// 4. <ProgramMission /> wrapper   ← Phase 1
// 5. <StatsTicker />              ← Phase 2, Task 3
// 6. <SectionDivider />           ← Phase 2, Task 2A
// 7. Maze Grid container          ← existing, untouched
// 8. <SectionDivider />           ← Phase 2, Task 2B
// 9. <InmateJourney />            ← Phase 1

import { memo, useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { FeatureShowcase } from '@/components/FeatureShowcase';
import ProgramMission from '@/components/ProgramMission';
import InmateJourney from '@/components/InmateJourney';
import PatientTimeline from '@/components/PatientTimeline';
import ScrollProgressBar from '@/components/ScrollProgressBar';
import SectionDivider from '@/components/SectionDivider';
import StatsTicker from '@/components/StatsTicker';
import PipelineDashboardEmbed from '@/components/PipelineDashboardEmbed';
import CommandFooter from '@/components/CommandFooter';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { useSessionScope } from '@/hooks/useSessionScope';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Activity, Target, Shield, Clock, BarChart3, Sparkles } from 'lucide-react';

const BackgroundGrid = memo(() => (
  <div 
    className="fixed inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none"
    style={{
      maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000 70%, transparent 100%)',
      WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000 70%, transparent 100%)'
    }}
    aria-hidden="true"
  />
));

BackgroundGrid.displayName = 'BackgroundGrid';

interface HeaderProps {
  readonly firstName: string;
  readonly userRole: string;
}

// Stable particle data — golden-angle distribution, computed once at module level
const PARTICLE_POSITIONS = Array.from({ length: 20 }, (_, i) => ({
  left: `${((i * 137.508) % 100).toFixed(2)}%`,
  top:  `${((i * 53.13)  % 100).toFixed(2)}%`,
  duration: 3 + (i % 5) * 0.5,
  delay:    (i % 4) * 0.5,
}));

const Header = memo<HeaderProps>(({ firstName, userRole }) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Don't render anything until mounted (client-side only)
  if (!mounted) {
    return null;
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center justify-between mb-8 relative z-50 w-full"
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.1, type: 'spring' }}
        className="relative h-[52px]"
      >
        <Image
          src="/Images/Logo/samadhaan_os_final.svg"
          alt="SAMADHAAN OS Logo"
          width={300}
          height={110}
          className="h-full w-auto object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300 hover:drop-shadow-[0_0_25px_rgba(139,92,246,0.5)]"
          priority
          unoptimized
        />
      </motion.div>

      {/* Welcome Status Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative group"
      >
        <div className="absolute -inset-[1px] bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 rounded-xl opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500" />
        <div className="relative bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-5 py-2.5 flex items-center gap-2.5 group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-slate-500 tracking-tight">Welcome,</span>
            <span className="text-[13px] font-semibold text-slate-900 tracking-tight">{firstName}</span>
          </div>
          <div className="h-3.5 w-[0.5px] bg-gradient-to-b from-transparent via-slate-300 to-transparent" />
          <div className="flex items-center gap-2.5">
            <span className="text-[12px] font-medium text-slate-500 tracking-tight">you&apos;re Logged in as an </span>
            <div className="relative">
              <div className="absolute inset-0 bg-slate-900 rounded-md blur-[2px] opacity-20" />
              <div className="relative px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-semibold uppercase tracking-[0.1em]">{userRole}</div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.header>
  );
});

Header.displayName = 'Header';

// Simple fetcher for SWR
const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function CommandHubPage() {
  const { data: session, status } = useSession();
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
  
  // Fetch first page only for today's calculations (not for totals)
  const { patients } = useSWRAllPatients(scope, {
    limit: 1000, // Enough for today's data
    autoFetchAll: false // Only first page for today's metrics
  });

  const firstName = useMemo(
    () => session?.user?.name?.split(' ')[0] || 'Officer',
    [session?.user?.name]
  );
  
  const userRole = session?.user?.role || 'User';

  // Calculate dynamic metrics
  const metrics = useMemo(() => {
    if (!summaryData) return null;
    
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Today's stats (computed from first page - good enough for today)
    const todayScreened = patients?.filter(p => p.screening_date === todayStr).length || 0;
    const todaySuspected = patients?.filter(p => p.screening_date === todayStr && p.xray_result === 'Suspected TB Case').length || 0;
    const todayDiagnosed = patients?.filter(p => p.screening_date === todayStr && p.tb_diagnosed === 'Y').length || 0;
    const todayPending = patients?.filter(p => p.screening_date === todayStr && !p.referral_date && p.tb_diagnosed !== 'Y').length || 0;

    // Total stats (from server-computed summary - TRUE TOTALS)
    const totalScreened = summaryData.total;
    const totalSuspected = summaryData.suspected;
    const totalDiagnosed = summaryData.diagnosed;
    const totalPending = summaryData.pending;

    return {
      todayScreened,
      todaySuspected,
      todayDiagnosed,
      todayPending,
      totalScreened,
      totalSuspected,
      totalDiagnosed,
      totalPending
    };
  }, [summaryData, patients]);

  // Show loading state while session is loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 relative overflow-hidden">
      <ScrollProgressBar />
      
      <div aria-hidden="true" className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-indigo-100/50 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full bg-purple-100/40 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-blue-50/30 blur-[100px]" />
      </div>
      
      <BackgroundGrid />
      
      <div className="relative z-10 min-h-screen pt-6 pb-16 px-6">
        <Header firstName={firstName} userRole={userRole} />

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-[1400px] mx-auto px-6 mt-2 mb-8"
          data-tour-id="kpi-dashboard-bar"
        >
          {/* Ultra-Premium Metrics Bar */}
          <div className="relative rounded-3xl overflow-hidden">
            {/* Animated gradient background with multiple layers */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            
            {/* Ambient glow effects */}
            <div className="absolute -top-20 -left-20 w-60 h-60 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            
            {/* Glassmorphism card with premium shadow */}
            <div className="relative bg-white/90 backdrop-blur-2xl border border-white/80 shadow-[0_8px_50px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.5)] p-6">
              <div className="flex flex-wrap items-center gap-6 md:gap-8">
                {/* Screened - Ultra Premium Card */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="relative group min-w-[220px] flex-1"
                  data-tour-id="kpi-screened"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/5 to-cyan-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative p-5 rounded-2xl border border-blue-100/60 bg-gradient-to-br from-blue-50/70 via-white to-transparent hover:from-blue-50/90 transition-all duration-500 shadow-[0_4px_20px_rgba(59,130,246,0.08)] hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)]">
                    {/* Animated border glow */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/0 via-blue-400/30 to-blue-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    
                    <div className="relative flex items-center gap-3 mb-4">
                      <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-xl" />
                        <Activity className="w-5 h-5 text-white relative z-10" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-blue-600/80 font-bold">Screened</p>
                        <div className="h-0.5 w-8 bg-gradient-to-r from-blue-400 to-transparent rounded-full mt-1" />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[8px] uppercase tracking-[0.15em] text-blue-400/60 font-semibold">Today</span>
                        <motion.span 
                          key={`today-screened-${metrics?.todayScreened}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                          className="text-3xl font-black text-blue-700 tabular-nums tracking-tight"
                        >
                          {metrics?.todayScreened?.toLocaleString() || '0'}
                        </motion.span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[8px] uppercase tracking-[0.15em] text-blue-400/60 font-semibold">Total</span>
                        <motion.span 
                          key={`total-screened-${metrics?.totalScreened}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 300, delay: 0.05 }}
                          className="text-xl font-bold text-blue-500/90 tabular-nums tracking-tight"
                        >
                          {metrics?.totalScreened?.toLocaleString() || '0'}
                        </motion.span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Suspected - Ultra Premium Card */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="relative group min-w-[220px] flex-1"
                  data-tour-id="kpi-flagged"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/5 to-orange-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative p-5 rounded-2xl border border-amber-100/60 bg-gradient-to-br from-amber-50/70 via-white to-transparent hover:from-amber-50/90 transition-all duration-500 shadow-[0_4px_20px_rgba(245,158,11,0.08)] hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)]">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-400/0 via-amber-400/30 to-amber-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    
                    <div className="relative flex items-center gap-3 mb-4">
                      <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-xl" />
                        <Target className="w-5 h-5 text-white relative z-10" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-amber-600/80 font-bold">Suspected</p>
                        <div className="h-0.5 w-8 bg-gradient-to-r from-amber-400 to-transparent rounded-full mt-1" />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[8px] uppercase tracking-[0.15em] text-amber-400/60 font-semibold">Today</span>
                        <motion.span 
                          key={`today-suspected-${metrics?.todaySuspected}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                          className="text-3xl font-black text-amber-700 tabular-nums tracking-tight"
                        >
                          {metrics?.todaySuspected?.toLocaleString() || '0'}
                        </motion.span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[8px] uppercase tracking-[0.15em] text-amber-400/60 font-semibold">Total</span>
                        <motion.span 
                          key={`total-suspected-${metrics?.totalSuspected}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 300, delay: 0.05 }}
                          className="text-xl font-bold text-amber-500/90 tabular-nums tracking-tight"
                        >
                          {metrics?.totalSuspected?.toLocaleString() || '0'}
                        </motion.span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Diagnosed - Ultra Premium Card */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3, type: 'spring', stiffness: 200 }}
                  className="relative group min-w-[220px] flex-1"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-emerald-500/5 to-green-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative p-5 rounded-2xl border border-emerald-100/60 bg-gradient-to-br from-emerald-50/70 via-white to-transparent hover:from-emerald-50/90 transition-all duration-500 shadow-[0_4px_20px_rgba(16,185,129,0.08)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400/0 via-emerald-400/30 to-emerald-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    
                    <div className="relative flex items-center gap-3 mb-4">
                      <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-xl" />
                        <Shield className="w-5 h-5 text-white relative z-10" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600/80 font-bold">Diagnosed</p>
                        <div className="h-0.5 w-8 bg-gradient-to-r from-emerald-400 to-transparent rounded-full mt-1" />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[8px] uppercase tracking-[0.15em] text-emerald-400/60 font-semibold">Today</span>
                        <motion.span 
                          key={`today-diagnosed-${metrics?.todayDiagnosed}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                          className="text-3xl font-black text-emerald-700 tabular-nums tracking-tight"
                        >
                          {metrics?.todayDiagnosed?.toLocaleString() || '0'}
                        </motion.span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[8px] uppercase tracking-[0.15em] text-emerald-400/60 font-semibold">Total</span>
                        <motion.span 
                          key={`total-diagnosed-${metrics?.totalDiagnosed}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 300, delay: 0.05 }}
                          className="text-xl font-bold text-emerald-500/90 tabular-nums tracking-tight"
                        >
                          {metrics?.totalDiagnosed?.toLocaleString() || '0'}
                        </motion.span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Pending - Ultra Premium Card */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4, type: 'spring', stiffness: 200 }}
                  className="relative group min-w-[220px] flex-1"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/5 to-indigo-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative p-5 rounded-2xl border border-blue-100/60 bg-gradient-to-br from-blue-50/70 via-white to-transparent hover:from-blue-50/90 transition-all duration-500 shadow-[0_4px_20px_rgba(59,130,246,0.08)] hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)]">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/0 via-blue-400/30 to-blue-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    
                    <div className="relative flex items-center gap-3 mb-4">
                      <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-400 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-xl" />
                        <Clock className="w-5 h-5 text-white relative z-10" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-blue-600/80 font-bold">Pending</p>
                        <div className="h-0.5 w-8 bg-gradient-to-r from-blue-400 to-transparent rounded-full mt-1" />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[8px] uppercase tracking-[0.15em] text-blue-400/60 font-semibold">Today</span>
                        <motion.span 
                          key={`today-pending-${metrics?.todayPending}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                          className="text-3xl font-black text-blue-700 tabular-nums tracking-tight"
                        >
                          {metrics?.todayPending?.toLocaleString() || '0'}
                        </motion.span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[8px] uppercase tracking-[0.15em] text-blue-400/60 font-semibold">Total</span>
                        <motion.span 
                          key={`total-pending-${metrics?.totalPending}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 300, delay: 0.05 }}
                          className="text-xl font-bold text-blue-500/90 tabular-nums tracking-tight"
                        >
                          {metrics?.totalPending?.toLocaleString() || '0'}
                        </motion.span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <div className="h-16 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent hidden lg:block" />
                
                <div className="flex flex-wrap gap-3 items-center">
                  <Link
                    href="/dashboard/mande"
                    className="group relative px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white text-[11px] font-bold tracking-wide shadow-[0_4px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_8px30px_rgba(79,70,229,0.4)] hover:scale-105 transition-all duration-300 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      M&E Tools
                    </span>
                  </Link>
                  <Link
                    href="/dashboard/vertex"
                    className="group relative px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white text-[11px] font-bold tracking-wide shadow-[0_4px_20px_rgba(6,182,212,0.3)] hover:shadow-[0_8px30px_rgba(6,182,212,0.4)] hover:scale-105 transition-all duration-300 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Analytics
                    </span>
                  </Link>
                  <Link
                    href="/docs"
                    className="group relative px-5 py-3 rounded-2xl bg-white border border-slate-200/80 text-slate-700 text-[11px] font-bold tracking-wide hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-lg transition-all duration-300"
                  >
                    <span className="relative flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Knowledge
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
        
        <div className="w-full px-6 pb-6" data-tour-id="pipeline-embed">
          <PipelineDashboardEmbed />
        </div>
        
        <div className="w-full max-w-[1400px] mx-auto px-6 mt-6 mb-8" data-tour-id="program-mission">
          <ProgramMission />
        </div>
        
        <StatsTicker />
        
        <SectionDivider />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          data-tour-id="maze-grid"
        >
          <FeatureShowcase />
        </motion.div>
        
        <SectionDivider />
      </div>
      
      <div className="relative z-10" data-tour-id="journey-cube">
        <InmateJourney />
      </div>
      <div className="relative z-10 border-t border-white/40" data-tour-id="patient-timeline">
        <PatientTimeline />
      </div>
      
      <CommandFooter data-tour-id="command-footer" />
    </div>
  );
}
