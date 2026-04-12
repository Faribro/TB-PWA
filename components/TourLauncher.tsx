'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTourStore, LANGUAGE_NAMES, type LanguageCode } from '@/stores/tourStore'
import { ALL_TOURS } from '@/lib/tours'
import { Map, X, CheckCircle, Volume2, VolumeX, Search } from 'lucide-react'
import { usePathname } from 'next/navigation'

const CATEGORY_COLORS = {
  screening: { accent: '#10b981', dark: '#065f46' },
  pipeline: { accent: '#6366f1', dark: '#3730a3' },
  analytics: { accent: '#f59e0b', dark: '#92400e' },
  admin: { accent: '#f43f5e', dark: '#9f1239' },
  navigation: { accent: '#8b5cf6', dark: '#5b21b6' },
  clinical: { accent: '#14b8a6', dark: '#0f766e' },
} as const

const PREMIUM_THEME = {
  panelGradient: 'linear-gradient(160deg, #f6fff8 0%, #f8fafc 55%, #fefce8 100%)',
  panelBorder: '1px solid rgba(16, 185, 129, 0.26)',
  panelShadow: '0 26px 70px rgba(5, 46, 22, 0.17), 0 0 0 1px rgba(251, 191, 36, 0.2)',
  title: '#0f172a',
  body: '#475569',
  muted: '#64748b',
  emerald: '#10b981',
  gold: '#b45309',
  chipBg: 'rgba(255, 255, 255, 0.8)',
  chipBorder: '1px solid rgba(148, 163, 184, 0.34)',
  chipActiveBg: 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(251,191,36,0.14))',
  chipActiveBorder: '1px solid rgba(16,185,129,0.36)',
}

