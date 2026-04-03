'use client';

import { memo, useMemo, useEffect, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Activity, MapPin, Database, ShieldCheck, BookOpen, ArrowUpRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FeatureShowcase } from '@/components/FeatureShowcase';

const SUPERUSER_ROLES = ['PM', 'admin'] as const;

type CardOrientation = 'top' | 'right' | 'bottom' | 'left';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { 
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      mass: 0.5,
    },
  },
};

interface TileConfig {
  readonly href: string;
  readonly title: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly iconBg: string;
  readonly iconColor: string;
  readonly orientation: CardOrientation;
}

const BASE_TILES: readonly TileConfig[] = [
  { href: '/dashboard/vertex', title: 'Analytics', description: 'Neural network visualization and insights', icon: Activity, iconBg: 'bg-blue-50/80', iconColor: 'text-blue-600', orientation: 'left' },
  { href: '/dashboard/follow-up', title: 'Pipeline', description: 'Patient tracking and triage management', icon: Activity, iconBg: 'bg-indigo-50/80', iconColor: 'text-indigo-600', orientation: 'top' },
  { href: '/dashboard/mande', title: 'M&E Tools', description: 'Monitoring & Evaluation intelligence hub', icon: Database, iconBg: 'bg-emerald-50/80', iconColor: 'text-emerald-600', orientation: 'right' },
  { href: '/dashboard/gis', title: 'GIS Intelligence', description: 'Spatial mapping and geographic analysis', icon: MapPin, iconBg: 'bg-cyan-50/80', iconColor: 'text-cyan-600', orientation: 'bottom' },
  { href: '/docs', title: 'Knowledge Vault', description: 'Access SOPs, user manuals, and technical guides', icon: BookOpen, iconBg: 'bg-amber-50/80', iconColor: 'text-amber-600', orientation: 'left' },
] as const;

const ADMIN_TILE: TileConfig = {
  href: '/admin/users',
  title: 'Identity Bureau',
  description: 'Manage user roles, state assignments, and approvals',
  icon: ShieldCheck,
  iconBg: 'bg-rose-50/80',
  iconColor: 'text-rose-600',
  orientation: 'right',
} as const;

const getOrientationClasses = (orientation: CardOrientation) => {
  const baseClasses = 'flex h-full w-full';
  
  switch (orientation) {
    case 'top':
      return {
        container: `${baseClasses} flex-col col-span-1 row-span-2`,
        image: 'h-1/2 w-full',
        text: 'h-1/2 w-full pt-6',
        imageRadius: 'rounded-t-[2rem]',
      };
    case 'right':
      return {
        container: `${baseClasses} flex-row-reverse col-span-2 row-span-1`,
        image: 'h-full w-1/2',
        text: 'h-full w-1/2 pl-6',
        imageRadius: 'rounded-r-[2rem]',
      };
    case 'bottom':
      return {
        container: `${baseClasses} flex-col-reverse col-span-1 row-span-2`,
        image: 'h-1/2 w-full',
        text: 'h-1/2 w-full pb-6',
        imageRadius: 'rounded-b-[2rem]',
      };
    case 'left':
      return {
        container: `${baseClasses} flex-row col-span-2 row-span-1`,
        image: 'h-full w-1/2',
        text: 'h-full w-1/2 pr-6',
        imageRadius: 'rounded-l-[2rem]',
      };
  }
};

interface TileCardProps {
  readonly tile: TileConfig;
}

const TileCard = memo<TileCardProps>(({ tile }) => {
  const Icon = tile.icon;
  const classes = getOrientationClasses(tile.orientation);
  
  return (
    <Link href={tile.href} prefetch={true} className="block h-full">
      <div className="relative h-full group">
        {/* Always-Visible Neon Glow Border */}
        <div className={`absolute -inset-[3px] bg-gradient-to-br ${tile.iconBg.replace('/80', '')} opacity-40 group-hover:opacity-60 rounded-[2rem] blur-2xl transition-opacity duration-500 animate-pulse`} style={{ animationDuration: '4s' }} />
        <div className={`absolute inset-0 rounded-[2rem] p-[2px] bg-gradient-to-br ${tile.iconBg.replace('/80', '')} opacity-60 group-hover:opacity-100 transition-opacity duration-300`}>
          <div className="w-full h-full bg-slate-50 rounded-[2rem]" />
        </div>
        
        <motion.article
          whileHover={{ scale: 1.02, y: -6 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="relative h-full overflow-hidden bg-white/80 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] shadow-[inset_0_1px_1px_rgba(255,255,255,1)] rounded-[2rem] cursor-pointer hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] will-change-transform"
          role="button"
          tabIndex={0}
          aria-label={`Navigate to ${tile.title}`}
        >
          {/* Always-Visible Animated Edge Glow Lines */}
          <div className="absolute inset-0 rounded-[2rem] opacity-30 group-hover:opacity-100 transition-opacity duration-300">
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse`} style={{ animationDuration: '3s' }} />
            <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse`} style={{ animationDuration: '3s', animationDelay: '1.5s' }} />
            <div className={`absolute top-0 bottom-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-pink-400 to-transparent animate-pulse`} style={{ animationDuration: '3s', animationDelay: '0.75s' }} />
            <div className={`absolute top-0 bottom-0 right-0 w-[2px] bg-gradient-to-b from-transparent via-indigo-400 to-transparent animate-pulse`} style={{ animationDuration: '3s', animationDelay: '2.25s' }} />
          </div>
          
          <div className={classes.container}>
            {/* Icon Section */}
            <div className={`${classes.image} relative overflow-hidden ${tile.iconBg}`}>
              {/* Always-Visible Icon Glow Effect */}
              <div className={`absolute inset-0 ${tile.iconColor.replace('text-', 'bg-')} opacity-20 group-hover:opacity-40 blur-3xl transition-opacity duration-500 animate-pulse`} style={{ animationDuration: '5s' }} />
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`${tile.iconColor} p-6 rounded-2xl bg-white/40 backdrop-blur-sm transition-all duration-300 group-hover:scale-110 shadow-[0_0_30px_currentColor] group-hover:shadow-[0_0_50px_currentColor]`}>
                  <Icon className="w-12 h-12" strokeWidth={1.5} />
                </div>
              </div>
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
              
              {/* Arrow Icon with Glow */}
              <div className="absolute top-4 right-4 text-slate-400 group-hover:text-blue-600 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 drop-shadow-[0_0_4px_rgba(148,163,184,0.5)] group-hover:drop-shadow-[0_0_12px_rgba(59,130,246,0.8)]" aria-hidden="true">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>

            {/* Text Section */}
            <div className={`${classes.text} flex flex-col justify-center px-8`}>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-3 group-hover:text-blue-600 transition-colors duration-300 drop-shadow-[0_0_6px_rgba(15,23,42,0.1)] group-hover:drop-shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                {tile.title}
              </h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                {tile.description}
              </p>
            </div>
          </div>
        </motion.article>
      </div>
    </Link>
  );
});

