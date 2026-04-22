'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sounds } from '@/lib/sound'

interface ScreeningDay {
  date: string
  count: number
  tbPositive: number
  suspected: number
  attStarted: number
  referred: number
}

interface Props {
  data: ScreeningDay[]
  onDayClick: (date: string) => void
  selectedDate: string | null
  updatedDates?: Set<string>
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun',
                'Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS = ['S','M','T','W','T','F','S']

function getColor(count: number, max: number): string {
  if (count === 0) return 'bg-[#e6e4df]'
  const intensity = count / max
  if (intensity < 0.2)  return 'bg-[#cedcd8]'
  if (intensity < 0.4)  return 'bg-[#9ec8c4]'
  if (intensity < 0.6)  return 'bg-[#4f98a3]'
  if (intensity < 0.8)  return 'bg-[#01696f]'
  return 'bg-[#0f3638]'
}

export function ScreeningCalendar({ data, onDayClick, selectedDate, updatedDates }: Props) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const calendarRef = useRef<HTMLDivElement>(null)

  const dayMap = useMemo(() => {
    const m: Record<string, ScreeningDay> = {}
    data.forEach(d => { m[d.date] = d })
    return m
  }, [data])

  const maxCount = useMemo(
    () => Math.max(1, ...data.map(d => d.count)),
    [data]
  )

