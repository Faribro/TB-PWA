'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
  User, RefreshCw, HardDrive, Bell, CheckCircle2,
  Wifi, WifiOff, Zap, Shield, Activity, Clock,
  ChevronRight, Sparkles
} from 'lucide-react';
import { useSWRConfig } from 'swr';
import { useSession } from 'next-auth/react';

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type SubTab = 'profile' | 'sync';

interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  icon: React.ElementType;
  color: string;
}

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const NOTIFICATIONS: NotificationPreference[] = [
  {
    id: 'daily-digest',
    label: 'Daily Digest',
    description: 'A daily summary of patient updates delivered at 8 AM',
    enabled: true,
    icon: Clock,
    color: 'from-violet-500 to-purple-600',
  },
  {
    id: 'sla-alerts',
    label: 'SLA Breach Alerts',
    description: 'Instant alert when SLA thresholds are exceeded',
    enabled: true,
    icon: Zap,
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'duplicate-alerts',
    label: 'Duplicate Detection',
    description: 'Flag when potential duplicate records are found',
    enabled: false,
    icon: Shield,
    color: 'from-sky-500 to-blue-600',
  },
  {
    id: 'sync-errors',
    label: 'Sync Errors',
    description: 'Notify on data synchronization failures',
    enabled: true,
    icon: Activity,
    color: 'from-rose-500 to-red-600',
  },
];

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */

/** Magnetic button — cursor pulls the element slightly toward the pointer */
function MagneticButton({
  children,
  className,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 20 });
  const sy = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current || disabled) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * 0.25);
    y.set((e.clientY - cy) * 0.25);
  };

  return (
    <motion.button
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </motion.button>
  );
}

