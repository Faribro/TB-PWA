'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import {
  GitBranch, Copy,
  LogOut, Network, Map, ChevronLeft, LayoutDashboard, FileText, User, BookOpen, Calendar, FilePlus, AlertTriangle, ClipboardCheck, Clock3,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { useSessionScope } from '@/hooks/useSessionScope';
import { EntityDataSync } from '@/components/EntityDataSync';
import { SyncStatusFeed } from '@/components/SyncStatusFeed';
import { PatientRealtimeNotification } from '@/components/PatientRealtimeNotification';
import { useEntityStore } from '@/stores/useEntityStore';
// Sound module loaded dynamically to avoid chunk errors
let sounds: any = null;
let soundInitPromise: Promise<any> | null = null;

async function initSounds() {
  if (sounds) return sounds;
  if (soundInitPromise) return soundInitPromise;
  
  soundInitPromise = import('@/lib/sound').then(mod => {
    sounds = mod.sounds || {};
    return sounds;
  }).catch(() => {
    sounds = {};
    return sounds;
  });
  
  return soundInitPromise;
}

// Pre-init on module load
if (typeof window !== 'undefined') {
  initSounds();
}

import { DashboardErrorBoundary } from '@/components/DashboardErrorBoundary';
import { Role, normalizeRole } from '@/lib/constants/roles';

// ─── Neon color palette per nav item ───────────────────────────────────────
// Each entry: { neon glow color, icon bg when active, text accent }
const NAV_NEON: Record<string, {
  glow: string;
  ring: string;
  iconBg: string;
  textColor: string;
  pulseColor: string;
}> = {
  home:           { glow: '0 0 18px 4px rgba(99,102,241,0.7), 0 0 40px 8px rgba(99,102,241,0.35), 0 0 80px 16px rgba(99,102,241,0.15)', ring: 'rgba(99,102,241,0.5)', iconBg: 'linear-gradient(135deg,#4338ca,#6366f1)', textColor: '#6366f1', pulseColor: 'rgba(99,102,241,0.25)' },
  vertex:         { glow: '0 0 18px 4px rgba(168,85,247,0.7), 0 0 40px 8px rgba(168,85,247,0.35), 0 0 80px 16px rgba(168,85,247,0.15)', ring: 'rgba(168,85,247,0.5)', iconBg: 'linear-gradient(135deg,#7e22ce,#a855f7)', textColor: '#a855f7', pulseColor: 'rgba(168,85,247,0.25)' },
  mande:          { glow: '0 0 18px 4px rgba(6,182,212,0.7), 0 0 40px 8px rgba(6,182,212,0.35), 0 0 80px 16px rgba(6,182,212,0.15)', ring: 'rgba(6,182,212,0.5)', iconBg: 'linear-gradient(135deg,#0e7490,#06b6d4)', textColor: '#06b6d4', pulseColor: 'rgba(6,182,212,0.25)' },
  gis:            { glow: '0 0 18px 4px rgba(16,185,129,0.7), 0 0 40px 8px rgba(16,185,129,0.35), 0 0 80px 16px rgba(16,185,129,0.15)', ring: 'rgba(16,185,129,0.5)', iconBg: 'linear-gradient(135deg,#065f46,#10b981)', textColor: '#10b981', pulseColor: 'rgba(16,185,129,0.25)' },
  'my-submissions': { glow: '0 0 18px 4px rgba(251,146,60,0.7), 0 0 40px 8px rgba(251,146,60,0.35), 0 0 80px 16px rgba(251,146,60,0.15)', ring: 'rgba(251,146,60,0.5)', iconBg: 'linear-gradient(135deg,#c2410c,#fb923c)', textColor: '#fb923c', pulseColor: 'rgba(251,146,60,0.25)' },
  'submit-new':   { glow: '0 0 18px 4px rgba(244,63,94,0.7), 0 0 40px 8px rgba(244,63,94,0.35), 0 0 80px 16px rgba(244,63,94,0.15)', ring: 'rgba(244,63,94,0.5)', iconBg: 'linear-gradient(135deg,#be123c,#f43f5e)', textColor: '#f43f5e', pulseColor: 'rgba(244,63,94,0.25)' },
  'quick-slot':   { glow: '0 0 18px 4px rgba(14,165,233,0.7), 0 0 40px 8px rgba(14,165,233,0.35), 0 0 80px 16px rgba(14,165,233,0.15)', ring: 'rgba(14,165,233,0.5)', iconBg: 'linear-gradient(135deg,#0369a1,#0ea5e9)', textColor: '#0ea5e9', pulseColor: 'rgba(14,165,233,0.25)' },
};