  const months = useMemo(() => {
    const maxMonth = viewYear === now.getFullYear()
      ? now.getMonth()
      : 11

    return Array.from({ length: maxMonth + 1 }, (_, monthIdx) => {
      const firstDay = new Date(viewYear, monthIdx, 1)
      const daysInMonth = new Date(viewYear, monthIdx + 1, 0).getDate()
      const startDow = firstDay.getDay()

      const cells: (string | null)[] = Array(startDow).fill(null)
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${viewYear}-${String(monthIdx + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
        cells.push(dateStr)
      }
      while (cells.length % 7 !== 0) cells.push(null)

      return { month: monthIdx, cells }
    })
  }, [viewYear, now])

  const totalScreenings = data.reduce((s, d) => s + d.count, 0)
  const totalTBPositive = data.reduce((s, d) => s + d.tbPositive, 0)

  const monthCount = months.length
  const monthWidth = monthCount <= 3 ? 220 
                   : monthCount <= 6 ? 185 
                   : 160

  // Horizontal scroll with mouse wheel
  useEffect(() => {
    const el = calendarRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      }
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  // Reset scroll on year change
  useEffect(() => {
    if (calendarRef.current) {
      calendarRef.current.scrollLeft = 0
    }
  }, [viewYear])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-[#7a7974] uppercase tracking-widest font-medium">
            Screening Activity
          </p>
          <div className="flex items-baseline gap-3 mt-0.5">
            <span className="text-2xl font-bold text-[#28251d] tabular-nums">
              {totalScreenings.toLocaleString()}
            </span>
            <span className="text-sm text-[#7a7974]">screenings in {viewYear}</span>
            {totalTBPositive > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full
                              bg-[#e0ced7] text-[#a12c7b] font-medium">
                {totalTBPositive} TB+
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewYear(y => y - 1)}
            className="p-1.5 rounded-md text-[#7a7974] hover:bg-[#f3f0ec]
                       transition-colors" aria-label="Previous year">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-[#28251d] w-12 text-center">
            {viewYear}
          </span>
          <button onClick={() => setViewYear(y => y + 1)}
            disabled={viewYear >= now.getFullYear()}
            className="p-1.5 rounded-md text-[#7a7974] hover:bg-[#f3f0ec]
                       transition-colors disabled:opacity-30"
            aria-label="Next year">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Calendar grid with horizontal scroll */}
      <div className="relative">
        <div
          ref={calendarRef}
          className="flex gap-8 overflow-x-auto pb-3
                     scroll-smooth scrollbar-thin
                     scrollbar-thumb-[#d4d1ca] scrollbar-track-transparent"
          style={{ scrollbarWidth: 'thin' }}
        >
          {months.map(({ month, cells }) => {
            const monthTotal = cells
              .filter(Boolean)
              .reduce((sum, d) => sum + (dayMap[d!]?.count ?? 0), 0)

            return (
              <div key={month} className="flex-shrink-0" style={{ width: `${monthWidth}px` }}>
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-xs font-semibold text-[#7a7974]">
                    {MONTHS[month]}
                  </p>
                  {monthTotal > 0 ? (
                    <span className="text-[10px] text-[#01696f] font-medium tabular-nums">
                      {monthTotal.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#bab9b4]">—</span>
                  )}
                </div>
                {/* Day-of-week headers */}
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                  {DAYS.map((d, i) => (
                    <div key={i}
                      className="text-center text-[9px] text-[#bab9b4]">
                      {d}
                    </div>
                  ))}
                </div>
                {/* Day cells */}
                <div className="grid grid-cols-7 gap-0.5">
                  {cells.map((dateStr, i) => {
                    if (!dateStr) {
                      return <div key={i} className={monthCount <= 3 ? 'w-4 h-4' : 'aspect-square'} />
                    }
                    const day = dayMap[dateStr]
                    const count = day?.count ?? 0
                    const isSelected = selectedDate === dateStr
                    const isToday = dateStr === now.toISOString().split('T')[0]
                    const isFuture = dateStr > now.toISOString().split('T')[0]
                    const isUpdated = updatedDates?.has(dateStr)

                    return (
                      <motion.button
                        key={dateStr}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        initial={false}
                        animate={isUpdated ? {
                          scale: [1, 1.3, 1],
                          backgroundColor: [
                            getColor(count, maxCount).replace('bg-', ''),
                            '#01696f',
                            getColor(count, maxCount).replace('bg-', '')
                          ]
                        } : {}}
                        transition={{ duration: 0.5, ease: 'easeInOut' }}
                        onAnimationComplete={() => {
                          if (isUpdated) {
                            // Parent will remove from set
                          }
                        }}
                        onClick={() => {
                          if (!isFuture) {
                            sounds.calendarClick();
                            onDayClick(dateStr);
                          }
                        }}
                        disabled={isFuture}
                        title={count > 0
                          ? `${dateStr}\n${count} screened${day?.suspected ? ` | ${day.suspected} suspected` : ''}${day?.tbPositive ? ` | ${day.tbPositive} TB+` : ''}${day?.attStarted ? ` | ${day.attStarted} on ATT` : ''}${day?.referred ? ` | ${day.referred} referred` : ''}`
                          : dateStr
                        }
                        className={cn(
                          'rounded-[2px] transition-all duration-100',
                          'disabled:cursor-not-allowed disabled:opacity-30',
                          monthCount <= 3 ? 'w-4 h-4' : 'aspect-square',
                          isFuture ? 'bg-[#f3f0ec]/50' : getColor(count, maxCount),
                          isSelected && 'ring-2 ring-[#01696f] ring-offset-1',
                          isToday && !isSelected && 'ring-2 ring-[#964219] ring-offset-1',
                          isUpdated && 'ring-2 ring-[#10b981] ring-offset-1 shadow-lg shadow-emerald-500/50',
                        )}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        {/* Fade hint on right edge */}
        <div className="absolute top-0 right-0 bottom-3 w-8
                       bg-gradient-to-l from-[#f7f6f2] to-transparent
                       pointer-events-none" />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-6 justify-end">
        <span className="text-xs text-[#7a7974]">Less</span>
        {['bg-[#e6e4df]','bg-[#cedcd8]','bg-[#9ec8c4]',
          'bg-[#4f98a3]','bg-[#01696f]','bg-[#0f3638]'].map(c => (
          <div key={c} className={`w-3 h-3 rounded-[2px] ${c}`} />
        ))}
        <span className="text-xs text-[#7a7974]">More</span>
      </div>
    </div>
  )
}
