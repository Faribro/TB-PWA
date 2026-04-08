'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Supported languages (Indian languages + English)
export type LanguageCode =
  | 'en'
  | 'hi'
  | 'mr'
  | 'gu'
  | 'ta'
  | 'te'
  | 'bn'
  | 'ur'
  | 'kn'
  | 'ml'
  | 'pa'
  | 'or'
  | 'as'
  | 'ne'
  | 'sd'
  | 'kok'
  | 'mai'
  | 'sa'
  | 'mni'
  | 'doi'
  | 'brx'
  | 'ks'

export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  hi: 'हिन्दी (Hindi)',
  mr: 'मराठी (Marathi)',
  gu: 'ગુજરાતી (Gujarati)',
  ta: 'தமிழ் (Tamil)',
  te: 'తెలుగు (Telugu)',
  bn: 'বাংলা (Bengali)',
  ur: 'اردو (Urdu)',
  kn: 'ಕನ್ನಡ (Kannada)',
  ml: 'മലയാളം (Malayalam)',
  pa: 'ਪੰਜਾਬੀ (Punjabi)',
  or: 'ଓଡ଼ିଆ (Odia)',
  as: 'অসমীয়া (Assamese)',
  ne: 'नेपाली (Nepali)',
  sd: 'سنڌي (Sindhi)',
  kok: 'कोंकणी (Konkani)',
  mai: 'मैथिली (Maithili)',
  sa: 'संस्कृत (Sanskrit)',
  mni: 'মৈতৈলোন (Manipuri)',
  doi: 'डोगरी (Dogri)',
  brx: 'बरʼ (Bodo)',
  ks: 'कॉशुर (Kashmiri)',
}

export interface TourStep {
  id: string
  // CSS selector OR a data-tour-id attribute value
  // If null: full-screen centered modal step (no spotlight)
  target: string | null
  // Which route this step lives on
  route: string
  // Tooltip content (string or localized object)
  title: string | Partial<Record<LanguageCode, string>>
  body: string | Partial<Record<LanguageCode, string>>
  // Where to position tooltip relative to target
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center'
  // Optional: action to perform before showing this step
  // 'click' = auto-click the target before showing tooltip
  // 'navigate' = navigate to route first, then show
  // 'wait' = wait for element to appear (retry 10x, 200ms apart)
  action?: 'click' | 'navigate' | 'wait'
  // Optional: route to navigate to before this step
  navigateTo?: string
  // Optional: highlight shape
  spotlightShape?: 'rect' | 'circle'
  // Optional: extra padding around spotlight
  spotlightPadding?: number
}

export interface Tour {
  id: string
  title: string
  description: string
  category: 'screening' | 'pipeline' | 'analytics' | 
            'admin' | 'navigation' | 'clinical'
  estimatedMinutes: number
  steps: TourStep[]
  enabled?: boolean // If false, tour is hidden from launcher/docs
}

interface TourState {
  // Currently active tour
  activeTour: Tour | null
  // Current step index
  currentStep: number
  // Is tour running
  isRunning: boolean
  // Is tour minimized (user hid it temporarily)
  isMinimized: boolean
  // Completed tour IDs (persisted)
  completedTours: string[]
  // Language preference (persisted)
  language: LanguageCode
  // Speech narration enabled (persisted)
  speechEnabled: boolean
  
  // Actions
  startTour: (tour: Tour) => void
  nextStep: () => void
  prevStep: () => void
  skipTour: () => void
  completeTour: () => void
  minimizeTour: () => void
  restoreTour: () => void
  jumpToStep: (index: number) => void
  setLanguage: (lang: LanguageCode) => void
  toggleSpeech: () => void
}

export const useTourStore = create<TourState>()(persist(
  (set, get) => ({
    activeTour: null,
    currentStep: 0,
    isRunning: false,
    isMinimized: false,
    completedTours: [],
    language: 'en',
    speechEnabled: false,
    
    startTour: (tour) => set({ 
      activeTour: tour, 
      currentStep: 0, 
      isRunning: true,
      isMinimized: false
    }),
    
    nextStep: () => {
      const state = get()
      const { currentStep, activeTour } = state
      if (!activeTour) return
      
      const total = activeTour.steps.length
      if (currentStep >= total - 1) {
        // Last step — direct completion logic
        set(s => ({
          isRunning: false,
          activeTour: null,
          currentStep: 0,
          completedTours: s.completedTours.includes(activeTour.id)
            ? s.completedTours
            : [...s.completedTours, activeTour.id]
        }))
      } else {
        set({ currentStep: currentStep + 1 })
      }
    },
    
    prevStep: () => {
      const { currentStep } = get()
      if (currentStep > 0) set({ currentStep: currentStep - 1 })
    },
    
    skipTour: () => set({ 
      isRunning: false, 
      activeTour: null, 
      currentStep: 0 
    }),
    
    completeTour: () => {
      const { activeTour, completedTours } = get()
      if (!activeTour) return
      set({
        isRunning: false,
        activeTour: null,
        currentStep: 0,
        completedTours: completedTours.includes(activeTour.id)
          ? completedTours
          : [...completedTours, activeTour.id]
      })
    },
    
    minimizeTour: () => set({ isMinimized: true }),
    restoreTour: () => set({ isMinimized: false }),
    jumpToStep: (index) => set({ currentStep: index }),
    setLanguage: (lang) => set({ language: lang }),
    toggleSpeech: () => set((state) => ({ speechEnabled: !state.speechEnabled })),
  }),
  {
    name: 'tour-preferences',
    partialize: (state) => ({
      completedTours: state.completedTours,
      language: state.language,
      speechEnabled: state.speechEnabled,
    }),
  }
))
