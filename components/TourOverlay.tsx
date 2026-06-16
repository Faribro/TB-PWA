'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTourStore, type LanguageCode } from '@/stores/tourStore'
import { ALL_TOURS } from '@/lib/tours'
import {
  X,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Map,
  CheckCircle,
  Scan,
  GitBranch,
  BarChart3,
  Shield,
  Stethoscope,
  AlertTriangle,
} from 'lucide-react'

const CATEGORY_ICONS = {
  screening: Scan,
  pipeline: GitBranch,
  analytics: BarChart3,
  admin: Shield,
  navigation: Map,
  clinical: Stethoscope,
} as const

const CATEGORY_ACCENT: Record<string, string> = {
  screening: '#10b981',
  pipeline: '#6366f1',
  analytics: '#f59e0b',
  admin: '#f43f5e',
  navigation: '#8b5cf6',
  clinical: '#14b8a6',
}
const CALM_INTENSITY: { energy: number; grain: number } = {
  energy: 0.7,
  grain: 0.48,
}

const LANGUAGE_TO_LOCALE: Record<LanguageCode, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  ur: 'ur-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  or: 'or-IN',
  as: 'as-IN',
  ne: 'ne-NP',
  sd: 'sd-IN',
  kok: 'kok-IN',
  mai: 'mai-IN',
  sa: 'sa-IN',
  mni: 'mni-IN',
  doi: 'doi-IN',
  brx: 'brx-IN',
  ks: 'ks-IN',
}

const LANGUAGE_TO_TRANSLATE_CODE: Record<LanguageCode, string> = {
  en: 'en',
  hi: 'hi',
  mr: 'mr',
  gu: 'gu',
  ta: 'ta',
  te: 'te',
  bn: 'bn',
  ur: 'ur',
  kn: 'kn',
  ml: 'ml',
  pa: 'pa',
  or: 'or',
  as: 'as',
  ne: 'ne',
  sd: 'sd',
  kok: 'gom', // LibreTranslate prefers gom for Konkani
  mai: 'mai',
  sa: 'sa',
  mni: 'mni',
  doi: 'doi',
  brx: 'brx',
  ks: 'ks',
}