export default function TourLauncher() {
  const { isRunning, startTour, completedTours, language, speechEnabled, setLanguage, toggleSpeech } = useTourStore()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const pathname = usePathname()

  const categories = ['All', 'Screening', 'Pipeline', 'Analytics', 'Admin', 'Navigation', 'Clinical'] as const
  
  // Memoize enabled tours list (used for filtering and progress calculation)
  const enabledTours = useMemo(() => ALL_TOURS.filter((tour) => tour.enabled !== false), [])
  
  // Memoize enabled tour IDs set for O(1) lookup
  const enabledTourIds = useMemo(() => new Set(enabledTours.map(t => t.id)), [enabledTours])
  
  // Filter tours by category AND search query
  const filteredTours = useMemo(() => {
    let tours = enabledTours
    
    // Apply category filter
    if (selectedCategory !== 'All') {
      tours = tours.filter((tour) => tour.category.toLowerCase() === selectedCategory.toLowerCase())
    }
    
    // Apply search filter (case-insensitive, matches title/description/category)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      tours = tours.filter((tour) => 
        tour.title.toLowerCase().includes(query) ||
        tour.description.toLowerCase().includes(query) ||
        tour.category.toLowerCase().includes(query)
      )
    }
    
    return tours
  }, [selectedCategory, searchQuery, enabledTours])
  
  // Calculate completed count (only count enabled tours)
  const completedEnabledCount = useMemo(
    () => completedTours.filter(id => enabledTourIds.has(id)).length,
    [completedTours, enabledTourIds]
  )

  const handleStartTour = (tour: (typeof ALL_TOURS)[0]) => {
    startTour(tour)
    setIsOpen(false)
  }

  // Hide launcher on docs pages and when tour is running
  const shouldHide = pathname.startsWith('/docs') || isRunning
  if (shouldHide) return null

  return (
    <>
      {/* Launcher Button */}
      <motion.button
        drag
        dragMomentum={false}
        dragConstraints={{ left: -(typeof window !== 'undefined' ? window.innerWidth : 1920), right: 0, top: -(typeof window !== 'undefined' ? window.innerHeight : 1080), bottom: 0 }}
        whileHover={{ scale: 1.1, boxShadow: '0 0 20px rgba(99,102,241,0.5)' }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '24px',
          width: '54px',
          height: '54px',
          borderRadius: '9999px',
          background: 'white',
          border: '2px solid #6366f1',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          cursor: 'grab',
          zIndex: 9980,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        suppressHydrationWarning
      >
        <Map size={24} style={{ color: '#6366f1' }} suppressHydrationWarning />
      </motion.button>

      {/* Tooltip */}
      <div
        style={{
          position: 'fixed',
          bottom: '136px',
          right: '24px',
          background: '#1e293b',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 800,
          zIndex: 9980,
          opacity: isOpen ? 0 : 1,
          pointerEvents: 'none',
          transition: 'opacity 0.2s',
          letterSpacing: '0.1em'
        }}
        suppressHydrationWarning
      >
      </div>

      {/* Tour Picker Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              position: 'fixed',
              bottom: '140px',
              right: '24px',
              width: '360px',
              maxHeight: '520px',
              overflowY: 'auto',
              zIndex: 9980,
              background: PREMIUM_THEME.panelGradient,
              border: PREMIUM_THEME.panelBorder,
              borderRadius: '1.25rem',
              boxShadow: PREMIUM_THEME.panelShadow,
            }}
          >
            {/* Header */}
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(15, 23, 42, 0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: PREMIUM_THEME.title,
                    fontFamily: 'var(--font-outfit)',
                    margin: 0,
                    letterSpacing: '0.2px',
                    textShadow: '0 0 12px rgba(16, 185, 129, 0.08)',
                  }}>
                    NEURAL_LINK
                  </h3>
                  <p style={{
                    fontSize: '12px',
                    color: PREMIUM_THEME.muted,
                    fontFamily: 'var(--font-share-tech-mono)',
                    margin: '4px 0 0',
                  }}>
                    Operational walkthrough protocols
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Language + Sound Controls */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: '12px',
                    border: '1px solid rgba(148,163,184,0.35)',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.85)',
                    color: PREMIUM_THEME.title,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-outfit)',
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6)',
                  }}
                >
                  {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
                
                <button
                  onClick={toggleSpeech}
                  style={{
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: speechEnabled
                      ? '1px solid rgba(16,185,129,0.45)'
                      : '1px solid rgba(148,163,184,0.36)',
                    borderRadius: '8px',
                    background: speechEnabled
                      ? 'linear-gradient(135deg, rgba(16,185,129,0.16), rgba(251,191,36,0.14))'
                      : 'rgba(255,255,255,0.86)',
                    color: speechEnabled ? '#065f46' : PREMIUM_THEME.body,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    boxShadow: speechEnabled
                      ? '0 0 0 2px rgba(16,185,129,0.12), 0 4px 14px rgba(6,95,70,0.12)'
                      : 'none',
                  }}
                >
                  {speechEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  {speechEnabled ? 'Sound On' : 'Sound Off'}
                </button>
              </div>
            </div>
            
            {/* Search Bar */}
            <div style={{ padding: '12px 20px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search tours by title, category, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    fontSize: '12px',
                    border: '1px solid rgba(148,163,184,0.34)',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.9)',
                    color: PREMIUM_THEME.title,
                    outline: 'none',
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.65)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = PREMIUM_THEME.emerald
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.13)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(148,163,184,0.34)'
                    e.currentTarget.style.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,0.65)'
                  }}
                />
              </div>
            </div>

            {/* Category Filter */}
            <div style={{ padding: '12px 20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  style={{
                    background: selectedCategory === category ? PREMIUM_THEME.chipActiveBg : PREMIUM_THEME.chipBg,
                    color: selectedCategory === category ? '#065f46' : PREMIUM_THEME.muted,
                    border: selectedCategory === category ? PREMIUM_THEME.chipActiveBorder : PREMIUM_THEME.chipBorder,
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: selectedCategory === category ? '0 0 0 2px rgba(251,191,36,0.08)' : 'none',
                  }}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Tour List */}
            <div style={{ padding: '0' }}>
              {filteredTours.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: '#94a3b8', fontFamily: 'var(--font-outfit)' }}>
                    No tours found. Try a different keyword.
                  </p>
                </div>
              ) : (
                filteredTours.map((tour, index) => {
                  const isCompleted = completedTours.includes(tour.id)
                  const colors = CATEGORY_COLORS[tour.category]
                  return (
                    <div
                      key={tour.id}
                      onClick={() => handleStartTour(tour)}
                      style={{
                        padding: '14px 20px',
                        borderBottom: index === filteredTours.length - 1 ? 'none' : '1px solid rgba(15, 23, 42, 0.05)',
                        cursor: 'pointer',
                        transition: 'background 0.2s, box-shadow 0.2s',
                        background: index % 2 === 0 ? 'rgba(255,255,255,0.48)' : 'rgba(255,255,255,0.22)',
                      }}
                      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(251,191,36,0.06))'
                        e.currentTarget.style.boxShadow = 'inset 0 0 0 1px rgba(16,185,129,0.15)'
                        const titleEl = e.currentTarget.querySelector('.tour-title') as HTMLElement
                        if (titleEl) titleEl.style.color = '#065f46'
                      }}
                      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                        e.currentTarget.style.background = index % 2 === 0 ? 'rgba(255,255,255,0.48)' : 'rgba(255,255,255,0.22)'
                        e.currentTarget.style.boxShadow = 'none'
                        const titleEl = e.currentTarget.querySelector('.tour-title') as HTMLElement
                        if (titleEl) titleEl.style.color = PREMIUM_THEME.title
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="tour-title" style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', transition: 'color 0.2s' }}>
                          {tour.title}
                        </span>
                        {isCompleted && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                            <CheckCircle size={12} />
                            <span style={{ fontSize: '10px', fontWeight: 600 }}>Completed</span>
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: '12px', color: PREMIUM_THEME.body, marginTop: '4px' }}>
                        {tour.description}
                      </p>
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          style={{
                            background: `${colors.accent}12`,
                            color: colors.dark,
                            borderRadius: '9999px',
                            padding: '2px 8px',
                            fontSize: '9px',
                            fontFamily: 'var(--font-share-tech-mono)',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {tour.category}
                        </span>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'var(--font-share-tech-mono)' }}>
                          {tour.steps.length} steps
                        </span>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'var(--font-share-tech-mono)' }}>
                          ~{tour.estimatedMinutes} min
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(15, 23, 42, 0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: PREMIUM_THEME.body }}>
                  {completedEnabledCount}/{enabledTours.length} tours completed
                </span>
              </div>
              <div
                style={{
                  height: '3px',
                  background: '#f1f5f9',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.min((completedEnabledCount / enabledTours.length) * 100, 100)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #10b981 0%, #f59e0b 100%)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <p style={{ fontSize: '10px', color: PREMIUM_THEME.gold, fontFamily: 'var(--font-share-tech-mono)', marginTop: '8px', margin: '8px 0 0 0', letterSpacing: '0.3px' }}>
                Premium guided workflows
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
