'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
  User, RefreshCw, HardDrive, Bell, CheckCircle2,
  Wifi, WifiOff, Zap, Shield, Activity, Clock,
  Sparkles, FileText, Database
} from 'lucide-react';
import { useSWRConfig } from 'swr';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { CharacterSelector } from './CharacterSelector';
import { SyncIntelligenceCard } from './settings/SyncIntelligenceCard';

const PDFLibrary = dynamic(() => import('./pdf/PDFLibrary'), { ssr: false });

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type SubTab = 'profile' | 'sync' | 'documents' | 'character' | 'pipeline';

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
                    {/* @ts-ignore */}
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
  isDriveSyncing,
  onDriveSync,
}: {
  isSyncing: boolean;
  offlineMode: boolean;
  onSync: () => void;
  onToggleOffline: () => void;
  isDriveSyncing: boolean;
  onDriveSync: () => void;
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

      {/* ── Drive Sync Card ── */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/60 shadow-[0_8px_40px_rgb(0,0,0,0.06)] p-8">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="relative flex items-start justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw className="w-5 h-5 text-blue-500" />
              <span className="text-xs text-blue-500 uppercase tracking-widest font-semibold">Google Drive</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Sync Drive Files</h3>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Trigger the Apps Script scout to scan Drive folders and push new X-Ray files into the <span className="text-slate-700 font-medium">Orphaned Files Rail</span>.
            </p>
          </div>
          <MagneticButton
            onClick={onDriveSync}
            disabled={isDriveSyncing}
            className={`relative flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-semibold text-sm transition-all
              ${isDriveSyncing
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-[0_8px_32px_rgb(37,99,235,0.3)] hover:shadow-[0_12px_40px_rgb(37,99,235,0.5)]'
              }`}
          >
            <motion.div
              animate={isDriveSyncing ? { rotate: 360 } : { rotate: 0 }}
              transition={isDriveSyncing ? { repeat: Infinity, duration: 0.9, ease: 'linear' } : {}}
            >
              <RefreshCw className="w-4 h-4" />
            </motion.div>
            <span>{isDriveSyncing ? 'Scanning...' : 'Sync Drive'}</span>
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
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [selectedDocId, setSelectedDocId] = useState<string | undefined>();
  const [selectedDocTitle, setSelectedDocTitle] = useState<string | undefined>();

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleForceSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1) Pull fresh data from Kobo into Supabase (manual ETL trigger)
      // NOTE: This is intentionally best-effort: ETL failure shouldn't prevent UI refresh.
      try {
        await fetch('/api/etl/kobo-sync', { method: 'POST' });
      } catch (e) {
        console.warn('[ForceSync] Kobo ETL trigger failed (continuing):', e);
      }

      // 2) Revalidate the correct SWR cache key for the global patient dataset
      const userState = (session?.user as any)?.state as string | undefined;
      await mutate(['allPatients', userState], undefined, { revalidate: true });
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setTimeout(() => setIsSyncing(false), 2000); // let progress bar reach ~100%
    }
  }, [mutate, session?.user]);

  const handleDriveSync = useCallback(async () => {
    if (isDriveSyncing) return;
    setIsDriveSyncing(true);
    try {
      await fetch(process.env.NEXT_PUBLIC_APPS_SCRIPT_URL!, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'TRIGGER_SYNC' }),
      });
      // Give Apps Script 3s to process, then revalidate the live orphans rail
      setTimeout(() => mutate(['live_orphans']), 3000);
    } finally {
      setIsDriveSyncing(false);
    }
  }, [isDriveSyncing, mutate]);

  const toggleNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n))
    );
  }, []);

  const handleSelectDoc = useCallback((docId: string, title: string) => {
    setSelectedDocId(docId);
    setSelectedDocTitle(title);
    // Store in localStorage so Genie can access it
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeDocId', docId);
      localStorage.setItem('activeDocTitle', title);
    }
  }, []);

  const subTabs: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
    { id: 'profile' as SubTab, label: 'Profile', icon: User, description: 'Identity & alerts' },
    { id: 'character' as SubTab, label: 'AI Character', icon: Sparkles, description: 'Floating companion' },
    { id: 'sync' as SubTab, label: 'Data & Sync', icon: HardDrive, description: 'Cache & connectivity' },
    { id: 'documents' as SubTab, label: 'Documents', icon: FileText, description: 'PDF library & Q&A' },
    { id: 'pipeline' as SubTab, label: 'Sync Intelligence', icon: Activity, description: 'Pipeline health & diagnostics' },
  ];

  return (
    <div className="h-full flex bg-[#F4F6F9]" style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Sub-tab navigation */}
        <aside className="w-64 border-r border-slate-200/80 bg-white/90 backdrop-blur-xl p-5 flex flex-col">
          <div className="mb-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Settings</h2>
          </div>
          <nav aria-label="Settings sub-navigation" className="flex flex-col gap-1">
            {subTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => { (tabRefs.current as Record<string, HTMLButtonElement | null>)[tab.id] = el; }}
                  onClick={() => setActiveSubTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex items-center gap-3 px-4 py-2 rounded-xl text-left transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 overflow-y-auto">
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
              {activeSubTab === 'character' && (
                <div className="rounded-3xl bg-white border border-slate-200/60 shadow-[0_8px_40px_rgb(0,0,0,0.06)] p-8">
                  <CharacterSelector />
                </div>
              )}
              {activeSubTab === 'sync' && (
                <SyncPanel
                  isSyncing={isSyncing}
                  offlineMode={offlineMode}
                  onSync={handleForceSync}
                  onToggleOffline={() => setOfflineMode((v) => !v)}
                  isDriveSyncing={isDriveSyncing}
                  onDriveSync={handleDriveSync}
                />
              )}
              {activeSubTab === 'pipeline' && (
                <SyncIntelligenceCard />
              )}
              {activeSubTab === 'documents' && (
                <div className="space-y-4">
                  {/* Info card */}
                  {selectedDocTitle && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900">Active Document</p>
                          <p className="text-xs text-slate-600 mt-0.5">{selectedDocTitle}</p>
                        </div>
                        <div className="text-xs text-purple-600 font-medium bg-purple-100 px-3 py-1 rounded-full">
                          Ready for Q&A
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-3">
                        Go to <span className="font-semibold text-slate-700">GIS Map</span> tab and ask Genie questions about this document via voice.
                      </p>
                    </motion.div>
                  )}
                  
                  {/* PDF Library */}
                  <div className="rounded-3xl bg-white border border-slate-200/60 shadow-[0_8px_40px_rgb(0,0,0,0.06)] overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-purple-500 rounded-xl flex items-center justify-center">
                          <FileText className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">PDF Document Library</h3>
                      </div>
                      <p className="text-sm text-slate-500">
                        Upload policy documents, guidelines, and reports. Click a document to activate it for voice Q&A.
                      </p>
                    </div>
                    <div className="p-6">
                      <PDFLibrary onSelectDoc={handleSelectDoc} activeDocId={selectedDocId} />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
