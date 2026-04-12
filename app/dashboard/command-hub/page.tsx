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

export default function CommandHubPage() {
  const { data: session, status } = useSession();
  const scope = useSessionScope();
  const { patients } = useSWRAllPatients(scope);

  const firstName = useMemo(
    () => session?.user?.name?.split(' ')[0] || 'Officer',
    [session?.user?.name]
  );
  
  const userRole = session?.user?.role || 'User';

  // Calculate dynamic metrics
  const metrics = useMemo(() => {
    if (!patients) return null;
    
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Today's stats
    const todayScreened = patients.filter(p => p.screening_date === todayStr).length;
    const todaySuspected = patients.filter(p => p.screening_date === todayStr && p.xray_result === 'Suspected TB Case').length;
    const todayDiagnosed = patients.filter(p => p.screening_date === todayStr && p.tb_diagnosed === 'Y').length;
    const todayPending = patients.filter(p => p.screening_date === todayStr && !p.referral_date && p.tb_diagnosed !== 'Y').length;

    // Total stats
    const totalScreened = patients.length;
    const totalSuspected = patients.filter(p => p.xray_result === 'Suspected TB Case').length;
    const totalDiagnosed = patients.filter(p => p.tb_diagnosed === 'Y').length;
    const totalPending = patients.filter(p => !p.referral_date && p.tb_diagnosed !== 'Y').length;

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
  }, [patients]);

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
          {/* Premium Metrics Bar with Glassmorphism */}
          <div className="relative rounded-2xl overflow-hidden">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            
            {/* Glassmorphism card */}
            <div className="relative bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_8px_40px_rgba(15,23,42,0.1)] p-5">
              <div className="flex flex-wrap items-center gap-5 md:gap-8">
                {/* Screened - Premium Card */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="relative group min-w-[200px] flex-1"
                  data-tour-id="kpi-screened"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative p-4 rounded-xl border border-blue-100/50 bg-gradient-to-br from-blue-50/50 to-transparent hover:from-blue-50/70 transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg">
                        <Activity className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-blue-600 font-bold">Screened</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[8px] text-blue-400/70 uppercase tracking-wider">Today</span>
                        <motion.span 
                          key={`today-screened-${metrics?.todayScreened}`}
                          initial={{ y: -10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          className="text-2xl font-black text-blue-700 tabular-nums"
                        >
                          {metrics?.todayScreened?.toLocaleString() || '0'}
                        </motion.span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[8px] text-blue-400/70 uppercase tracking-wider">Total</span>
                        <motion.span 
                          key={`total-screened-${metrics?.totalScreened}`}
                          initial={{ y: -10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.05 }}
                          className="text-lg font-bold text-blue-500/80 tabular-nums"
                        >
                          {metrics?.totalScreened?.toLocaleString() || '0'}
                        </motion.span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Suspected - Premium Card */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="relative group min-w-[200px] flex-1"
                  data-tour-id="kpi-flagged"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative p-4 rounded-xl border border-amber-100/50 bg-gradient-to-br from-amber-50/50 to-transparent hover:from-amber-50/70 transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center shadow-lg">
                        <Target className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-amber-600 font-bold">Suspected</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[8px] text-amber-400/70 uppercase tracking-wider">Today</span>
                        <motion.span 
                          key={`today-suspected-${metrics?.todaySuspected}`}
                          initial={{ y: -10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          className="text-2xl font-black text-amber-700 tabular-nums"
                        >
                          {metrics?.todaySuspected?.toLocaleString() || '0'}
                        </motion.span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[8px] text-amber-400/70 uppercase tracking-wider">Total</span>
                        <motion.span 
                          key={`total-suspected-${metrics?.totalSuspected}`}
                          initial={{ y: -10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.05 }}
                          className="text-lg font-bold text-amber-500/80 tabular-nums"
                        >
                          {metrics?.totalSuspected?.toLocaleString() || '0'}
                        </motion.span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Diagnosed - Premium Card */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="relative group min-w-[200px] flex-1"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative p-4 rounded-xl border border-emerald-100/50 bg-gradient-to-br from-emerald-50/50 to-transparent hover:from-emerald-50/70 transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center shadow-lg">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-emerald-600 font-bold">Diagnosed</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[8px] text-emerald-400/70 uppercase tracking-wider">Today</span>
                        <motion.span 
                          key={`today-diagnosed-${metrics?.todayDiagnosed}`}
                          initial={{ y: -10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          className="text-2xl font-black text-emerald-700 tabular-nums"
                        >
                          {metrics?.todayDiagnosed?.toLocaleString() || '0'}
                        </motion.span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[8px] text-emerald-400/70 uppercase tracking-wider">Total</span>
                        <motion.span 
                          key={`total-diagnosed-${metrics?.totalDiagnosed}`}
                          initial={{ y: -10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.05 }}
                          className="text-lg font-bold text-emerald-500/80 tabular-nums"
                        >
                          {metrics?.totalDiagnosed?.toLocaleString() || '0'}
                        </motion.span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Pending - Premium Card */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="relative group min-w-[200px] flex-1"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative p-4 rounded-xl border border-blue-100/50 bg-gradient-to-br from-blue-50/50 to-transparent hover:from-blue-50/70 transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-400 flex items-center justify-center shadow-lg">
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-blue-600 font-bold">Pending</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[8px] text-blue-400/70 uppercase tracking-wider">Today</span>
                        <motion.span 
                          key={`today-pending-${metrics?.todayPending}`}
                          initial={{ y: -10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          className="text-2xl font-black text-blue-700 tabular-nums"
                        >
                          {metrics?.todayPending?.toLocaleString() || '0'}
                        </motion.span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[8px] text-blue-400/70 uppercase tracking-wider">Total</span>
                        <motion.span 
                          key={`total-pending-${metrics?.totalPending}`}
                          initial={{ y: -10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.05 }}
                          className="text-lg font-bold text-blue-500/80 tabular-nums"
                        >
                          {metrics?.totalPending?.toLocaleString() || '0'}
                        </motion.span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <div className="h-14 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent hidden lg:block" />
                
                <div className="flex flex-wrap gap-2 items-center">
                  <Link
                    href="/dashboard/mande"
                    className="group relative px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[11px] font-semibold tracking-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <span className="relative flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5" />
                      M&E Tools
                    </span>
                  </Link>
                  <Link
                    href="/dashboard/vertex"
                    className="group relative px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[11px] font-semibold tracking-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <span className="relative flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5" />
                      Analytics
                    </span>
                  </Link>
                  <Link
                    href="/docs"
                    className="group relative px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold tracking-wide hover:border-slate-300 hover:bg-slate-50 transition-all"
                  >
                    <span className="relative flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
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
