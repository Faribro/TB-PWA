'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Settings, GitBranch, Copy,
  LogOut, Network, Map, ChevronLeft, LayoutDashboard, FileText, User, BookOpen, Calendar, FilePlus, AlertTriangle, ClipboardCheck, Clock3
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';

const MotionLink = motion.create(Link);
import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { useSessionScope } from '@/hooks/useSessionScope';
import { EntityDataSync } from '@/components/EntityDataSync';
import { SyncStatusFeed } from '@/components/SyncStatusFeed';
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

const TAB_CONFIG = [
  { id: 'home', path: '/dashboard/command-hub', icon: LayoutDashboard, label: 'Home', description: 'Unified Hub', roles: [Role.ADMIN, Role.PROGRAM_MANAGER, Role.STATE_PROGRAM_MANAGER, Role.ME_OFFICER, Role.PRISON_COORDINATOR], dataTourId: 'sidebar-home' },
  { id: 'vertex', path: '/dashboard/vertex', icon: Network, label: 'Vertex', description: 'Neural overview', roles: [Role.ADMIN, Role.PROGRAM_MANAGER, Role.STATE_PROGRAM_MANAGER, Role.ME_OFFICER], dataTourId: 'sidebar-vertex' },
  { id: 'mande', path: '/dashboard/mande', icon: Copy, label: 'M&E Tools', description: 'Monitoring & eval', roles: [Role.ADMIN, Role.PROGRAM_MANAGER, Role.STATE_PROGRAM_MANAGER, Role.ME_OFFICER], dataTourId: 'sidebar-mne' },
  { id: 'gis', path: '/dashboard/gis', icon: Map, label: 'GIS Map', description: 'Spatial intelligence', roles: [Role.ADMIN, Role.PROGRAM_MANAGER, Role.STATE_PROGRAM_MANAGER, Role.ME_OFFICER], dataTourId: 'sidebar-gis' },
  { id: 'knowledge', path: '/docs', icon: BookOpen, label: 'Knowledge', description: 'Docs & guides', roles: [Role.ADMIN, Role.PROGRAM_MANAGER, Role.STATE_PROGRAM_MANAGER, Role.ME_OFFICER, Role.PRISON_COORDINATOR], dataTourId: 'sidebar-docs' },
  { id: 'settings', path: '/dashboard/settings', icon: Settings, label: 'Settings', description: 'Account & sync', roles: [Role.ADMIN, Role.PROGRAM_MANAGER, Role.STATE_PROGRAM_MANAGER, Role.ME_OFFICER, Role.PRISON_COORDINATOR] },
];

const PC_TAB_CONFIG = [
  { id: 'my-submissions', path: '/dashboard/my-submissions', icon: Calendar, label: 'My Calendar', description: 'View submissions', roles: [Role.PRISON_COORDINATOR] },
  { id: 'submit-new', path: '/dashboard/submit-new', icon: FilePlus, label: 'New Screening', description: 'Submit record', roles: [Role.PRISON_COORDINATOR] },
  { id: 'knowledge', path: '/docs', icon: BookOpen, label: 'Knowledge', description: 'Docs & guides', roles: [Role.PRISON_COORDINATOR] },
  { id: 'settings', path: '/dashboard/settings', icon: Settings, label: 'Settings', description: 'Account', roles: [Role.PRISON_COORDINATOR] },
];