const DEFAULT_NEON = { glow: '0 0 18px 4px rgba(99,102,241,0.7), 0 0 40px 8px rgba(99,102,241,0.35)', ring: 'rgba(99,102,241,0.5)', iconBg: 'linear-gradient(135deg,#4338ca,#6366f1)', textColor: '#6366f1', pulseColor: 'rgba(99,102,241,0.25)' };

// ─── 3D Gear SVG (settings icon) ───────────────────────────────────────────
function GearIcon3D({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="gearGrad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="white" stopOpacity="0.6"/>
          <stop offset="100%" stopColor={color} stopOpacity="1"/>
        </radialGradient>
        <filter id="gearGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.8" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path
        filter="url(#gearGlow)"
        fill="url(#gearGrad)"
        d="M12 15.5A3.5 3.5 0 018.5 12 3.5 3.5 0 0112 8.5a3.5 3.5 0 013.5 3.5 3.5 3.5 0 01-3.5 3.5m7.43-2.92c.04-.36.07-.73.07-1.08s-.03-.73-.07-1.08l2.37-1.84a.56.56 0 00.13-.71l-2.25-3.89a.55.55 0 00-.68-.24l-2.8 1.13a8.06 8.06 0 00-1.86-1.08l-.42-2.98A.547.547 0 0013.5 1h-4.5a.547.547 0 00-.54.46l-.42 2.98c-.68.28-1.3.67-1.86 1.08L3.38 4.39a.55.55 0 00-.68.24L.45 8.52a.549.549 0 00.13.71l2.37 1.84C2.91 11.45 2.88 11.73 2.88 12s.03.73.07 1.08l-2.37 1.84a.56.56 0 00-.13.71l2.25 3.89c.14.24.42.32.68.24l2.8-1.13c.56.41 1.18.8 1.86 1.08l.42 2.98c.07.28.28.46.54.46h4.5c.26 0 .47-.18.54-.46l.42-2.98c.68-.28 1.3-.67 1.86-1.08l2.8 1.13c.26.08.54 0 .68-.24l2.25-3.89a.55.55 0 00-.13-.71l-2.37-1.84z"
      />
    </svg>
  );
}

// ─── Tab config ──────────────────────────────────────────────────────────────
const TAB_CONFIG = [
  { id: 'home',   path: '/dashboard/command-hub', icon: LayoutDashboard, label: 'Home',     description: 'Unified Hub',          roles: [Role.ADMIN, Role.PROGRAM_MANAGER, Role.STATE_PROGRAM_MANAGER, Role.ME_OFFICER, Role.PRISON_COORDINATOR], dataTourId: 'sidebar-home' },
  { id: 'vertex', path: '/dashboard/vertex',      icon: Network,          label: 'Vertex',   description: 'Neural overview',      roles: [Role.ADMIN, Role.PROGRAM_MANAGER, Role.STATE_PROGRAM_MANAGER, Role.ME_OFFICER], dataTourId: 'sidebar-vertex' },
  { id: 'mande',  path: '/dashboard/mande',       icon: BarChart3,        label: 'M&E Tools',description: 'Monitoring & eval',    roles: [Role.ADMIN, Role.PROGRAM_MANAGER, Role.STATE_PROGRAM_MANAGER, Role.ME_OFFICER], dataTourId: 'sidebar-mne' },
  { id: 'gis',    path: '/dashboard/gis',         icon: Map,              label: 'GIS Map',  description: 'Spatial intelligence', roles: [Role.ADMIN, Role.PROGRAM_MANAGER, Role.STATE_PROGRAM_MANAGER, Role.ME_OFFICER], dataTourId: 'sidebar-gis' },
];