TileCard.displayName = 'TileCard';

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
      className="text-center mb-16 relative rounded-3xl border border-white/40 bg-gradient-to-br from-white/60 to-slate-50/40 p-12 backdrop-blur-xl shadow-sm"
    >
      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
        <div className="absolute inset-0 opacity-30">
          {PARTICLE_POSITIONS.map((p, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"
              style={{ left: p.left, top: p.top }}
              animate={{ y: [0, -30, 0], opacity: [0, 1, 0], scale: [0, 1, 0] }}
              transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>

      {/* Top Right Status Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="absolute -top-12 -right-2 z-50"
      >
        <div className="relative group">
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
        </div>
      </motion.div>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-32 h-[3px] mx-auto mb-10 overflow-hidden rounded-full"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>

      <div className="relative inline-block mb-6">
        <div className="absolute inset-0 blur-[100px] bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-pink-500/40 animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute inset-0 blur-[60px] bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 animate-pulse" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
          className="relative text-6xl md:text-7xl lg:text-8xl font-black tracking-[0.4em] bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(139,92,246,0.4)] font-mono"
        >
          SAMADHAAN
        </motion.h1>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-3/4 h-[2px] overflow-hidden rounded-full"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 1 }}
          />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mb-2"
      >
        <p className="text-lg md:text-xl font-semibold text-slate-600 tracking-tight">National Integrated Health OS</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="flex items-center justify-center gap-6 text-xs font-medium text-slate-500"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Uptime 99.9%</span>
        </div>
        <div className="w-px h-3 bg-slate-300" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <span>24/7 Monitoring</span>
        </div>
        <div className="w-px h-3 bg-slate-300" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" style={{ animationDelay: '1s' }} />
          <span>Enterprise Grade</span>
        </div>
      </motion.div>

      <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 flex items-center gap-3">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </motion.header>
  );
});

Header.displayName = 'Header';

export default function CommandHubPage() {
  const { data: session, status } = useSession();

  const isSuperuser = useMemo(
    () => SUPERUSER_ROLES.includes(session?.user?.role as typeof SUPERUSER_ROLES[number]),
    [session?.user?.role]
  );

  const tiles = useMemo<readonly TileConfig[]>(
    () => (isSuperuser ? [...BASE_TILES, ADMIN_TILE] : BASE_TILES),
    [isSuperuser]
  );

  const firstName = useMemo(
    () => session?.user?.name?.split(' ')[0] || 'Officer',
    [session?.user?.name]
  );
  
  const userRole = session?.user?.role || 'User';

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
      <BackgroundGrid />
      
      <div className="relative z-10 min-h-screen overflow-y-auto py-16 px-6">
        <div className="max-w-[1400px] mx-auto space-y-16">
          <Header firstName={firstName} userRole={userRole} />
          
          {/* Feature Showcase */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <FeatureShowcase />
          </motion.div>
          
          {/* Masonry Bento Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 auto-rows-[200px] gap-6"
            style={{ gridAutoFlow: 'dense' }}
          >
            {tiles.map((tile) => (
              <motion.div
                key={tile.href}
                variants={itemVariants}
                className={getOrientationClasses(tile.orientation).container.includes('col-span-2') ? 'col-span-1 md:col-span-2' : 'col-span-1'}
                style={{
                  gridRow: getOrientationClasses(tile.orientation).container.includes('row-span-2') ? 'span 2' : 'span 1',
                }}
              >
                <TileCard tile={tile} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