/** Premium toggle with spring physics + glow */
function PremiumToggle({
  enabled,
  onToggle,
  color = 'from-emerald-400 to-teal-500',
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  color?: string;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      aria-label={`Toggle ${label}`}
      onClick={onToggle}
      className="relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full"
    >
      {/* Glow behind the track */}
      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 rounded-full bg-gradient-to-r ${color} blur-md opacity-50`}
          />
        )}
      </AnimatePresence>

      <div
        className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
          enabled
            ? `bg-gradient-to-r ${color} shadow-lg`
            : 'bg-slate-200 dark:bg-slate-700'
        }`}
      >
        <motion.div
          className="absolute top-[3px] left-[3px] w-[22px] h-[22px] bg-white rounded-full shadow-md flex items-center justify-center"
          animate={{ x: enabled ? 28 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          {/* Tiny inner dot animates on state change */}
          <motion.div
            className={`w-2 h-2 rounded-full bg-gradient-to-r ${color}`}
            animate={{ scale: enabled ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 25 }}
          />
        </motion.div>
      </div>
    </button>
  );
}

/** Tilt card — perspective tilt on hover using mouse position */
function TiltCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const srx = useSpring(rotateX, { stiffness: 200, damping: 20 });
  const sry = useSpring(rotateY, { stiffness: 200, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 6);   // max 6deg tilt
    rotateX.set(-py * 6);
  };

  return (
    <motion.div
      ref={ref}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { rotateX.set(0); rotateY.set(0); }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   PROFILE PANEL
───────────────────────────────────────────── */
function ProfilePanel({
  session,
  notifications,
  onToggle,
}: {
  session: any;
  notifications: NotificationPreference[];
  onToggle: (id: string) => void;
}) {
  const enabledCount = notifications.filter((n) => n.enabled).length;
  const allEnabled = enabledCount === notifications.length;

  return (
    <div className="space-y-5">
      {/* ── BENTO ROW 1: User identity card + stats ── */}
      <div className="grid grid-cols-3 gap-5">

        {/* Identity — spans 2 cols */}
        <TiltCard className="col-span-2 relative overflow-hidden rounded-3xl bg-white border border-slate-200/60 shadow-[0_8px_40px_rgb(0,0,0,0.06)] p-8">
          {/* Noise texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.025] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }}
          />
          {/* Gradient orb */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-blue-400/20 to-violet-400/20 rounded-full blur-3xl" />

          <div className="relative flex items-center gap-6">
            {/* Avatar with ring animation */}
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: 'conic-gradient(from 0deg, #3b82f6, #8b5cf6, #06b6d4, #3b82f6)',
                  padding: '2px',
                }}
              />
              <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl m-[2px]">
                <User className="w-9 h-9 text-white" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-900 truncate">
                  {session?.user?.name || 'Program Manager'}
                </h2>
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              </div>
              <p className="text-slate-500 text-sm mt-0.5">{session?.user?.role || 'State Program Manager'}</p>
              <p className="text-slate-400 text-xs mt-1 font-mono">{session?.user?.email || 'manager@ntep.gov.in'}</p>

              <div className="flex flex-wrap gap-2 mt-3">
                {(session?.user?.state ? [session.user.state] : ['Maharashtra', 'Karnataka']).map((r: string) => (
                  <motion.span
                    key={r}
                    whileHover={{ scale: 1.05, y: -1 }}
                    className="px-3 py-1 bg-gradient-to-r from-blue-50 to-violet-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200/60"
                  >
                    {r}
                  </motion.span>
                ))}
              </div>
            </div>
          </div>
        </TiltCard>

        {/* Notification summary stat card */}
        <TiltCard className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-[0_8px_40px_rgb(0,0,0,0.15)] flex flex-col justify-between">
          <div className="absolute -bottom-8 -right-8 w-36 h-36 bg-gradient-to-br from-violet-500/30 to-blue-500/20 rounded-full blur-2xl" />
          <div>
            <Bell className="w-5 h-5 text-slate-400 mb-3" />
            <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Active Alerts</p>
            <motion.p
              key={enabledCount}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-5xl font-black text-white mt-1"
            >
              {enabledCount}
            </motion.p>
            <p className="text-slate-500 text-xs mt-1">of {notifications.length} enabled</p>
          </div>
          {/* Mini bar chart */}
          <div className="flex items-end gap-1 h-8 mt-4">
            {notifications.map((n) => (
              <motion.div
                key={n.id}
                animate={{ height: n.enabled ? '100%' : '30%', opacity: n.enabled ? 1 : 0.3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="flex-1 bg-gradient-to-t from-violet-500 to-blue-400 rounded-sm"
              />
            ))}
          </div>
        </TiltCard>
      </div>

      {/* ── BENTO ROW 2: Notification preferences ── */}
      <div className="rounded-3xl bg-white border border-slate-200/60 shadow-[0_8px_40px_rgb(0,0,0,0.06)] overflow-hidden">
        {/* Card header with master toggle */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center">
              <Bell className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Notification Preferences</h3>
              <p className="text-xs text-slate-400">{enabledCount} of {notifications.length} active</p>
            </div>
          </div>

          {/* Master toggle */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            All
            <PremiumToggle
              enabled={allEnabled}
              label="all notifications"
              color="from-slate-700 to-slate-900"
              onToggle={() => {
                notifications.forEach((n) => {
                  if (n.enabled === allEnabled) onToggle(n.id);
                });
              }}
            />
          </div>
        </div>

        {/* Grid of notification cards */}
        <div className="grid grid-cols-2 gap-px bg-slate-100">
          {notifications.map((notif, i) => {
            const Icon = notif.icon;
            return (
              <motion.div
                key={notif.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`relative bg-white p-6 group cursor-pointer transition-colors hover:bg-slate-50/80 ${
                  !notif.enabled ? 'opacity-50' : ''
                }`}
                onClick={() => onToggle(notif.id)}
              >
                {/* Colored top-edge accent */}
                <motion.div
                  animate={{ scaleX: notif.enabled ? 1 : 0 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                  className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${notif.color} origin-left`}
                />

                <div className="flex items-start justify-between">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${notif.color} flex items-center justify-center shadow-md mb-3`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <PremiumToggle
                    enabled={notif.enabled}
                    onToggle={() => onToggle(notif.id)}
                    color={notif.color}
                    label={notif.label}
                  />
                </div>
                <p className="font-semibold text-slate-900 text-sm">{notif.label}</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{notif.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SYNC PANEL
───────────────────────────────────────────── */
function SyncPanel({
  isSyncing,
  offlineMode,
  onSync,
  onToggleOffline,
}: {
  isSyncing: boolean;
  offlineMode: boolean;
  onSync: () => void;
  onToggleOffline: () => void;
}) {
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    if (isSyncing) {
      setSyncProgress(0);
      const interval = setInterval(() => {
        setSyncProgress((p) => {
          if (p >= 92) { clearInterval(interval); return 92; }
          return p + Math.random() * 18;
        });
      }, 200);
      return () => clearInterval(interval);
    } else {
      setSyncProgress(isSyncing ? 0 : 100);
    }
  }, [isSyncing]);

  return (
    <div className="space-y-5">

      {/* ── BENTO ROW 1: Status + Offline ── */}
      <div className="grid grid-cols-2 gap-5">

        {/* Cache health */}
        <TiltCard className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/60 shadow-[0_8px_40px_rgb(0,0,0,0.06)] p-7">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-400/10 rounded-full blur-3xl" />
          <div className="flex items-center justify-between mb-4">
            <HardDrive className="w-5 h-5 text-slate-400" />
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-200">
              <motion.div
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-1.5 h-1.5 bg-emerald-500 rounded-full"
              />
              <span className="text-xs font-semibold text-emerald-700">Healthy</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">Cache Status</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">Synchronized</p>
          <p className="text-xs text-slate-400 mt-2">Last synced <span className="text-slate-600 font-medium">2 min ago</span></p>
        </TiltCard>

        {/* Offline mode */}
        <TiltCard
          className={`relative overflow-hidden rounded-3xl border shadow-[0_8px_40px_rgb(0,0,0,0.06)] p-7 cursor-pointer transition-colors duration-300 ${
            offlineMode
              ? 'bg-amber-950/5 border-amber-200/60'
              : 'bg-white border-slate-200/60'
          }`}
        >
          <div className={`absolute -bottom-8 -right-8 w-32 h-32 rounded-full blur-2xl transition-colors ${offlineMode ? 'bg-amber-400/20' : 'bg-slate-400/10'}`} />
          <div className="flex items-center justify-between mb-4">
            {offlineMode
              ? <WifiOff className="w-5 h-5 text-amber-500" />
              : <Wifi className="w-5 h-5 text-slate-400" />}
            <PremiumToggle
              enabled={offlineMode}
              onToggle={onToggleOffline}
              color="from-amber-400 to-orange-500"
              label="offline mode"
            />
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">Offline Mode</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {offlineMode ? 'Active' : 'Disabled'}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            {offlineMode ? 'Working from local cache' : 'Live data from Supabase'}
          </p>
        </TiltCard>
      </div>

      {/* ── Force Sync Card ── */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 shadow-[0_8px_40px_rgb(0,0,0,0.2)]">
        {/* Background mesh gradient */}
        <div className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(ellipse at 20% 50%, #3b82f620 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, #8b5cf620 0%, transparent 60%)',
          }}
        />
        {/* Noise texture */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative flex items-start justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw className="w-5 h-5 text-blue-400" />
              <span className="text-xs text-blue-400 uppercase tracking-widest font-semibold">Global Sync</span>
            </div>
            <h3 className="text-2xl font-bold text-white">Force Data Refresh</h3>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Pull a fresh copy of all <span className="text-white font-medium">14,000+</span> patient records from Supabase. Cache refreshes in-place — no page reload needed.
            </p>

            {/* Progress bar — only visible during sync */}
            <AnimatePresence>
              {isSyncing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-5 overflow-hidden"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                    <span>Fetching records…</span>
                    <span>{Math.round(syncProgress)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: `${syncProgress}%` }}
                      transition={{ ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full relative"
                    >
                      {/* Shimmer on progress bar */}
                      <motion.div
                        animate={{ x: ['-100%', '300%'] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      />
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sync button */}
          <MagneticButton
            onClick={onSync}
            disabled={isSyncing}
            className={`relative flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-semibold text-sm transition-all
              ${isSyncing
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-[0_8px_32px_rgb(99,102,241,0.4)] hover:shadow-[0_12px_40px_rgb(99,102,241,0.6)]'
              }`}
          >
            <motion.div
              animate={isSyncing ? { rotate: 360 } : { rotate: 0 }}
              transition={isSyncing ? { repeat: Infinity, duration: 0.9, ease: 'linear' } : {}}
            >
              <RefreshCw className="w-4 h-4" />
            </motion.div>
            <span>{isSyncing ? 'Syncing…' : 'Sync Now'}</span>
          </MagneticButton>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────── */
export default function SettingsTab() {
  const { data: session } = useSession();
  const { mutate } = useSWRConfig();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('profile');
  const [isSyncing, setIsSyncing] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  // Track sidebar indicator position for morphing underline
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0 });
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const el = tabRefs.current[activeSubTab];
    if (el) {
      setIndicatorStyle({ top: el.offsetTop, height: el.offsetHeight });
    }
  }, [activeSubTab]);

  const handleForceSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await mutate('all-patients', undefined, { revalidate: true });
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setTimeout(() => setIsSyncing(false), 2000); // let progress bar reach ~100%
    }
  }, [mutate]);

  const toggleNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n))
    );
  }, []);

  const subTabs: { id: SubTab; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'profile', label: 'Profile', icon: User, description: 'Identity & alerts' },
    { id: 'sync', label: 'Data & Sync', icon: HardDrive, description: 'Cache & connectivity' },
  ];

  return (
    <div className="h-full flex bg-[#F4F6F9]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── SIDEBAR ── */}
      <motion.aside
        initial={{ x: -24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-64 border-r border-slate-200/80 bg-white/90 backdrop-blur-xl p-5 flex flex-col"
      >
        {/* Logo mark */}
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-bold text-slate-900 uppercase tracking-[0.15em]">Settings</span>
        </div>

        {/* Tabs with morphing indicator */}
        <nav aria-label="Settings navigation" className="relative space-y-1">
          {/* Sliding pill indicator */}
          <motion.div
            className="absolute left-0 right-0 bg-slate-100 rounded-xl z-0"
            animate={{ top: indicatorStyle.top, height: indicatorStyle.height }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          />

          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[tab.id] = el; }}
                onClick={() => setActiveSubTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className="relative z-10 w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-slate-900 shadow-md'
                    : 'bg-transparent group-hover:bg-slate-100'
                }`}>
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <div>
                  <p className={`text-sm font-semibold transition-colors ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                    {tab.label}
                  </p>
                  <p className="text-[10px] text-slate-400">{tab.description}</p>
                </div>
                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom user chip */}
        <div className="mt-auto pt-5 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{session?.user?.name || 'Program Manager'}</p>
              <p className="text-[10px] text-slate-400 truncate">{session?.user?.email || 'manager@ntep.gov.in'}</p>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-10">

          {/* Page header — reflects active tab */}
          <motion.div
            key={activeSubTab + '-header'}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {subTabs.find((t) => t.id === activeSubTab)?.label}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {subTabs.find((t) => t.id === activeSubTab)?.description}
            </p>
          </motion.div>

          {/* Panel */}
          <AnimatePresence mode="popLayout">
            <motion.div
              key={activeSubTab}
              initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeSubTab === 'profile' && (
                <ProfilePanel
                  session={session}
                  notifications={notifications}
                  onToggle={toggleNotification}
                />
              )}
              {activeSubTab === 'sync' && (
                <SyncPanel
                  isSyncing={isSyncing}
                  offlineMode={offlineMode}
                  onSync={handleForceSync}
                  onToggleOffline={() => setOfflineMode((v) => !v)}
                />
              )}
            </motion.div>
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}
