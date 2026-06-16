'use client'

import { useMemo, useCallback } from 'react'
import { motion, useScroll, useMotionValueEvent, useTransform } from 'framer-motion'
import { Users, Bell, Pill } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSWRAllPatients } from '@/hooks/useSWRPatients'
import { useSessionScope } from '@/hooks/useSessionScope'
import { sounds } from '@/lib/sound'
import { cn } from '@/lib/utils'

export function DynamicIsland() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const scope = useSessionScope()
  const { patients: globalPatients = [] } = useSWRAllPatients(scope)

  // Calculate live metrics
  const metrics = useMemo(() => {
    const screened = globalPatients.length
    const alerts = globalPatients.filter((p: any) => {
      const isAbnormal = p.xray_result?.toLowerCase().includes('abnormal')
      const noTreatment = !p.att_start_date && !p.referral_date
      return isAbnormal && noTreatment
    }).length
    const att = globalPatients.filter((p: any) => p.att_start_date).length

    return { screened, alerts, att }
  }, [globalPatients])

  // iOS Safari-style scroll behavior
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 100], [0, 80])
  const opacity = useTransform(scrollY, [0, 50, 100], [1, 0.6, 0])

  const handleMetricClick = useCallback((filter: string) => {
    sounds.buttonClick()
    const params = new URLSearchParams(searchParams.toString())
    params.set('filter', filter)
    router.push(`?${params.toString()}`)
  }, [router, searchParams])

  return (
    <motion.div
      initial={{ y: 100, opacity: 0, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.3 }}
      style={{ y, opacity }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
    >
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] rounded-2xl px-6 py-3 flex items-center gap-6">
        
        {/* Screened Metric */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          onClick={() => handleMetricClick('screened')}
          className="flex items-center gap-3 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="hidden md:block">
            <p className="text-[10px] tracking-widest font-bold text-slate-500 uppercase">Screened</p>
            <p className="text-lg font-black text-slate-900 tabular-nums leading-none">{metrics.screened.toLocaleString()}</p>
          </div>
          <p className="md:hidden text-lg font-black text-slate-900 tabular-nums">{metrics.screened.toLocaleString()}</p>
        </motion.button>

        <div className="w-px h-4 bg-slate-200" />

        {/* Alerts Metric - Pulsing */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          onClick={() => handleMetricClick('alerts')}
          className="flex items-center gap-3 group cursor-pointer relative"
        >
          {metrics.alerts > 0 && (
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="absolute inset-0 rounded-xl bg-rose-500/20 blur-md"
            />
          )}
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-colors relative z-10",
            metrics.alerts > 0 
              ? "bg-rose-500/10 group-hover:bg-rose-500/20" 
              : "bg-slate-100 group-hover:bg-slate-200"
          )}>
            <Bell className={cn(
              "w-4 h-4",
              metrics.alerts > 0 ? "text-rose-600" : "text-slate-400"
            )} />
          </div>
          <div className="hidden md:block relative z-10">
            <p className="text-[10px] tracking-widest font-bold text-slate-500 uppercase">Alerts</p>
            <p className={cn(
              "text-lg font-black tabular-nums leading-none",
              metrics.alerts > 0 ? "text-rose-600" : "text-slate-900"
            )}>{metrics.alerts.toLocaleString()}</p>
          </div>
          <p className={cn(
            "md:hidden text-lg font-black tabular-nums relative z-10",
            metrics.alerts > 0 ? "text-rose-600" : "text-slate-900"
          )}>{metrics.alerts.toLocaleString()}</p>
        </motion.button>

        <div className="w-px h-4 bg-slate-200" />

        {/* ATT Metric */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          onClick={() => handleMetricClick('att')}
          className="flex items-center gap-3 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
            <Pill className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="hidden md:block">
            <p className="text-[10px] tracking-widest font-bold text-slate-500 uppercase">ATT</p>
            <p className="text-lg font-black text-slate-900 tabular-nums leading-none">{metrics.att.toLocaleString()}</p>
          </div>
          <p className="md:hidden text-lg font-black text-slate-900 tabular-nums">{metrics.att.toLocaleString()}</p>
        </motion.button>

      </div>
    </motion.div>
  )
}