const PC_TAB_CONFIG = [
  { id: 'my-submissions', path: '/dashboard/my-submissions', icon: Calendar, label: 'My Calendar',   description: 'View submissions', roles: [Role.PRISON_COORDINATOR], dataTourId: 'sidebar-my-submissions' },
  { id: 'submit-new',     path: '/dashboard/submit-new',     icon: FilePlus,  label: 'New Screening', description: 'Submit record',    roles: [Role.PRISON_COORDINATOR], dataTourId: 'sidebar-submit-new' },
];

// ─── NavItem ─────────────────────────────────────────────────────────────────
function NavItem({ tab, isActive, isCollapsed, delay, dataTourId }: {
  tab: typeof TAB_CONFIG[0];
  isActive: boolean;
  isCollapsed: boolean;
  delay: number;
  dataTourId?: string;
}) {
  const Icon = tab.icon;
  const neon = NAV_NEON[tab.id] ?? DEFAULT_NEON;

  return (
    <Link
      href={tab.path}
      data-tour-id={dataTourId}
      aria-current={isActive ? 'page' : undefined}
      title={isCollapsed ? tab.label : undefined}
      className={`
        block group relative w-full rounded-2xl transition-all duration-300
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        ${isCollapsed ? 'p-3' : 'px-3 py-3'}
        ${isActive ? '' : 'hover:bg-slate-50/80'}
      `}
    >
      <div className="flex items-center gap-3.5 relative z-10">
        {/* Icon container */}
        <motion.div
          animate={isActive ? {
            scale: 1.05,
          } : {
            scale: 1,
          }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative flex-shrink-0 w-10 h-10 min-w-10 min-h-10 rounded-xl flex items-center justify-center transition-all duration-300"
          suppressHydrationWarning
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 bg-slate-100/80 group-hover:bg-slate-100">
            <Icon
              className="w-[22px] h-[22px] transition-all duration-300"
              style={{ color: isActive ? neon.textColor : '#94a3b8' }}
              suppressHydrationWarning
            />
          </div>

          {/* Tooltip in collapsed mode */}
          {isCollapsed && (
            <div
              className="absolute left-full ml-3 px-3 py-1.5 text-white text-[11px] font-bold uppercase tracking-widest rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 shadow-2xl translate-x-[-6px] group-hover:translate-x-0"
              style={{ background: neon.iconBg, boxShadow: neon.glow }}
            >
              {tab.label}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent" style={{ borderRightColor: neon.textColor }} />
            </div>
          )}
        </motion.div>

        {/* Label text */}
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden min-w-0 text-left"
            >
              <p
                className="text-[13px] font-bold truncate tracking-tight transition-colors duration-300"
                style={{ color: isActive ? neon.textColor : '#475569' }}
              >
                {tab.label}
              </p>
              <p className="text-[10px] text-slate-400 truncate font-semibold uppercase tracking-wider opacity-70 mt-0.5">
                {tab.description}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Link>
  );
}

// ─── Settings gear link with 3D rotating gear ────────────────────────────────
function SettingsLink({ isCollapsed, isActive }: { isCollapsed: boolean; isActive: boolean }) {
  const [hovered, setHovered] = useState(false);
  const settingsNeon = {
    glow: '0 0 16px 4px rgba(14,165,233,0.65), 0 0 36px 8px rgba(14,165,233,0.3), 0 0 70px 14px rgba(14,165,233,0.12)',
    ring: 'rgba(14,165,233,0.5)',
    iconBg: 'linear-gradient(135deg,#0369a1,#0ea5e9)',
    textColor: '#0ea5e9',
    pulseColor: 'rgba(14,165,233,0.15)',
  };

  return (
    <Link
      href="/dashboard/settings"
      className={`flex items-center gap-3.5 group relative w-full rounded-2xl transition-all duration-300
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50
        ${isCollapsed ? 'justify-center p-3' : 'px-3 py-3'}
        ${isActive ? '' : 'hover:bg-slate-50/80'}
      `}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 3D Gear icon */}
      <motion.div
        animate={{
          rotate: hovered || isActive ? 180 : 0,
          scale: isActive ? 1.05 : 1,
        }}
        transition={{
          rotate: { duration: hovered ? 0.6 : 0.4, ease: 'easeInOut' },
          scale: { duration: 0.3 },
        }}
        className="relative flex-shrink-0 w-10 h-10 min-w-10 rounded-xl flex items-center justify-center"
        suppressHydrationWarning
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 bg-slate-100/80 group-hover:bg-slate-100">
          <GearIcon3D
            size={22}
            color={isActive ? settingsNeon.textColor : (hovered ? settingsNeon.textColor : '#94a3b8')}
          />
        </div>

        {/* Tooltip */}
        {isCollapsed && (
          <div
            className="absolute left-full ml-3 px-3 py-1.5 text-white text-[11px] font-bold uppercase tracking-widest rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 shadow-2xl translate-x-[-6px] group-hover:translate-x-0"
            style={{ background: settingsNeon.iconBg, boxShadow: settingsNeon.glow }}
          >
            Settings
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent" style={{ borderRightColor: settingsNeon.textColor }} />
          </div>
        )}
      </motion.div>

      {/* Label */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden min-w-0 text-left flex-1 relative z-10"
          >
            <p
              className="text-[13px] font-bold truncate tracking-tight transition-colors duration-300"
              style={{ color: isActive ? settingsNeon.textColor : '#475569' }}
            >
              Settings
            </p>
            <p className="text-[10px] text-slate-400 truncate font-semibold uppercase tracking-wider opacity-70 mt-0.5">
              Account & Prefs
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </Link>
  );
}

// ─── Main layout ─────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.image) {
      setAvatarUrl(session.user.image);
    } else if (session?.user?.email) {
      const email = session.user.email.trim().toLowerCase();
      const msgUint8 = new TextEncoder().encode(email);
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        window.crypto.subtle.digest('SHA-256', msgUint8).then(hashBuffer => {
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          setAvatarUrl(`https://www.gravatar.com/avatar/${hashHex}?d=identicon`);
        }).catch(err => {
          console.error('Failed to generate gravatar hash:', err);
          setAvatarUrl(null);
        });
      } else {
        setAvatarUrl(null);
      }
    } else {
      setAvatarUrl(null);
    }
  }, [session?.user?.image, session?.user?.email]);

  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [duplicatePairs] = useState<any[]>([]);
  const [eligibleCount] = useState(0);
  const [dataHealthScore] = useState(100);

  const scope = useSessionScope();
  const { patients: globalPatients = [], isLoading } = useSWRAllPatients(scope);
  const memoizedPatients = useMemo(() => globalPatients ?? [], [globalPatients]);

  const [isSyncing, setIsSyncing] = useState(false);
  const hoverOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleManualSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    toast.info('Scout initiated. Checking Drive folders...');
    try {
      const url = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
      if (!url) throw new Error('Apps Script URL not configured');
      await fetch(url, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'TRIGGER_SYNC' }) });
      toast.success('Sync completed');
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  const clearHoverTimers = useCallback(() => {
    if (hoverOpenTimerRef.current) { clearTimeout(hoverOpenTimerRef.current); hoverOpenTimerRef.current = null; }
    if (hoverCloseTimerRef.current) { clearTimeout(hoverCloseTimerRef.current); hoverCloseTimerRef.current = null; }
  }, []);

  const handleSidebarToggle = useCallback(() => {
    clearHoverTimers();
    setSidebarOpen((v) => !v);
  }, [clearHoverTimers]);

  const handleSidebarMouseEnter = useCallback(() => {
    if (hoverCloseTimerRef.current) { clearTimeout(hoverCloseTimerRef.current); hoverCloseTimerRef.current = null; }
    if (sidebarOpen) return;
    if (hoverOpenTimerRef.current) return;
    hoverOpenTimerRef.current = setTimeout(async () => {
      try {
        const { sounds: soundModule } = await import('@/lib/sound');
        if (soundModule?.drawerHoverOpen) soundModule.drawerHoverOpen();
      } catch (e) {}
      setSidebarOpen(true);
      hoverOpenTimerRef.current = null;
    }, 140);
  }, [sidebarOpen]);

  const handleSidebarMouseLeave = useCallback(() => {
    if (hoverOpenTimerRef.current) { clearTimeout(hoverOpenTimerRef.current); hoverOpenTimerRef.current = null; }
    hoverCloseTimerRef.current = setTimeout(() => setSidebarOpen(false), 220);
  }, []);

  const handleSignOut = useCallback(() => signOut({ callbackUrl: '/login' }), []);

  const rawRole = session?.user?.role || 'ME';
  const userRole = normalizeRole(rawRole) || Role.ME_OFFICER;

  const visibleTabs = useMemo(() => {
    if (userRole === Role.PRISON_COORDINATOR) return PC_TAB_CONFIG;
    return TAB_CONFIG.filter(t => t.roles.includes(userRole));
  }, [userRole]);

  const quickSlotTab = useMemo(() => {
    if (userRole === Role.PRISON_COORDINATOR) return { id: 'quick-slot', path: '/dashboard/my-submissions', icon: Clock3, label: 'Today Queue', description: 'Submissions due', roles: [Role.PRISON_COORDINATOR], dataTourId: 'sidebar-quick-slot' };
    if (userRole === Role.ME_OFFICER) return { id: 'quick-slot', path: '/dashboard/mande', icon: ClipboardCheck, label: 'Pending Reviews', description: 'Clinical checks', roles: [Role.ME_OFFICER], dataTourId: 'sidebar-quick-slot' };
    return { id: 'quick-slot', path: '/dashboard/command-hub', icon: AlertTriangle, label: 'Critical Queue', description: 'Escalations & SLA', roles: [Role.ADMIN, Role.PROGRAM_MANAGER, Role.STATE_PROGRAM_MANAGER], dataTourId: 'sidebar-quick-slot' };
  }, [userRole]);

  const sidebarTabs = useMemo(() => {
    const exists = visibleTabs.some((tab) => tab.path === quickSlotTab.path);
    return exists ? visibleTabs : [quickSlotTab, ...visibleTabs];
  }, [visibleTabs, quickSlotTab]);

  const isSettingsActive = pathname === '/dashboard/settings';

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden selection:bg-indigo-500/20">
      <EntityDataSync patients={memoizedPatients} />
      <SyncStatusFeed />
      <PatientRealtimeNotification />

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: sidebarOpen ? 272 : 76 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        className="relative flex-shrink-0 flex flex-col overflow-hidden z-[60]"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.97) 100%)',
          borderRight: '1px solid rgba(226,232,240,0.8)',
          backdropFilter: 'blur(24px)',
          boxShadow: sidebarOpen
            ? '4px 0 40px rgba(15,23,42,0.08), 1px 0 0 rgba(255,255,255,0.8) inset'
            : '2px 0 20px rgba(15,23,42,0.04), 1px 0 0 rgba(255,255,255,0.8) inset',
        }}
      >
        {/* ── Logo / Toggle header ──────────────────────────────────────── */}
        <div className={`h-[68px] flex items-center border-b border-slate-100/60 flex-shrink-0 ${sidebarOpen ? 'px-5 justify-between' : 'justify-center'}`}>
          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2.5 overflow-hidden"
              >
                <Image
                  src="/Images/Logo/AllianceIndia-Logo.png"
                  alt="Alliance India"
                  width={200}
                  height={64}
                  style={{ width: 'auto', height: '64px' }}
                  className="object-contain flex-shrink-0"
                  priority
                  unoptimized
                  suppressHydrationWarning
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle chevron */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleSidebarToggle}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors flex-shrink-0 group bg-slate-50 hover:bg-slate-100 border border-slate-200/60"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <motion.div
              animate={{ rotate: sidebarOpen ? 0 : 180 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              suppressHydrationWarning
            >
              <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" suppressHydrationWarning />
            </motion.div>
          </motion.button>
        </div>

        {/* ── Nav items ─────────────────────────────────────────────────── */}
        <nav aria-label="Main navigation" className="flex-1 px-3 py-5 space-y-1 overflow-y-auto hide-scrollbar">
          {sidebarTabs.map((tab, idx) => {
            const isActive = pathname === tab.path || pathname.startsWith(tab.path + '/');
            return (
              <NavItem
                key={tab.id}
                tab={tab}
                isActive={isActive}
                isCollapsed={!sidebarOpen}
                delay={idx * 0.05}
                dataTourId={(tab as any).dataTourId}
              />
            );
          })}
        </nav>

        {/* ── Footer: Settings + User card ─────────────────────────────── */}
        {session && (
          <div className={`flex-shrink-0 border-t border-slate-100/60 px-3 py-4 space-y-3`}>

            {/* Settings — no border/box, just 3D gear */}
            <SettingsLink isCollapsed={!sidebarOpen} isActive={isSettingsActive} />

            {/* User card */}
            {/* User card */}
            <div
              className={`rounded-2xl transition-all duration-300 ${
                sidebarOpen
                  ? 'bg-slate-50/50 border border-slate-200/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.95),_0_2px_8px_rgba(15,23,42,0.03)] px-3 py-3'
                  : 'bg-transparent px-0 py-0'
              }`}
            >
              <div className={`flex items-center gap-3 ${!sidebarOpen ? 'flex-col' : ''}`}>
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {avatarUrl ? (
                    <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md border border-slate-200/80">
                      <img
                        src={avatarUrl}
                        alt={session.user.name ?? 'User Avatar'}
                        width={36}
                        height={36}
                        className="w-full h-full object-cover"
                        onError={() => setAvatarUrl(null)}
                      />
                    </div>
                  ) : (
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-md border border-slate-200/80"
                      style={{ background: 'linear-gradient(135deg,#1e293b,#334155)' }}
                    >
                      {session.user.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                </div>

                <AnimatePresence initial={false}>
                  {sidebarOpen && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="flex-1 min-w-0 overflow-hidden"
                    >
                      <p className="text-[13px] font-bold text-slate-800 truncate tracking-tight leading-tight">{session.user.name}</p>
                      <p className="text-[10px] text-slate-400 truncate uppercase tracking-widest font-semibold mt-0.5 opacity-80">
                        {session.user.role} · {session.user.state}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Sign out */}
              {sidebarOpen ? (
                <motion.button
                  whileHover={{ y: -1 }}
                  onClick={handleSignOut}
                  className="mt-3 w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white/40 hover:bg-rose-500/[0.04] hover:text-rose-600 rounded-xl transition-all duration-200 border border-slate-200/60 hover:border-rose-200/60 group"
                  suppressHydrationWarning
                >
                  <LogOut className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:text-rose-500" suppressHydrationWarning />
                  Sign out securely
                </motion.button>
              ) : (
                <div className="mt-2 flex justify-center">
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={handleSignOut}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/40 border border-slate-200/60 text-slate-500 hover:text-rose-600 hover:border-rose-200/60 hover:bg-rose-500/[0.04] transition-all"
                    aria-label="Sign out"
                    suppressHydrationWarning
                  >
                    <LogOut className="w-3.5 h-3.5" suppressHydrationWarning />
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 h-full overflow-y-auto relative z-10 flex flex-col">
        <DashboardErrorBoundary>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex-1 h-full w-full relative"
          >
            {children}
          </motion.div>
        </DashboardErrorBoundary>
      </main>
    </div>
  );
}