export default function TourOverlay() {
  const {
    activeTour,
    currentStep,
    isRunning,
    isMinimized,
    completedTours,
    language,
    speechEnabled,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    minimizeTour,
    restoreTour,
    jumpToStep,
  } = useTourStore()

  const router = useRouter()
  const pathname = usePathname()

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [targetNotFound, setTargetNotFound] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [searchTrigger, setSearchTrigger] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)

  const findTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clickRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectDateClickInProgressRef = useRef(false)
  const clickActionExecutedRef = useRef(false)
  const clinicalRecoveryRef = useRef({ facilityClicked: false, patientClicked: false })
  const confettiRef = useRef<HTMLDivElement>(null)
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const speechQueueTokenRef = useRef(0)
  const highlightedElementRef = useRef<HTMLElement | null>(null)
  const highlightedElementStyleRef = useRef<{
    transform: string
    transition: string
    transformOrigin: string
    zIndex: string
  } | null>(null)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const translationCacheRef = useRef<Record<string, string>>({})
  const [resolvedTitle, setResolvedTitle] = useState('')
  const [resolvedBody, setResolvedBody] = useState('')
  const [translationInProgress, setTranslationInProgress] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechLevel, setSpeechLevel] = useState(0.35)

  // ─── Derive step early (before callbacks that depend on it) ──────────────
  const step = activeTour?.steps[currentStep]
  const totalSteps = activeTour?.steps.length ?? 0
  const isCenterStep = !step?.target || step.placement === 'center'
  const isLastStep = currentStep === totalSteps - 1
  const CategoryIcon = step ? CATEGORY_ICONS[activeTour!.category] : Map
  const accentColor = activeTour ? (CATEGORY_ACCENT[activeTour.category] ?? '#6366f1') : '#6366f1'
  const intensity = CALM_INTENSITY

  // ─── Localization + Voice Helpers ────────────────────────────────────────
  const getLocalizedText = useCallback((text: string | Partial<Record<LanguageCode, string>>): string => {
    if (typeof text === 'string') return text
    // Fallback chain: selected language → English → first available
    return text[language] || text['en'] || Object.values(text)[0] || ''
  }, [language])

  const getEnglishText = useCallback((text: string | Partial<Record<LanguageCode, string>>): string => {
    if (typeof text === 'string') return text
    return text.en || Object.values(text)[0] || ''
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const cached = window.localStorage.getItem('tour-translation-cache-v1')
      if (cached) {
        translationCacheRef.current = JSON.parse(cached) as Record<string, string>
      }
    } catch {
      // Ignore malformed cache.
    }
  }, [])

  const persistTranslationCache = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('tour-translation-cache-v1', JSON.stringify(translationCacheRef.current))
    } catch {
      // Ignore storage errors.
    }
  }, [])

  const translateText = useCallback(async (sourceText: string, targetLanguage: LanguageCode) => {
    if (!sourceText.trim() || targetLanguage === 'en') return sourceText

    const targetCode = LANGUAGE_TO_TRANSLATE_CODE[targetLanguage] ?? 'en'
    const cacheKey = `${targetCode}::${sourceText}`
    const cachedValue = translationCacheRef.current[cacheKey]
    if (cachedValue) return cachedValue

    // Provider 1: Google's public translate endpoint (free, no key)
    // Provider 2/3: LibreTranslate public instances
    const providers = [
      async () => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 4000)
        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(targetCode)}&dt=t&q=${encodeURIComponent(sourceText)}`
          const response = await fetch(url, { method: 'GET', signal: controller.signal })
          if (!response.ok) return null
          const data = (await response.json()) as unknown
          if (!Array.isArray(data) || !Array.isArray(data[0])) return null
          const translated = (data[0] as Array<[string, string]>)
            .map((part) => (Array.isArray(part) ? part[0] : ''))
            .join('')
            .trim()
          return translated || null
        } catch {
          return null
        } finally {
          clearTimeout(timeout)
        }
      },
      async () => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 3500)
        try {
          const response = await fetch('https://libretranslate.de/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              q: sourceText,
              source: 'en',
              target: targetCode,
              format: 'text',
            }),
            signal: controller.signal,
          })
          if (!response.ok) return null
          const payload = (await response.json()) as { translatedText?: string }
          return payload.translatedText?.trim() || null
        } catch {
          return null
        } finally {
          clearTimeout(timeout)
        }
      },
      async () => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 3500)
        try {
          const response = await fetch('https://translate.argosopentech.com/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              q: sourceText,
              source: 'en',
              target: targetCode,
              format: 'text',
            }),
            signal: controller.signal,
          })
          if (!response.ok) return null
          const payload = (await response.json()) as { translatedText?: string }
          return payload.translatedText?.trim() || null
        } catch {
          return null
        } finally {
          clearTimeout(timeout)
        }
      },
    ]

    try {
      for (const provider of providers) {
        const translated = await provider()
        if (translated && translated !== sourceText) {
          translationCacheRef.current[cacheKey] = translated
          persistTranslationCache()
          return translated
        }
      }
      return sourceText
    } catch {
      return sourceText
    }
  }, [persistTranslationCache])

  useEffect(() => {
    let cancelled = false
    const resolveStepText = async () => {
      if (!step) {
        setResolvedTitle('')
        setResolvedBody('')
        setTranslationInProgress(false)
        return
      }

      const localizedTitle = getLocalizedText(step.title)
      const localizedBody = getLocalizedText(step.body)
      const hasNativeTitle = typeof step.title !== 'string' && Boolean(step.title[language])
      const hasNativeBody = typeof step.body !== 'string' && Boolean(step.body[language])
      if (language === 'en' || (hasNativeTitle && hasNativeBody)) {
        setResolvedTitle(localizedTitle)
        setResolvedBody(localizedBody)
        setTranslationInProgress(false)
        return
      }

      setTranslationInProgress(true)
      const sourceTitle = getEnglishText(step.title) || localizedTitle
      const sourceBody = getEnglishText(step.body) || localizedBody
      const [translatedTitle, translatedBody] = await Promise.all([
        translateText(sourceTitle, language),
        translateText(sourceBody, language),
      ])
      if (cancelled) return
      setResolvedTitle(translatedTitle)
      setResolvedBody(translatedBody)
      setTranslationInProgress(false)
    }

    resolveStepText()
    return () => { cancelled = true }
  }, [step, language, getLocalizedText, getEnglishText, translateText])

  const stopSpeech = useCallback(() => {
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current)
      speechTimerRef.current = null
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    speechUtteranceRef.current = null
    speechQueueTokenRef.current += 1
    setIsSpeaking(false)
    setSpeechLevel(0.35)
  }, [])

  // Load available browser voices and keep updated.
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const synth = window.speechSynthesis
    const loadVoices = () => setAvailableVoices(synth.getVoices())
    loadVoices()
    synth.addEventListener('voiceschanged', loadVoices)
    return () => synth.removeEventListener('voiceschanged', loadVoices)
  }, [])

  const selectBestVoice = useCallback((locale: string): SpeechSynthesisVoice | undefined => {
    if (availableVoices.length === 0) return undefined
    const shortCode = locale.split('-')[0].toLowerCase()
    const qualityHint = (name: string) =>
      /(natural|neural|premium|enhanced|wavenet|zira|siri|google|microsoft)/i.test(name)

    const exact = availableVoices.find(v => v.lang.toLowerCase() === locale.toLowerCase())
    if (exact) return exact

    const baseLocale = availableVoices.find(v => v.lang.toLowerCase().startsWith(`${shortCode}-`))
    if (baseLocale) return baseLocale

    const hinted = availableVoices.find(v =>
      v.lang.toLowerCase().includes(shortCode) && qualityHint(v.name)
    )
    if (hinted) return hinted

    return availableVoices.find(v => v.lang.toLowerCase().startsWith('en-')) ?? availableVoices[0]
  }, [availableVoices])

  const speakStep = useCallback(() => {
    if (!speechEnabled || !step || typeof window === 'undefined') return
    if (!('speechSynthesis' in window)) return

    const synth = window.speechSynthesis
    const title = resolvedTitle.trim()
    const body = resolvedBody.trim()
    const fullText = `${title}${title && body ? '. ' : ''}${body}`.replace(/\s+/g, ' ').trim()
    if (!fullText) return

    stopSpeech()
    const queueToken = speechQueueTokenRef.current
    const preferredLocale = LANGUAGE_TO_LOCALE[language] ?? 'en-IN'
    const selectedVoice = selectBestVoice(preferredLocale)

    // Split long narration into sentence chunks to reduce clipping on some browsers.
    const chunks = fullText
      .split(/(?<=[.!?])\s+/)
      .map(chunk => chunk.trim())
      .filter(Boolean)

    const rateByLanguage: Partial<Record<LanguageCode, number>> = {
      en: 0.95,
      hi: 0.9,
      mr: 0.9,
      gu: 0.9,
      ta: 0.88,
      te: 0.88,
      bn: 0.9,
      ur: 0.9,
      kn: 0.88,
      ml: 0.88,
      pa: 0.9,
      or: 0.9,
      as: 0.9,
    }
    const pitchByLanguage: Partial<Record<LanguageCode, number>> = {
      en: 1.0,
      hi: 0.98,
      mr: 1.0,
      gu: 1.0,
      ta: 0.98,
      te: 0.98,
    }
    const configuredRate = rateByLanguage[language] ?? 0.92
    const configuredPitch = pitchByLanguage[language] ?? 1.0

    const speakChunk = (idx: number) => {
      if (speechQueueTokenRef.current !== queueToken) return
      if (idx >= chunks.length) return
      if (!speechEnabled) return

      const utterance = new SpeechSynthesisUtterance(chunks[idx])
      utterance.lang = selectedVoice?.lang ?? preferredLocale
      if (selectedVoice) utterance.voice = selectedVoice
      utterance.rate = configuredRate
      utterance.pitch = configuredPitch
      utterance.volume = 1
      utterance.onstart = () => {
        setIsSpeaking(true)
      }
      utterance.onend = () => {
        speechUtteranceRef.current = null
        setSpeechLevel(0.35)
        // Small natural pause between chunks
        speechTimerRef.current = setTimeout(() => speakChunk(idx + 1), 80)
        if (idx >= chunks.length - 1) {
          setIsSpeaking(false)
        }
      }
      utterance.onerror = () => {
        speechUtteranceRef.current = null
        setIsSpeaking(false)
      }

      speechUtteranceRef.current = utterance
      synth.speak(utterance)
    }

    // Delay slightly to avoid talking while route/animation is still settling.
    speechTimerRef.current = setTimeout(() => speakChunk(0), 320)
  }, [speechEnabled, step, language, resolvedTitle, resolvedBody, selectBestVoice, stopSpeech])

  // Stop narration when tour is paused/stopped/minimized or voice disabled.
  useEffect(() => {
    if (!isRunning || isMinimized || !speechEnabled) {
      stopSpeech()
    }
  }, [isRunning, isMinimized, speechEnabled, stopSpeech])

  // Soft reactive "audio cloud" level animation while speaking.
  useEffect(() => {
    if (!isSpeaking) return
    const tick = setInterval(() => {
      // Smooth pseudo level since Web Speech API doesn't expose audio amplitude.
      setSpeechLevel((prev) => {
        const target = 0.3 + Math.random() * 0.7
        return prev + (target - prev) * 0.35
      })
    }, 140)
    return () => clearInterval(tick)
  }, [isSpeaking])

  // Speak on step/tour/language changes; clean up on unmount.
  useEffect(() => {
    if (!isRunning || isMinimized || !step || !speechEnabled) return
    speakStep()
    return () => stopSpeech()
  }, [currentStep, activeTour?.id, isRunning, isMinimized, language, speechEnabled, step, speakStep, stopSpeech])

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const clearFindTimer = useCallback(() => {
    if (findTimerRef.current) {
      clearTimeout(findTimerRef.current)
      findTimerRef.current = null
    }
  }, [])

  const clearSpotlightZoom = useCallback(() => {
    const prevEl = highlightedElementRef.current
    const prevStyle = highlightedElementStyleRef.current
    if (!prevEl || !prevStyle) return

    prevEl.style.transform = prevStyle.transform
    prevEl.style.transition = prevStyle.transition
    prevEl.style.transformOrigin = prevStyle.transformOrigin
    prevEl.style.zIndex = prevStyle.zIndex
    highlightedElementRef.current = null
    highlightedElementStyleRef.current = null
  }, [])

  const applySpotlightZoom = useCallback((el: HTMLElement) => {
    if (highlightedElementRef.current === el) return
    clearSpotlightZoom()

    highlightedElementRef.current = el
    highlightedElementStyleRef.current = {
      transform: el.style.transform,
      transition: el.style.transition,
      transformOrigin: el.style.transformOrigin,
      zIndex: el.style.zIndex,
    }

    el.style.transformOrigin = 'center center'
    el.style.transition = el.style.transition
      ? `${el.style.transition}, transform 220ms cubic-bezier(0.16, 1, 0.3, 1)`
      : 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)'
    el.style.transform = `${el.style.transform || ''} scale(1.03)`.trim()
    el.style.zIndex = el.style.zIndex || '2'
  }, [clearSpotlightZoom])

  const normalizePath = (p: string) => p.replace(/\/$/, '') || '/'

  const calcRect = useCallback((el: Element): DOMRect => {
    const padding = step?.spotlightPadding ?? 6
    const r = el.getBoundingClientRect()
    return {
      ...r,
      top: r.top - padding,
      left: r.left - padding,
      width: r.width + padding * 2,
      height: r.height + padding * 2,
      bottom: r.bottom + padding,
      right: r.right + padding,
    } as DOMRect
  }, [step?.spotlightPadding])

  // Scroll helper that supports nested scroll containers (e.g. custom ScrollArea).
  const scrollElementIntoView = useCallback((el: HTMLElement) => {
    if (typeof window === 'undefined') return

    // Find nearest scrollable ancestor.
    let parent: HTMLElement | null = el.parentElement
    while (parent) {
      const style = window.getComputedStyle(parent)
      const overflowY = style.overflowY
      const canScroll = (overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight
      if (canScroll) {
        const cRect = parent.getBoundingClientRect()
        const eRect = el.getBoundingClientRect()
        const targetTop = eRect.top - cRect.top - (cRect.height - eRect.height) / 2
        parent.scrollTop += targetTop
        return
      }
      parent = parent.parentElement
    }

    // Fallback for normal document scrolling - use smooth behavior with center alignment
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    
    // For first-time-user tour steps that are below fold, ensure they're fully visible
    // by adding a small delay and checking viewport position
    setTimeout(() => {
      const rect = el.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const isPartiallyHidden = rect.bottom > viewportHeight || rect.top < 0
      
      if (isPartiallyHidden) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      }
    }, 100)
  }, [])

  // POST-SCROLL RECT RE-CALC: Critical for drawer sections
  // After scrolling, element position changes - must remeasure
  const scrollAndHighlight = useCallback((el: HTMLElement, onComplete?: () => void) => {
    scrollElementIntoView(el)
    
    // Wait for scroll to settle, then remeasure rect
    requestAnimationFrame(() => {
      setTimeout(() => {
        const updatedRect = calcRect(el)
        setTargetRect(updatedRect)
        setTargetNotFound(false)
        applySpotlightZoom(el)
        if (onComplete) onComplete()
      }, 150) // Allow smooth scroll to complete
    })
  }, [scrollElementIntoView, calcRect, applySpotlightZoom])

  // Resolve comma-separated selectors by priority (left-to-right),
  // Prefer visible elements (not hidden / zero-size)
  const getFirstMatchingElement = useCallback((selectorText: string) => {
    const selectors = selectorText.split(',').map(s => s.trim()).filter(Boolean)
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel)
        if (el instanceof HTMLElement) {
          // Check if element is visible (not hidden, not zero-size)
          const rect = el.getBoundingClientRect()
          const isVisible = rect.width > 0 && rect.height > 0 && 
                           window.getComputedStyle(el).visibility !== 'hidden' &&
                           window.getComputedStyle(el).display !== 'none' &&
                           rect.bottom > 0 &&
                           rect.right > 0 &&
                           rect.top < window.innerHeight &&
                           rect.left < window.innerWidth
          if (isVisible) return el
        }
      } catch {
        // skip invalid selector
      }
    }
    return null
  }, [])

  const handleNext = useCallback(() => {
    if (!activeTour || !isRunning) return
    stopSpeech()

    // Last step ends the tour
    if (isLastStep) {
      completeTour()
      return
    }

    const stepData = activeTour.steps[currentStep]
    if (!stepData) return

    // If this step requires a click, click the first matching target and then advance
    if (stepData.action === 'click' && stepData.target) {
      clickActionExecutedRef.current = true
      const selectors = stepData.target.split(',').map(s => s.trim())
      const desiredPath = stepData.navigateTo || stepData.route
      const currentPath =
        typeof window !== 'undefined' ? window.location.pathname : pathname

      const needsMoreTime =
        desiredPath && normalizePath(currentPath) !== normalizePath(desiredPath)

      // Special-case: "Select a Screening Date"
      // If there is no tile with data in the current month (common in empty months),
      // click the prev-month arrow repeatedly until we find one.
      if (stepData.id === 'select-date') {
        const DAY_SELECTOR = selectors[0] // tours.ts uses a single selector for the active day
        const PREV_ARROW_SELECTOR = '[data-tour-id="neural-timeline-prev-month"]'

        const MAX_CYCLES = 18 // 18 * ~750ms = ~13.5s worst-case
        const INTERVAL = 750

        const tryFindAndClick = (cycle: number) => {
          if (cycle >= MAX_CYCLES) {
            selectDateClickInProgressRef.current = false
            nextStep()
            return
          }

          const dayEl = document.querySelector(DAY_SELECTOR)
          if (dayEl instanceof HTMLElement) {
            // Ensure spotlight switches immediately to the clicked day tile.
            setTargetRect(calcRect(dayEl))
            setTargetNotFound(false)
            scrollElementIntoView(dayEl)
            dayEl.click()
            setTimeout(() => {
              // Vertex may auto-select a different tile after month navigation;
              // re-spotlight the actual selected tile once UI settles.
              const selectedEl = document.querySelector('[data-tour-id="neural-timeline-day"][data-selected="true"]')
              if (selectedEl instanceof HTMLElement) {
                setTargetRect(calcRect(selectedEl))
                setTargetNotFound(false)
              }
              selectDateClickInProgressRef.current = false
              nextStep()
            }, needsMoreTime ? 1100 : 900)
            return
          }

          const prevArrowEl = document.querySelector(PREV_ARROW_SELECTOR)
          if (prevArrowEl instanceof HTMLElement && !(prevArrowEl as HTMLButtonElement).disabled) {
            prevArrowEl.click()
            setTimeout(() => tryFindAndClick(cycle + 1), INTERVAL)
            return
          }

          // No arrow / no tile found — continue tour without getting stuck
          selectDateClickInProgressRef.current = false
          nextStep()
        }

        selectDateClickInProgressRef.current = true
        setTimeout(() => tryFindAndClick(0), 0)
        return
      }

      // Special-case: Tab switching steps (clinical-tab-open, admin-journey-tab, demographics-tab)
      // These need to click the tab trigger AND wait for content to render
      // NO SILENT SKIP - always attempt recovery if drawer missing
      if (stepData.id === 'clinical-tab-open' || stepData.id === 'admin-journey-tab' || stepData.id === 'demographics-tab') {
        const TAB_SELECTOR = stepData.target!
        const MAX_CYCLES = 30 // Increased from 20 for better reliability
        const INTERVAL = 300

        const tryClickTab = (cycle: number) => {
          if (cycle >= MAX_CYCLES) {
            // Max retries exhausted - show targetNotFound, DO NOT auto-advance
            setTargetRect(null)
            setTargetNotFound(true)
            return
          }

          // First ensure drawer is open
          const clinicalTab = document.querySelector('[data-tour-id="clinical-tab"]')
          if (!(clinicalTab instanceof HTMLElement)) {
            // Drawer not open - attempt recovery (NO SILENT SKIP)
            const patientListPanel = document.querySelector('[data-tour-id="patient-list-panel"]')
            
            if (!(patientListPanel instanceof HTMLElement) && !clinicalRecoveryRef.current.facilityClicked) {
              // Step 1: Open facility to show patient list
              const facilityCard = document.querySelector('[data-tour-id="facility-card"]')
              if (facilityCard instanceof HTMLElement && !(facilityCard as HTMLButtonElement).disabled) {
                facilityCard.click()
                clinicalRecoveryRef.current.facilityClicked = true
              }
            } else if (!clinicalRecoveryRef.current.patientClicked) {
              // Step 2: Click patient card to open drawer
              const patientCard = document.querySelector('[data-tour-id="patient-card"]')
              if (patientCard instanceof HTMLElement && !(patientCard as HTMLButtonElement).disabled) {
                patientCard.click()
                clinicalRecoveryRef.current.patientClicked = true
              }
            }
            
            // Retry after recovery attempt
            setTimeout(() => tryClickTab(cycle + 1), INTERVAL)
            return
          }

          // Drawer is open - find the tab trigger ONLY within drawer (strict scoping)
          const drawerContainer = clinicalTab.closest('[role="dialog"]') || clinicalTab.closest('.sheet-content')
          if (!drawerContainer) {
            setTimeout(() => tryClickTab(cycle + 1), INTERVAL)
            return
          }
          
          const tabTrigger = drawerContainer.querySelector(TAB_SELECTOR)
          
          if (tabTrigger instanceof HTMLElement && !(tabTrigger as HTMLButtonElement).disabled) {
            // Check if tab is already active
            const isActive = tabTrigger.getAttribute('data-state') === 'active' || 
                           tabTrigger.getAttribute('aria-selected') === 'true'
            
            if (!isActive) {
              // Click to activate tab with post-scroll recalc
              scrollAndHighlight(tabTrigger, () => {
                tabTrigger.click()
                
                // Wait for tab content to render
                setTimeout(() => {
                  // Verify tab is now active
                  const nowActive = tabTrigger.getAttribute('data-state') === 'active' || 
                                  tabTrigger.getAttribute('aria-selected') === 'true'
                  if (nowActive) {
                    // Re-measure after tab activation
                    requestAnimationFrame(() => {
                      setTimeout(() => {
                        setTargetRect(calcRect(tabTrigger))
                        nextStep()
                      }, 100)
                    })
                  } else {
                    // Retry if tab didn't activate
                    setTimeout(() => tryClickTab(cycle + 1), INTERVAL)
                  }
                }, 400)
              })
              return
            } else {
              // Tab already active - highlight with post-scroll recalc and advance
              scrollAndHighlight(tabTrigger, () => {
                setTimeout(() => nextStep(), 600)
              })
              return
            }
          }

          // Tab trigger not found - retry
          setTimeout(() => tryClickTab(cycle + 1), INTERVAL)
        }

        setTimeout(() => tryClickTab(0), 0)
        return
      }
      // If patient cards are not yet visible, open a facility first, then click patient.
      if (stepData.id === 'open-patient-record' || stepData.id === 'patient-list') {
        const PATIENT_SELECTOR = '[data-tour-id="patient-card"]'
        const FACILITY_SELECTOR = '[data-tour-id="facility-card"]'
        const MAX_CYCLES = 18
        const INTERVAL = 550

        const tryOpenAndClickPatient = (cycle: number) => {
          if (cycle >= MAX_CYCLES) {
            nextStep()
            return
          }

          const patientEl = document.querySelector(PATIENT_SELECTOR)
          if (patientEl instanceof HTMLElement && !(patientEl as HTMLButtonElement).disabled) {
            setTargetRect(calcRect(patientEl))
            setTargetNotFound(false)
            scrollElementIntoView(patientEl)
            patientEl.click()

            // Ensure the patient drawer is actually open before advancing.
            const waitForDrawer = (retry: number) => {
              const clinicalTab = document.querySelector('[data-tour-id="clinical-tab"]')
              if (clinicalTab instanceof HTMLElement) {
                setTimeout(() => nextStep(), 250)
                return
              }
              if (retry >= 10) {
                nextStep()
                return
              }
              setTimeout(() => waitForDrawer(retry + 1), 180)
            }

            setTimeout(() => waitForDrawer(0), 200)
            return
          }

          // Patient list likely closed/not loaded; open any visible facility row first.
          const facilityEl = document.querySelector(FACILITY_SELECTOR)
          if (facilityEl instanceof HTMLElement && !(facilityEl as HTMLButtonElement).disabled) {
            setTargetRect(calcRect(facilityEl))
            setTargetNotFound(false)
            scrollElementIntoView(facilityEl)
            facilityEl.click()
          }

          setTimeout(() => tryOpenAndClickPatient(cycle + 1), INTERVAL)
        }

        setTimeout(() => tryOpenAndClickPatient(0), 0)
        return
      }

      // Step-specific timing so Vertex state changes stay in sync.
      const isSelectDateStep = stepData.id === 'select-date'
      const isNavigateToMarchStep = stepData.id === 'navigate-to-march'

      // Ensure spotlight is visible immediately before clicking the arrow.
      if (isNavigateToMarchStep) {
        const arrowEl = document.querySelector('[data-tour-id="neural-timeline-prev-month"]')
        if (arrowEl instanceof HTMLElement) {
          setTargetRect(calcRect(arrowEl))
          setTargetNotFound(false)
        }
      }

      // Step 4 ('select-date') is the one that often needs the calendar to auto-jump.
      const MAX_RETRIES = isSelectDateStep
        ? 240 // ~60s at 250ms
        : isNavigateToMarchStep
          ? 20
          : 40
      const INTERVAL = 250

      const tryClick = (attempt: number) => {
        let el: Element | null = null

        for (const sel of selectors) {
          try {
            el = document.querySelector(sel)
            if (el) break
          } catch {
            // Invalid selector — skip
          }
        }

        if (el instanceof HTMLElement && !(el as HTMLButtonElement).disabled) {
          // Keep spotlight aligned and ensure the element is clickable (inside scroll areas).
          setTargetRect(calcRect(el))
          setTargetNotFound(false)
          scrollElementIntoView(el)
          el.click()

          // After expanding drawers, scroll the newly revealed content into view
          // so users can immediately see what opened.
          if (stepData.id === 'state-drawer') {
            setTimeout(() => {
              const districtEl = document.querySelector('[data-tour-id="district-drawer"]')
              if (districtEl instanceof HTMLElement) {
                scrollElementIntoView(districtEl)
              }
            }, 450)
          } else if (stepData.id === 'district-drawer') {
            setTimeout(() => {
              const facilityEl = document.querySelector('[data-tour-id="facility-card"]')
              if (facilityEl instanceof HTMLElement) {
                scrollElementIntoView(facilityEl)
              }
            }, 450)
          }

          const advanceDelay = isSelectDateStep
            ? (needsMoreTime ? 1400 : 1500)
            : isNavigateToMarchStep
              ? 1100
              : (needsMoreTime ? 900 : 600)

          setTimeout(() => nextStep(), advanceDelay)
          return
        }

        if (attempt < MAX_RETRIES) {
          if (clickRetryTimerRef.current) clearTimeout(clickRetryTimerRef.current)
          clickRetryTimerRef.current = setTimeout(() => tryClick(attempt + 1), INTERVAL)
        } else {
          // Give up gracefully — allow tour to continue
          nextStep()
        }
      }

      tryClick(0)
      return
    }

    nextStep()
  }, [activeTour, currentStep, completeTour, isLastStep, isRunning, nextStep, stopSpeech])

  // ─── findElement with navigation guard ─────────────────────
  useEffect(() => {
    if (!activeTour || !isRunning || isMinimized) return

    const currentStepData = activeTour.steps[currentStep]
    if (!currentStepData) return

    // Prevent navigation check or element finding if click action is executed
    if (clickActionExecutedRef.current) return

    // Prevent the normal element-finding effect from overriding the spotlight while
    // we are doing the select-date special click-through logic.
    if (currentStepData.id === 'select-date' && selectDateClickInProgressRef.current) return

    // Navigate if on wrong page (checks step's route)
    const targetPath = currentStepData.route
    const currentNorm = normalizePath(pathname)
    const targetNorm = targetPath ? normalizePath(targetPath) : null

    if (targetNorm && currentNorm !== targetNorm) {
      clearFindTimer()
      setTargetRect(null)
      setTargetNotFound(false)
      clearSpotlightZoom()
      setIsNavigating(true)
      router.push(targetPath)
      return
    }

    // If still navigating, don't start search yet
    if (isNavigating) return

    // Center steps — skip element search entirely
    if (!currentStepData.target || currentStepData.placement === 'center') {
      clearFindTimer()
      setTargetRect(null)
      setTargetNotFound(false)
      clearSpotlightZoom()
      return
    }

    // BUG 1: findElement with not-found fallback
    clearFindTimer()
    setTargetNotFound(false)

    let attempts = 0
    const isCalendarStep = currentStepData.id === 'neural-timeline-calendar'
    const isNavigateToMarchStep = currentStepData.id === 'navigate-to-march'
    const isClinicalTailStep = [
      'clinical-tab-open',
      'open-patient-record',
      'clinical-sputum',
      'clinical-diagnosis',
      'clinical-att',
      'submit-or-close',
      'admin-journey-tab',
      'demographics-tab',
    ].includes(currentStepData.id)
    const MAX_ATTEMPTS = currentStepData.action === 'click'
      ? 40
      : isCalendarStep
        ? 140
        : isClinicalTailStep
          ? 60
          : 15
    const INTERVAL = isNavigateToMarchStep
      ? 120
      : currentStepData.action === 'click'
        ? 250
        : isCalendarStep
          ? 120
          : 200

    const findElement = () => {
      // STRICT DRAWER CONTEXT ENFORCEMENT FOR CLINICAL TAIL STEPS
      // These steps MUST be inside patient drawer - never fallback to Vertex pane
      const isClinicalDrawerStep = [
        'clinical-tab-open',
        'clinical-sputum',
        'clinical-diagnosis', 
        'clinical-att',
        'submit-or-close',
        'admin-journey-tab',
        'demographics-tab'
      ].includes(currentStepData.id)

      if (isClinicalDrawerStep) {
        // First check: Is drawer actually open?
        const clinicalTab = document.querySelector('[data-tour-id="clinical-tab"]')
        if (!(clinicalTab instanceof HTMLElement)) {
          // Drawer not open - attempt recovery (NO SILENT SKIP)
          if (attempts < MAX_ATTEMPTS) {
            const patientListPanel = document.querySelector('[data-tour-id="patient-list-panel"]')
            
            if (!(patientListPanel instanceof HTMLElement) && !clinicalRecoveryRef.current.facilityClicked) {
              // Step 1: Open facility to show patient list
              const facilityCard = document.querySelector('[data-tour-id="facility-card"]')
              if (facilityCard instanceof HTMLElement && !(facilityCard as HTMLButtonElement).disabled) {
                facilityCard.click()
                clinicalRecoveryRef.current.facilityClicked = true
              }
            } else if (!clinicalRecoveryRef.current.patientClicked) {
              // Step 2: Click patient card to open drawer
              const patientCard = document.querySelector('[data-tour-id="patient-card"]')
              if (patientCard instanceof HTMLElement && !(patientCard as HTMLButtonElement).disabled) {
                patientCard.click()
                clinicalRecoveryRef.current.patientClicked = true
              }
            }
            
            attempts++
            findTimerRef.current = setTimeout(findElement, INTERVAL)
            return
          } else {
            // Max retries reached - show targetNotFound (NO SILENT SKIP)
            setTargetRect(null)
            setTargetNotFound(true)
            return
          }
        }

        // Drawer is open - STRICT DRAWER-SCOPED QUERYING
        // Query ONLY within drawer container, never document-wide first
        const drawerContainer = clinicalTab.closest('[role="dialog"]') || clinicalTab.closest('.sheet-content')
        if (!drawerContainer) {
          attempts++
          findTimerRef.current = setTimeout(findElement, INTERVAL)
          return
        }

        const targetSelector = currentStepData.target!
        const selectors = targetSelector.split(',').map(s => s.trim())
        
        let foundElement: Element | null = null
        // Selector priority: left-to-right within drawer only
        for (const sel of selectors) {
          try {
            const el = drawerContainer.querySelector(sel) // Query within drawer first
            if (el instanceof HTMLElement) {
              // For submit-clinical-update and other deep-drawer elements,
              // skip the viewport visibility check — scrollAndHighlight will scroll them into view
              const isSubmitButton = sel.includes('submit-clinical-update') || sel.includes('close-loop-button')
              if (isSubmitButton) {
                // Only need the element to exist in the DOM, not be in viewport
                const style = window.getComputedStyle(el)
                if (style.display !== 'none' && style.visibility !== 'hidden') {
                  foundElement = el
                  break
                }
              } else {
                // Visibility check for other elements
                const rect = el.getBoundingClientRect()
                const isVisible = rect.width > 0 && rect.height > 0 && 
                                 window.getComputedStyle(el).visibility !== 'hidden' &&
                                 window.getComputedStyle(el).display !== 'none'
                if (isVisible) {
                  foundElement = el
                  break
                }
              }
            }
          } catch {
            // Invalid selector - skip
          }
        }

        if (foundElement) {
          // POST-SCROLL RECT RE-CALC for clinical drawer targets
          scrollAndHighlight(foundElement as HTMLElement)
        } else if (attempts < MAX_ATTEMPTS) {
          attempts++
          findTimerRef.current = setTimeout(findElement, INTERVAL)
        } else {
          // Element not found in drawer after max retries
          // Highlight clinical tab as fallback (still in drawer context)
          scrollAndHighlight(clinicalTab)
        }
        return
      }

      // NON-CLINICAL STEPS: Original logic
      const selector = currentStepData.id === 'neural-timeline-calendar'
        ? '[data-tour-id="neural-timeline-calendar"], [data-tour-id="vertex-calendar"], .neural-timeline-calendar'
        : currentStepData.target!

      const el = getFirstMatchingElement(selector)
      if (el) {
        setTargetRect(calcRect(el))
        setTargetNotFound(false)
        scrollElementIntoView(el as HTMLElement)
      } else if (attempts < MAX_ATTEMPTS) {
        attempts++
        findTimerRef.current = setTimeout(findElement, INTERVAL)
      } else {
        // Graceful fallback for non-clinical steps
        if (currentStepData.id === 'select-date') {
          const fallback = document.querySelector('[data-tour-id="neural-timeline-calendar"]')
          if (fallback) {
            setTargetRect(calcRect(fallback))
            setTargetNotFound(false)
            return
          }
        }
        if (currentStepData.id === 'open-patient-record' || currentStepData.id === 'patient-list') {
          const fallback = document.querySelector('[data-tour-id="patient-list-panel"]')
          if (fallback) {
            setTargetRect(calcRect(fallback))
            setTargetNotFound(false)
            return
          }
        }

        setTargetRect(null)
        setTargetNotFound(true)
        clearSpotlightZoom()
      }
    }

    findElement()

    return () => clearFindTimer()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, activeTour?.id, isRunning, isMinimized, searchTrigger, clearSpotlightZoom, pathname, router])

  // Pathname change detection → finish navigation
  useEffect(() => {
    if (!isNavigating) return

    // Pathname change detection - 300ms delay for page transition/mount
    const timer = setTimeout(() => {
      setIsNavigating(false)
      setSearchTrigger((n) => n + 1)
    }, 300)

    // Safety watchdog: After 5 seconds, force navigation state to end 
    // to prevent the tour from being stuck if pathname doesn't change as expected.
    const watchdog = setTimeout(() => {
      if (isNavigating) {
        setIsNavigating(false)
        setSearchTrigger((n) => n + 1)
      }
    }, 5000)

    return () => {
      clearTimeout(timer)
      clearTimeout(watchdog)
    }
  }, [pathname, isNavigating])

  // ─── Reset state on step change ────────────────────────────────────────────
  useEffect(() => {
    setTargetRect(null)
    setTargetNotFound(false)
    clearSpotlightZoom()
    clinicalRecoveryRef.current = { facilityClicked: false, patientClicked: false }
    clickActionExecutedRef.current = false
    // If we were navigating in the previous step, but the new step is already on the
    // current route, ensure we exit navigating mode so spotlight search can run.
    if (activeTour && isRunning) {
      const s = activeTour.steps[currentStep]
      const targetPath = s?.navigateTo || s?.route
      if (targetPath && normalizePath(pathname) === normalizePath(targetPath)) {
        setIsNavigating(false)
      }

      // IMMEDIATE PRE-HIGHLIGHT: Spotlight the step target BEFORE user clicks Next
      // This ensures highlights appear instantly when step loads
      if (s?.target && s.placement !== 'center') {
        // Use a small delay to ensure DOM is ready (especially for dynamically rendered content)
        const preHighlightTimer = setTimeout(() => {
          // For clinical drawer steps, enforce drawer context
          const isClinicalDrawerStep = [
            'clinical-sputum',
            'clinical-diagnosis',
            'clinical-att',
            'submit-or-close',
            'admin-journey-tab',
            'demographics-tab'
          ].includes(s.id)

          if (isClinicalDrawerStep) {
            // Only highlight if drawer is open
            const clinicalTab = document.querySelector('[data-tour-id="clinical-tab"]')
            if (clinicalTab instanceof HTMLElement) {
              const drawerContainer = clinicalTab.closest('[role="dialog"]') || clinicalTab.closest('.sheet-content')
              if (drawerContainer) {
                const el = drawerContainer.querySelector(s.target!) // Drawer-scoped query
                if (el instanceof HTMLElement) {
                  const rect = el.getBoundingClientRect()
                  const isVisible = rect.width > 0 && rect.height > 0 && 
                                   window.getComputedStyle(el).visibility !== 'hidden' &&
                                   window.getComputedStyle(el).display !== 'none'
                  if (isVisible) {
                    // POST-SCROLL RECT RE-CALC in pre-highlight
                    scrollAndHighlight(el)
                  }
                }
              }
            }
          } else {
            // Non-clinical steps: use normal logic with post-scroll recalc
            const el = getFirstMatchingElement(s.target!)
            if (el instanceof HTMLElement) {
              scrollAndHighlight(el)
            }
          }
        }, 50)

        const demoTimers: Array<ReturnType<typeof setTimeout>> = []

        // First-time-user special: auto-scroll around journey cube so rotation is visible.
        if (s.id === 'screening-journey-explanation' && typeof window !== 'undefined') {
          const queue = (fn: () => void, ms: number) => {
            const t = setTimeout(fn, ms)
            demoTimers.push(t)
          }

          queue(() => {
            const cubeEl = getFirstMatchingElement(s.target!)
            if (cubeEl instanceof HTMLElement) scrollElementIntoView(cubeEl)
          }, 120)
          queue(() => window.scrollBy({ top: 170, behavior: 'smooth' }), 520)
          queue(() => window.scrollBy({ top: 170, behavior: 'smooth' }), 1050)
          queue(() => window.scrollBy({ top: -200, behavior: 'smooth' }), 1650)
        }

        return () => {
          clearTimeout(preHighlightTimer)
          demoTimers.forEach(clearTimeout)
        }
      }

      // Step-specific: when we enter the month navigation step, spotlight the arrow immediately.
      if (s?.id === 'navigate-to-march') {
        const arrowEl = document.querySelector('[data-tour-id="neural-timeline-prev-month"]')
        if (arrowEl) {
          setTargetRect(calcRect(arrowEl))
          setTargetNotFound(false)
        }
      }
    }
    if (clickRetryTimerRef.current) {
      clearTimeout(clickRetryTimerRef.current)
      clickRetryTimerRef.current = null
    }
    // isNavigating is intentionally NOT reset here — handled by the navigation flow
  }, [currentStep, activeTour?.id, isRunning, pathname, getFirstMatchingElement, calcRect, scrollAndHighlight, clearSpotlightZoom])

  useEffect(() => () => clearSpotlightZoom(), [clearSpotlightZoom])

  // ─── BUG 8: Resize handler ─────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      if (!activeTour || !isRunning) return
      const s = activeTour.steps[currentStep]
      if (!s?.target) return
      const el = document.querySelector(s.target)
      if (el) setTargetRect(calcRect(el))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [activeTour, currentStep, isRunning, calcRect])

  // ─── Keyboard controls ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning || isMinimized) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevStep()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        isCenterStep ? skipTour() : minimizeTour()
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        isMinimized ? restoreTour() : minimizeTour()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, isRunning, isMinimized, isCenterStep, prevStep, skipTour, minimizeTour, restoreTour])

  // ─── Confetti on completion ────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning && completedTours.length > 0) {
      setShowConfetti(true)
      const t = setTimeout(() => setShowConfetti(false), 1500)
      return () => clearTimeout(t)
    }
  }, [isRunning, completedTours])

  // ─── Tooltip position ──────────────────────────────────────────────────────
  const tooltipPosition = useMemo(() => {
    if (!targetRect || !step || isCenterStep || targetNotFound) {
      return {
        top: '50%' as const,
        left: '50%' as const,
        transform: 'translate(-50%, -50%)',
      }
    }
    const vp = {
      w: typeof window !== 'undefined' ? window.innerWidth : 1280,
      h: typeof window !== 'undefined' ? window.innerHeight : 800,
    }
    const margin = 16
    const tW = isCenterStep ? 380 : 320
    // Use a viewport-safe estimated tooltip height for clamping so it never drops below view.
    const maxTooltipHeight = Math.min(isCenterStep ? 560 : 500, vp.h - margin * 2)
    const tH = Math.max(220, maxTooltipHeight)
    const clampL = (l: number) => Math.min(Math.max(l, margin), vp.w - tW - margin)
    const clampT = (t: number) => Math.min(Math.max(t, margin), vp.h - tH - margin)

    switch (step.placement) {
      case 'bottom': return { top: clampT(targetRect.bottom + margin), left: clampL(targetRect.left) }
      case 'top':    return { top: clampT(targetRect.top - tH - margin), left: clampL(targetRect.left) }
      case 'right':  return { top: clampT(targetRect.top), left: Math.min(targetRect.right + margin, vp.w - tW - margin) }
      case 'left':   return { top: clampT(targetRect.top), left: Math.max(targetRect.left - tW - margin, margin) }
      default:       return { top: '50%' as const, left: '50%' as const, transform: 'translate(-50%, -50%)' }
    }
  }, [targetRect, step, isCenterStep, targetNotFound])

  // ─── Guard ─────────────────────────────────────────────────────────────────
  if (!isRunning || !activeTour) return null

  // ─── Minimized pill ────────────────────────────────────────────────────────
  if (isMinimized) {
    return (
      <div style={{
        position: 'fixed', bottom: 72, right: 24, zIndex: 9999,
        background: '#6366f1', color: 'white', borderRadius: 9999,
        padding: '8px 16px', fontSize: 12, fontWeight: 600,
        display: 'flex', gap: 8, alignItems: 'center',
        boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
      }}>
        <span>{activeTour.title} · Step {currentStep + 1}/{totalSteps}</span>
        <button onClick={restoreTour} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: 0 }}>
          <Maximize2 size={12} />
        </button>
        <button onClick={skipTour} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: 0 }}>
          <X size={12} />
        </button>
      </div>
    )
  }

  const tooltipWidth = isCenterStep || targetNotFound ? 380 : 320

  return (
    <>
      {/* Confetti */}
      {showConfetti && (
        <div ref={confettiRef} style={{ position: 'fixed', inset: 0, zIndex: 10000, pointerEvents: 'none' }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} style={{
              position: 'fixed', width: 8, height: 8,
              background: ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'][i % 5],
              left: `${(i * 5.3) % 100}%`, top: '-20px',
              transform: `rotate(${i * 18}deg)`,
              animation: `tour-confetti-fall 1.5s ease-in ${(i * 0.05).toFixed(2)}s forwards`,
            }} />
          ))}
        </div>
      )}

      {/* BUG 3: SVG overlay — pointerEvents: none so it never intercepts clicks */}
      <svg
        width="100%" height="100%"
        style={{ position: 'fixed', inset: 0, zIndex: 9990, pointerEvents: 'none' }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && !targetNotFound && (
              step?.spotlightShape === 'circle' ? (
                <ellipse
                  cx={targetRect.left + targetRect.width / 2}
                  cy={targetRect.top + targetRect.height / 2}
                  rx={Math.max(targetRect.width, targetRect.height) / 2}
                  ry={Math.max(targetRect.width, targetRect.height) / 2}
                  fill="black"
                />
              ) : (
                <motion.rect
                  animate={{
                    x: targetRect.left - 4, y: targetRect.top - 4,
                    width: targetRect.width + 8, height: targetRect.height + 8,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  rx={8} fill="black"
                />
              )
            )}
          </mask>
        </defs>
        <rect
          width="100%" height="100%"
          fill={isCenterStep || targetNotFound ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.55)'}
          mask={(targetRect && !targetNotFound) ? 'url(#tour-spotlight-mask)' : undefined}
        />
        {targetRect && !targetNotFound && (
          <>
            <motion.rect
              animate={{ x: targetRect.left - 4, y: targetRect.top - 4, width: targetRect.width + 8, height: targetRect.height + 8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              rx={8} fill="none" stroke="#6366f1" strokeWidth={2}
              style={{ filter: 'drop-shadow(0 0 8px #6366f180)' }}
            />
            <motion.rect
              animate={{ x: targetRect.left - 4, y: targetRect.top - 4, width: targetRect.width + 8, height: targetRect.height + 8, opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              rx={8} fill="none" stroke="#6366f1" strokeWidth={1.5}
            />
          </>
        )}
      </svg>

      {/* BUG 3: Transparent backdrop click layer (between SVG and tooltip) */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9991, background: 'transparent', cursor: 'default' }}
        onClick={() => { if (!targetRect || targetNotFound) nextStep() }}
      />

      {/* Navigating indicator */}
      {isNavigating && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          zIndex: 10001, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12,
          padding: '12px 24px', fontSize: 13, color: '#6366f1', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'none',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}>
          <div style={{
            width: 16, height: 16, borderRadius: '50%',
            border: '2px solid #e2e8f0', borderTopColor: '#6366f1',
            animation: 'tour-spin 0.8s linear infinite',
          }} />
          Navigating to the right page…
        </div>
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          // BUG 3: stopPropagation so backdrop click layer doesn't fire through tooltip
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            zIndex: 9999,
            pointerEvents: 'auto',
            width: tooltipWidth,
            maxWidth: 'calc(100vw - 48px)',
            maxHeight: 'calc(100vh - 32px)',
            overflowY: 'auto',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.985), rgba(250,253,255,0.97))',
            backdropFilter: 'blur(22px) saturate(115%)',
            border: '1px solid rgba(99,102,241,0.13)',
            borderRadius: '1rem',
            boxShadow: '0 22px 56px rgba(15,23,42,0.2), 0 0 0 1px rgba(99,102,241,0.06), inset 0 1px 0 rgba(255,255,255,0.65)',
            padding: isCenterStep || targetNotFound ? '28px 28px 20px' : '20px',
            ...tooltipPosition,
          }}
        >
          {speechEnabled && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 0,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: isSpeaking
                    ? `linear-gradient(0deg,
                        rgba(16,185,129,${(0.06 + speechLevel * 0.08 * intensity.energy).toFixed(3)}) 0%,
                        rgba(245,158,11,${(0.045 + speechLevel * 0.06 * intensity.energy).toFixed(3)}) 26%,
                        rgba(14,165,233,${(0.03 + speechLevel * 0.05 * intensity.energy).toFixed(3)}) 50%,
                        rgba(255,255,255,0.03) 80%,
                        rgba(255,255,255,0) 100%)`
                    : 'linear-gradient(0deg, rgba(148,163,184,0.07) 0%, rgba(148,163,184,0.04) 38%, rgba(255,255,255,0) 100%)',
                  transition: 'background 140ms ease',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: '-35%',
                  borderRadius: '50%',
                  background: isSpeaking
                    ? `conic-gradient(from ${(speechLevel * 180).toFixed(1)}deg,
                        rgba(16,185,129,${(0.1 * intensity.energy).toFixed(3)}),
                        rgba(14,165,233,${(0.08 * intensity.energy).toFixed(3)}),
                        rgba(245,158,11,${(0.09 * intensity.energy).toFixed(3)}),
                        rgba(99,102,241,${(0.07 * intensity.energy).toFixed(3)}),
                        rgba(16,185,129,${(0.1 * intensity.energy).toFixed(3)}))`
                    : 'conic-gradient(from 0deg, rgba(148,163,184,0.05), rgba(148,163,184,0.02), rgba(148,163,184,0.05))',
                  opacity: isSpeaking ? 0.42 : 0.2,
                  filter: 'blur(24px)',
                  transform: isSpeaking ? `rotate(${(speechLevel * 22).toFixed(2)}deg)` : 'rotate(0deg)',
                  animation: isSpeaking ? 'tour-audio-aurora 12s linear infinite' : undefined,
                  transition: 'opacity 180ms ease, transform 180ms ease, background 180ms ease',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: isSpeaking
                    ? `radial-gradient(circle at 16% 20%, rgba(14,165,233,${(0.05 + speechLevel * 0.08 * intensity.energy).toFixed(3)}), transparent ${Math.round(36 + speechLevel * 10 * intensity.energy)}%),
                       radial-gradient(circle at 84% 22%, rgba(16,185,129,${(0.06 + speechLevel * 0.1 * intensity.energy).toFixed(3)}), transparent ${Math.round(34 + speechLevel * 12 * intensity.energy)}%),
                       radial-gradient(circle at 50% 88%, rgba(245,158,11,${(0.07 + speechLevel * 0.1 * intensity.energy).toFixed(3)}), transparent ${Math.round(38 + speechLevel * 14 * intensity.energy)}%)`
                    : 'radial-gradient(circle at 50% 92%, rgba(148,163,184,0.08), transparent 45%)',
                  opacity: isSpeaking ? (0.68 + speechLevel * 0.2 * intensity.energy) : 0.38,
                  transform: isSpeaking ? `scale(${1 + speechLevel * 0.02 * intensity.energy})` : 'scale(1)',
                  transition: 'opacity 150ms ease, transform 150ms ease, background 150ms ease',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: isSpeaking
                    ? `radial-gradient(circle at 50% ${82 - speechLevel * 8 * intensity.energy}%, rgba(255,255,255,${(0.08 + speechLevel * 0.08 * intensity.energy).toFixed(3)}), transparent ${Math.round(30 + speechLevel * 18 * intensity.energy)}%)`
                    : 'none',
                  mixBlendMode: 'screen',
                  opacity: isSpeaking ? 0.62 : 0,
                  transition: 'opacity 150ms ease, background 150ms ease',
                }}
              />
              {/* Audio cloud blobs - premium floating ambience */}
              {[0, 1, 2, 3].map((i) => {
                const baseX = [16, 34, 63, 82][i]
                const baseY = [78, 68, 74, 66][i]
                const hue = ['rgba(16,185,129,', 'rgba(14,165,233,', 'rgba(245,158,11,', 'rgba(99,102,241,'][i]
                const opacity = isSpeaking ? (0.075 + ((speechLevel + i * 0.11) % 0.18)) : 0.04
                const size = 90 + i * 28 + speechLevel * 36
                const drift = isSpeaking ? (Math.sin((speechLevel + i) * 6) * 4) : 0
                return (
                  <span
                    key={`cloud-${i}`}
                    style={{
                      position: 'absolute',
                      left: `${baseX}%`,
                      top: `${baseY + drift}%`,
                      width: size,
                      height: size,
                      borderRadius: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: `radial-gradient(circle, ${hue}${opacity.toFixed(3)}) 0%, rgba(255,255,255,0) 70%)`,
                      filter: 'blur(10px)',
                      // tuned by preset for subtle vs cinematic diffusion
                      opacity: isSpeaking ? Math.min(0.26 * intensity.energy, 0.32) : 0.04,
                      transition: 'top 180ms ease, width 180ms ease, height 180ms ease, background 180ms ease, opacity 180ms ease',
                    }}
                  />
                )
              })}
              {/* Soft aurora sweep for "alive" motion */}
              <span
                style={{
                  position: 'absolute',
                  left: '-20%',
                  right: '-20%',
                  top: '42%',
                  height: '42%',
                  transform: `translateX(${isSpeaking ? (speechLevel * 18 - 8).toFixed(2) : 0}%) rotate(-3deg)`,
                  background: isSpeaking
                    ? 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.16), rgba(255,255,255,0))'
                    : 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.05), rgba(255,255,255,0))',
                  filter: `blur(${Math.round(14 * intensity.energy)}px)`,
                  opacity: isSpeaking ? 0.56 : 0.3,
                  transition: 'transform 160ms ease, opacity 160ms ease, background 160ms ease',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `repeating-linear-gradient(
                    120deg,
                    rgba(255,255,255,0.00) 0px,
                    rgba(255,255,255,0.00) 12px,
                    rgba(255,255,255,${(isSpeaking ? 0.028 * intensity.grain : 0.015 * intensity.grain).toFixed(3)}) 13px,
                    rgba(255,255,255,${(isSpeaking ? 0.028 * intensity.grain : 0.015 * intensity.grain).toFixed(3)}) 14px
                  )`,
                  opacity: isSpeaking ? 0.58 : 0.3,
                  mixBlendMode: 'soft-light',
                  animation: 'tour-audio-grain 2.6s linear infinite',
                }}
              />
            </div>
          )}

          <div style={{ position: 'relative', zIndex: 1 }}>
          {/* BUG 6: Center step — category icon in colored circle */}
          {(isCenterStep || targetNotFound) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16, gap: 4 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: `${accentColor}18`,
                border: `1px solid ${accentColor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CategoryIcon size={22} style={{ color: accentColor }} />
              </div>
            </div>
          )}

          {/* Header row — only for non-center steps */}
          {!isCenterStep && !targetNotFound && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CategoryIcon size={14} style={{ color: '#6366f1' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                    {activeTour.category}
                  </span>
                </div>
                <button onClick={skipTour} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Close for center steps */}
          {(isCenterStep || targetNotFound) && (
            <button onClick={skipTour} style={{
              position: 'absolute', top: 16, right: 16,
              background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0,
            }}>
              <X size={16} />
            </button>
          )}

          {/* Step counter */}
          <div style={{
            fontFamily: 'var(--font-share-tech-mono)', fontSize: 10, color: '#94a3b8',
            marginBottom: 4,
            textAlign: isCenterStep || targetNotFound ? 'center' : 'right',
          }}>
            {currentStep + 1} / {totalSteps}
          </div>

          {/* Title */}
          <h3 style={{
            fontSize: isCenterStep || targetNotFound ? 18 : 16,
            fontWeight: 700, color: '#0f172a',
            fontFamily: 'var(--font-outfit)',
            marginTop: 4, marginBottom: 8,
            textAlign: isCenterStep || targetNotFound ? 'center' : 'left',
          }}>
            {resolvedTitle}
          </h3>
          {translationInProgress && language !== 'en' && (
            <div style={{
              fontSize: 10,
              color: '#0ea5e9',
              fontFamily: 'var(--font-share-tech-mono)',
              marginBottom: 8,
            }}>
              Translating...
            </div>
          )}

          {/* BUG 1: Target not found warning */}
          {targetNotFound && (
            <div style={{
              background: '#fffbeb', border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: '0.5rem', padding: '8px 12px', marginBottom: 12,
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <AlertTriangle size={12} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 11, color: '#92400e', fontFamily: 'var(--font-share-tech-mono)' }}>
                This element is not visible right now. You can still continue the tour.
              </span>
            </div>
          )}

          {/* Body — or loading spinner if navigating */}
          {isNavigating ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', marginBottom: 12 }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                border: '2px solid #e2e8f0', borderTopColor: '#6366f1',
                animation: 'tour-spin 0.8s linear infinite', flexShrink: 0,
              }} />
              <span style={{ fontSize: 13, color: '#64748b' }}>Navigating to the right page…</span>
            </div>
          ) : (
            <p style={{
              fontSize: isCenterStep || targetNotFound ? 14 : 13.5,
              lineHeight: 1.7, color: '#475569', marginBottom: 16,
              textAlign: isCenterStep || targetNotFound ? 'center' : 'left',
            }}>
              {resolvedBody}
            </p>
          )}

          {/* BUG 4: Progress dots — explicit Number() cast */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, justifyContent: isCenterStep || targetNotFound ? 'center' : 'flex-start' }}>
            {activeTour.steps.map((_, dotIndex: number) => (
              <motion.div
                key={dotIndex}
                onClick={() => jumpToStep(dotIndex)}
                animate={{
                  width: dotIndex === Number(currentStep) ? 16 : 6,
                  background: dotIndex <= Number(currentStep) ? '#6366f1' : '#e2e8f0',
                  opacity: dotIndex < Number(currentStep) ? 0.45 : 1,
                }}
                transition={{ duration: 0.3 }}
                style={{ height: 6, borderRadius: 9999, cursor: 'pointer' }}
              />
            ))}
          </div>

          {/* Footer */}
          {isCenterStep || targetNotFound ? (
            // BUG 6: Center step footer — no Back on step 0, full-width Next, green Finish
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNext}
                style={{
                  width: '100%', height: 40,
                  background: isLastStep ? '#10b981' : '#6366f1',
                  color: 'white', borderRadius: 8,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {isLastStep ? <>Complete Tour <CheckCircle size={15} /></> : <>Next <ChevronRight size={15} /></>}
              </motion.button>
              {currentStep > 0 && (
                <button onClick={prevStep} style={{
                  background: 'transparent', border: 'none', color: '#94a3b8',
                  fontSize: 12, cursor: 'pointer', textAlign: 'center',
                }}>
                  ← Back
                </button>
              )}
              <button onClick={skipTour} style={{
                background: 'transparent', border: 'none', color: '#cbd5e1',
                fontSize: 11, cursor: 'pointer', textAlign: 'center',
              }}>
                Skip tour
              </button>
            </div>
          ) : (
            // Regular step footer
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button onClick={skipTour} style={{
                background: 'transparent', border: 'none', color: '#94a3b8',
                fontSize: 13, cursor: 'pointer', padding: 0,
              }}>
                Skip tour
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                {currentStep > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={prevStep}
                    style={{
                      border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px',
                      fontSize: 13, color: '#64748b', background: '#f8fafc',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <ChevronLeft size={14} /> Prev
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleNext}
                  style={{
                    background: isLastStep ? '#10b981' : '#6366f1',
                    color: 'white', borderRadius: 8, padding: '6px 16px',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {isLastStep ? <><CheckCircle size={14} /> Finish</> : <>Next <ChevronRight size={14} /></>}
                </motion.button>
              </div>
            </div>
          )}

          {/* Keyboard hints */}
          <div style={{ marginTop: 8, textAlign: 'center', fontSize: 9, color: '#bab9b4', fontFamily: 'var(--font-share-tech-mono)' }}>
            ← → navigate · Esc minimize · M toggle
          </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Injected keyframes */}
      <style>{`
        @keyframes tour-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes tour-confetti-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes tour-audio-aurora {
          0%   { transform: rotate(0deg) scale(1); }
          50%  { transform: rotate(180deg) scale(1.03); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes tour-audio-grain {
          0%   { transform: translate3d(0, 0, 0); }
          25%  { transform: translate3d(0.5%, -0.5%, 0); }
          50%  { transform: translate3d(-0.4%, 0.3%, 0); }
          75%  { transform: translate3d(0.3%, 0.4%, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
      `}</style>
    </>
  )
}
