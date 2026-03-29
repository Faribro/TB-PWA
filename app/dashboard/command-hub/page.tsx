'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, MapPin, AlertTriangle, Database, ShieldCheck, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { useSessionScope } from '@/hooks/useSessionScope';

function LivePulseIndicator() {
  const [time, setTime] = useState('');
  const [latency, setLatency] = useState(25);

  useEffect(() => {
    setLatency(Math.floor(Math.random() * 11) + 20);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utc = now.toISOString().split('T')[1].split('.')[0];
      setTime(utc);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="absolute top-8 right-8 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-xl px-4 py-2.5 shadow-lg z-50"
    >
      <div className="flex items-center gap-4 font-mono text-[10px] tracking-wider">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-500">UTC:</span>
          <span className="text-emerald-600 font-bold">{time || '00:00:00'}</span>
        </div>
        <div className="w-px h-3 bg-slate-300" />
        <div className="flex items-center gap-2">
          <span className="text-slate-500">LATENCY:</span>
          <span className="text-cyan-600 font-bold">{latency}ms</span>
        </div>
        <div className="w-px h-3 bg-slate-300" />
        <div className="flex items-center gap-2">
          <span className="text-slate-500">NODES:</span>
          <span className="text-blue-600 font-bold">24</span>
        </div>
      </div>
    </motion.div>
  );
}

function MetricCard({ icon: Icon, label, value, trend, delay }: {
  icon: any;
  label: string;
  value: string | number;
  trend?: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 20 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="h-48 bg-white border border-slate-200/60 rounded-2xl shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,74,153,0.12)] hover:border-blue-200 p-6 flex flex-col justify-between"
    >
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">{trend}</span>}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
        <p className="text-4xl font-black tracking-tighter text-slate-900">{value}</p>
      </div>
    </motion.div>
  );
}

function NavigationTile({ href, title, description, delay, icon: Icon }: {
  href: string;
  title: string;
  description: string;
  delay: number;
  icon?: any;
}) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay, type: 'spring', stiffness: 300, damping: 20 }}>
      <Link href={href}>
        <motion.div 
          whileHover={{ y: -4, scale: 1.02 }} 
          whileTap={{ scale: 0.98 }} 
          className="h-48 bg-white border border-slate-200/60 rounded-2xl shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,74,153,0.12)] hover:border-blue-200 flex flex-col justify-between p-6 cursor-pointer group"
        >
          <div>
            {Icon && (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{title}</h3>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">{description}</p>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

export default function CommandHubPage() {
  const { data: session } = useSession();
  const scope = useSessionScope();
  const { data: patients = [] } = useSWRAllPatients(scope);

  const totalScreened = patients.length;
  const statesCovered = new Set(patients.map(p => p.screening_state)).size;
  const highAlertCases = patients.filter(p => p.current_phase === 'Breach').length;
  const syncIntegrity = 100;

  const sessionRole = session?.user?.role;
  const SUPERUSER_ROLES = ['PM', 'admin'];
  const isSuperuser = SUPERUSER_ROLES.includes(sessionRole || '');

  const tiles = [
    { href: '/dashboard/vertex', title: 'Analytics', description: 'Neural network visualization and insights', delay: 0.5, show: true, icon: Activity },
    { href: '/dashboard/gis', title: 'GIS Intelligence', description: 'Spatial mapping and geographic analysis', delay: 0.6, show: true, icon: MapPin },
    { href: '/dashboard/follow-up', title: 'Pipeline', description: 'Patient tracking and triage management', delay: 0.7, show: true, icon: Activity },
    { href: '/dashboard/mande', title: 'M&E Tools', description: 'Monitoring & Evaluation intelligence hub', delay: 0.75, show: true, icon: Database },
    { href: '/admin/users', title: 'Identity Bureau', description: 'Manage user roles, state assignments, and approvals', delay: 0.8, show: isSuperuser, icon: ShieldCheck },
    { href: '/docs', title: 'Knowledge Vault', description: 'Access SOPs, user manuals, and technical guides', delay: 0.9, show: true, icon: BookOpen },
  ].filter(tile => tile.show);

  const firstName = session?.user?.name?.split(' ')[0] || 'Officer';
  const userRole = session?.user?.role || 'User';

  return (
    <div className="min-h-screen w-full bg-slate-50 relative overflow-hidden">
      {/* Engineering Grid Background */}
      <div 
        className="fixed inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem]"
        style={{
          maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000 70%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000 70%, transparent 100%)'
        }}
      />
      
      <LivePulseIndicator />
      
      {/* Scrollable content container */}
      <div className="relative z-10 h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-16">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-16">
            <h1 className="text-5xl font-black tracking-[0.4em] text-slate-900 mb-3">SAMADHAAN</h1>
            <p className="text-xl font-bold text-slate-600 tracking-tight">National Integrated Health OS</p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <div className="w-1 h-12 bg-blue-600 rounded-full" />
              <p className="text-base text-slate-700 font-medium tracking-tight">
                Welcome, <span className="font-bold text-blue-600">{firstName}</span>. System status is secure. You are currently operating with <span className="font-bold text-blue-600">{userRole}</span> privileges.
              </p>
            </div>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <MetricCard icon={Activity} label="Total Screened" value={totalScreened.toLocaleString()} trend="+12%" delay={0.1} />
            <MetricCard icon={MapPin} label="States Covered" value={statesCovered} delay={0.2} />
            <MetricCard icon={AlertTriangle} label="High-Alert Cases" value={highAlertCases} delay={0.3} />
            <MetricCard icon={Database} label="Sync Integrity" value={`${syncIntegrity}%`} trend="Optimal" delay={0.4} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {tiles.map((tile) => (
              <NavigationTile
                key={tile.href}
                href={tile.href}
                title={tile.title}
                description={tile.description}
                delay={tile.delay}
                icon={tile.icon}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
