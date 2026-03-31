'use client';

import { memo, useMemo, useState, useEffect } from 'react';
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

const Header = memo<HeaderProps>(({ firstName, userRole }) => {
  const [time, setTime] = useState('');
  const [spiralChars, setSpiralChars] = useState<string[][]>([]);
  const [titleScramble, setTitleScramble] = useState(0);
  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const glyphs = " .:-=+*#%@";
    const cols = 80;
    const rows = 8;
    let animationId: number;
    let startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) * 0.0009 + 0.8;
      const grid: string[][] = [];
      const k = glyphs.length / 2;

      for (let y = 0; y < rows; y++) {
        const row: string[] = [];
        const Y = y / rows * 2 - 1;
        for (let x = 0; x < cols; x++) {
          const X = x / cols * 2 - 1;
          const l = Math.hypot(X, Y);
          let a = Math.atan2(Y, X);
          let ch = glyphs[0];

          if (l < 1.0) {
            a += elapsed;
            a += l * Math.PI;
            const idx = Math.floor(
              (Math.cos(a * 3 + l * 2 + elapsed * 2) + Math.sin(a * 2 - l * 3 + elapsed * 3)) / 2 * k + k
            );
            ch = glyphs[Math.max(0, Math.min(glyphs.length - 1, idx))];
          }
          row.push(ch);
        }
        grid.push(row);
      }
      setSpiralChars(grid);
      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, []);

  useEffect(() => {
    const scrambleSteps = 20;
    let step = 0;
    const interval = setInterval(() => {
      if (step < scrambleSteps) {
        setTitleScramble(step);
        step++;
      } else {
        clearInterval(interval);
      }
    }, 80);
    return () => clearInterval(interval);
  }, []);

  const getScrambledChar = (char: string, progress: number) => {
    if (char === ' ') return ' ';
    const scrambleChars = "▁▂▃▄▅▆▇█▉▊▋▌▍▎▏▐░▒▓";
    const randomFactor = 1 - progress;
    if (Math.random() < randomFactor) {
      return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
    }
    return char;
  };

  const renderTitle = () => {
    const title = "SAMADHAAN";
    const progress = titleScramble / 20;
    return title.split('').map((char, i) => (
      <motion.span
        key={i}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 + i * 0.05 }}
        className="inline-block hover:text-purple-600 hover:scale-110 transition-all duration-300 cursor-default"
      >
        {progress < 1 ? getScrambledChar(char, progress) : char}
      </motion.span>
    ));
  };
  
  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} 
      className="text-center mb-16 relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900/5 via-blue-950/5 to-slate-900/5 p-12 backdrop-blur-sm"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-15">
        <pre className="font-mono text-[6px] leading-none text-cyan-400/60 whitespace-pre">
          {spiralChars.map((row, i) => (
            <div key={i}>{row.join('')}</div>
          ))}
        </pre>
      </div>
      {/* Top Right Status Card with Live Clock */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="absolute top-0 right-0 flex items-center gap-4"
      >
        {/* Live Clock */}
        <div className="relative group">
          <div className="absolute -inset-[2px] bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-2xl blur-sm opacity-40 group-hover:opacity-60 transition-opacity duration-300" />
          <div className="relative bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl px-4 py-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ animationDuration: '2s' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-mono text-sm font-bold text-slate-700 tabular-nums">{time}</span>
          </div>
        </div>
        
        {/* User Status Card */}
        <div className="relative group">
          {/* Neon Border */}
          <div className="absolute -inset-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full blur-sm opacity-60 group-hover:opacity-80 animate-pulse transition-opacity duration-300" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full p-[1px]">
            <div className="w-full h-full bg-slate-50 rounded-full" />
          </div>
          
          {/* Content */}
          <div className="relative bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-full px-6 py-2.5 flex items-center gap-3 group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] transition-shadow duration-300">
            {/* Status Indicator */}
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            
            {/* Welcome Text */}
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <span className="opacity-70">Welcome,</span>
              <span className="font-bold text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text animate-gradient" style={{ backgroundSize: '200% 200%' }}>
                {firstName}
              </span>
            </div>
            
            <div className="h-4 w-[1px] bg-gradient-to-b from-transparent via-slate-300 to-transparent" />
            
            {/* Security Icon with Tooltip */}
            <div className="relative group/tooltip">
              <svg className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {/* Tooltip */}
              <div className="absolute top-full right-0 mt-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                System Secure
                <div className="absolute -top-1 right-4 w-2 h-2 bg-slate-900 rotate-45" />
              </div>
            </div>
            
            <div className="h-4 w-[1px] bg-gradient-to-b from-transparent via-slate-300 to-transparent" />
            
            {/* Role Badge with Hover Effect */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
              <div className="relative px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(139,92,246,0.4)] group-hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] transition-shadow duration-300">
                {userRole}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Animated Particles Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      
      {/* Decorative Top Line with Gradient Animation */}
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
      
      {/* Main Title with Advanced Neon Glow */}
      <div className="relative inline-block mb-6">
        {/* Multi-layer Glow Effect */}
        <div className="absolute inset-0 blur-[100px] bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-pink-500/40 animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute inset-0 blur-[60px] bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 animate-pulse" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
        
        <motion.h1 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
          className="relative text-6xl md:text-7xl lg:text-8xl font-black tracking-[0.4em] bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(139,92,246,0.4)] font-mono"
        >
          {renderTitle()}
        </motion.h1>
        
        {/* Animated Underline with Shimmer */}
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
      
      {/* Subtitle with Typing Effect */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mb-2"
      >
        <p className="text-lg md:text-xl font-semibold text-slate-600 tracking-tight">
          National Integrated Health OS
        </p>
      </motion.div>
      
      {/* System Stats Bar */}
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
      
      {/* Decorative Bottom Elements with Breathing Animation */}
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 flex items-center gap-3">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </motion.header>
  );
});

Header.displayName = 'Header';

export default function CommandHubPage() {
  const { data: session } = useSession();

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