function NavItem({ tab, isActive, isCollapsed, delay, dataTourId }: {
  tab: typeof TAB_CONFIG[0];
  isActive: boolean;
  isCollapsed: boolean;
  delay: number;
  dataTourId?: string;
}) {
  const Icon = tab.icon;
  return (
    <MotionLink
      href={tab.path}
      data-tour-id={dataTourId}
      onClick={async () => {
        try {
          const s = await initSounds();
          s.navTab?.();
        } catch (e) {
          // Silent fail
        }
      }}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, ease: [0.22, 1, 0.36, 1], duration: 0.35 }}
      aria-current={isActive ? 'page' : undefined}
      title={isCollapsed ? tab.label : undefined}
      className={`
        group relative w-full flex items-center gap-4 rounded-2xl transition-all duration-300 cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900
        ${isCollapsed ? 'justify-center p-3' : 'px-3 py-3'}
        ${isActive
          ? 'bg-slate-900/[0.04] border border-slate-900/10 shadow-sm'
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-900/5'}
      `}
    >
        {isActive && (
          <motion.div
            layoutId="sidebar-active-pill"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-slate-900 rounded-full shadow-[0_0_12px_rgba(15,23,42,0.35)]"
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          />
        )}

        <div className={`
          relative flex-shrink-0 w-10 h-10 min-w-10 min-h-10 rounded-xl flex items-center justify-center transition-all duration-300
          ${isActive
            ? 'bg-slate-900 shadow-lg shadow-slate-900/20'
            : 'bg-slate-100 group-hover:bg-slate-200'}
        `} suppressHydrationWarning>
          <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'}`} suppressHydrationWarning />

          {isCollapsed && (
            <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-50 shadow-2xl translate-x-[-10px] group-hover:translate-x-0">
              {tab.label}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-slate-900" />
            </div>
          )}
        </div>

        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden min-w-0 text-left"
            >
              <p className={`text-sm font-bold truncate tracking-tight ${isActive ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>
                {tab.label}
              </p>
              <p className="text-[10px] text-slate-400 truncate font-semibold uppercase tracking-wider opacity-80">
                {tab.description}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
    </MotionLink>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [duplicatePairs] = useState<any[]>([]);
  const [eligibleCount] = useState(0);
  const [dataHealthScore] = useState(100);

  const scope = useSessionScope();
  const { data: globalPatients = [], isLoading } = useSWRAllPatients(scope);
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
      
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'TRIGGER_SYNC' }),
      });
      toast.success('Sync completed');
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  const clearHoverTimers = useCallback(() => {
    if (hoverOpenTimerRef.current) {
      clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  }, []);

  const handleSidebarToggle = useCallback(() => {
    clearHoverTimers();
    setSidebarOpen((v) => !v);
  }, [clearHoverTimers]);

  const handleSidebarMouseEnter = useCallback(() => {
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
    if (sidebarOpen) return;
    if (hoverOpenTimerRef.current) return;
    hoverOpenTimerRef.current = setTimeout(async () => {
      try {
        // Dynamic import to ensure function is available
        const { sounds: soundModule } = await import('@/lib/sound');
        if (soundModule && soundModule.drawerHoverOpen) {
          soundModule.drawerHoverOpen();
        }
      } catch (e) {
        console.error('[Sidebar] Sound error:', e);
      }
      setSidebarOpen(true);
      hoverOpenTimerRef.current = null;
    }, 140);
  }, [sidebarOpen]);

  const handleSidebarMouseLeave = useCallback(() => {
    if (hoverOpenTimerRef.current) {
      clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
    hoverCloseTimerRef.current = setTimeout(() => setSidebarOpen(false), 220);
  }, []);

  const handleSignOut = useCallback(() => signOut({ callbackUrl: '/login' }), []);

  // Get user role and normalize it (handles both 'PC' and 'Prison Coordinator')
  const rawRole = session?.user?.role || 'ME';
  const userRole = normalizeRole(rawRole) || Role.ME_OFFICER;
  
  // Use useMemo to prevent recalculation on every render
  const visibleTabs = useMemo(() => {
    console.log('[Sidebar] Computing visibleTabs for role:', userRole);
    if (userRole === Role.PRISON_COORDINATOR) {
      console.log('[Sidebar] Returning PC_TAB_CONFIG');
      return PC_TAB_CONFIG;
    }
    // Filter tabs based on normalized role
    const filtered = TAB_CONFIG.filter(t => t.roles.includes(userRole));
    console.log('[Sidebar] Filtered tabs:', filtered.map(t => t.label));
    return filtered;
  }, [userRole]);

  const quickSlotTab = useMemo(() => {
    if (userRole === Role.PRISON_COORDINATOR) {
      return {
        id: 'quick-slot',
        path: '/dashboard/my-submissions',
        icon: Clock3,
        label: 'Today Queue',
        description: 'Submissions due',
        roles: [Role.PRISON_COORDINATOR],
      };
    }
    if (userRole === Role.ME_OFFICER) {
      return {
        id: 'quick-slot',
        path: '/dashboard/mande',
        icon: ClipboardCheck,
        label: 'Pending Reviews',
        description: 'Clinical checks',
        roles: [Role.ME_OFFICER],
      };
    }
    return {
      id: 'quick-slot',
      path: '/dashboard/command-hub',
      icon: AlertTriangle,
      label: 'Critical Queue',
      description: 'Escalations & SLA',
      roles: [Role.ADMIN, Role.PROGRAM_MANAGER, Role.STATE_PROGRAM_MANAGER],
    };
  }, [userRole]);

  const sidebarTabs = useMemo(() => {
    const exists = visibleTabs.some((tab) => tab.path === quickSlotTab.path);
    return exists ? visibleTabs : [quickSlotTab, ...visibleTabs];
  }, [visibleTabs, quickSlotTab]);
  
  // Debug logging - runs AFTER visibleTabs is computed
  useEffect(() => {
    console.log('[Sidebar Debug] ===================================');
    console.log('[Sidebar Debug] Session:', session);
    console.log('[Sidebar Debug] Raw Role:', rawRole);
    console.log('[Sidebar Debug] Normalized Role:', userRole);
    console.log('[Sidebar Debug] Is Prison Coordinator?:', userRole === Role.PRISON_COORDINATOR);
    console.log('[Sidebar Debug] Role.PRISON_COORDINATOR value:', Role.PRISON_COORDINATOR);
    console.log('[Sidebar Debug] Visible Tabs Count:', visibleTabs.length);
    console.log('[Sidebar Debug] Tab Names:', visibleTabs.map(t => t.label));
    console.log('[Sidebar Debug] PC_TAB_CONFIG:', PC_TAB_CONFIG);
    console.log('[Sidebar Debug] ===================================');
  }, [rawRole, userRole, session, visibleTabs]);

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden selection:bg-slate-900/20">
      <EntityDataSync patients={memoizedPatients} />
      <SyncStatusFeed />

      <motion.aside
        layout
        animate={{ width: sidebarOpen ? 280 : 80 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        className="relative flex-shrink-0 border-r border-white/20 bg-white/80 backdrop-blur-2xl flex flex-col overflow-hidden z-[60] shadow-2xl"
      >
        <div className={`h-[72px] flex items-center border-b border-slate-100/50 flex-shrink-0 ${sidebarOpen ? 'px-6 justify-between' : 'justify-center'}`}>
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
                  height={68}
                  style={{ width: 'auto', height: '68px' }}
                  className="object-contain flex-shrink-0"
                  priority
                  unoptimized
                  suppressHydrationWarning
                />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(0,0,0,0.03)' }}
            whileTap={{ scale: 0.9 }}
            onClick={handleSidebarToggle}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 transition-colors flex-shrink-0 group"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <motion.div
              animate={{ rotate: sidebarOpen ? 0 : 180 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              suppressHydrationWarning
            >
              <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" suppressHydrationWarning />
            </motion.div>
          </motion.button>
        </div>

        <nav aria-label="Main navigation" className="flex-1 px-4 py-8 space-y-2 overflow-y-auto hide-scrollbar">
          {sidebarTabs.map((tab, idx) => {
            const isActive = pathname === tab.path;
            
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

        {session && (
          <div className={`flex-shrink-0 border-t border-slate-100/50 p-4 ${!sidebarOpen ? 'pb-6' : ''}`}>
            <div className={`mb-3 rounded-2xl border border-slate-200/70 bg-white/80 px-3 py-3 shadow-[0_8px_25px_rgba(15,23,42,0.06)] ${!sidebarOpen ? 'border-transparent bg-transparent shadow-none p-0 mb-0' : ''}`}>
            <div className={`flex items-center gap-4 ${!sidebarOpen ? 'w-full flex-col justify-center items-center gap-3' : ''}`}>
              <div className="relative flex-shrink-0 w-10 h-10 min-w-10 min-h-10 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg text-white text-sm font-bold border border-white/40">
                {session.user.name?.charAt(0)}
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-md" />
              </div>

              <AnimatePresence initial={false}>
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex-1 min-w-0 overflow-hidden"
                  >
                    <p className="text-sm font-bold text-slate-900 truncate tracking-tight">{session.user.name}</p>
                    <p className="text-[10px] text-slate-500 truncate uppercase tracking-widest font-bold opacity-70">
                      {session.user.role} · {session.user.state}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {sidebarOpen ? (
              <motion.button
                whileHover={{ y: -1 }}
                onClick={handleSignOut}
                className="mt-3 w-full flex items-center justify-between gap-3 px-3 py-2.5 text-xs font-bold text-slate-600 bg-slate-50/70 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-all duration-300 border border-slate-200/70 hover:border-rose-200 group"
                suppressHydrationWarning
              >
                <span className="flex items-center gap-2.5" suppressHydrationWarning>
                  <LogOut className="w-4 h-4 transition-transform group-hover:rotate-12 group-hover:text-rose-600" suppressHydrationWarning />
                  Sign out securely
                </span>
              </motion.button>
            ) : (
              <div className="mt-1 flex w-full flex-col items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={handleSignOut}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm"
                  aria-label="Sign out"
                  suppressHydrationWarning
                >
                  <LogOut className="w-4 h-4" suppressHydrationWarning />
                </motion.button>
              </div>
            )}
            </div>
          </div>
        )}
      </motion.aside>

      <main className="flex-1 h-full overflow-y-auto relative z-10 flex flex-col">
        <DashboardErrorBoundary>
          <motion.div
            key={pathname}
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
