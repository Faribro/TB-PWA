'use client'

import TourOverlay from './TourOverlay'
import TourLauncher from './TourLauncher'

export default function TourProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <TourOverlay />
      <TourLauncher />
    </>
  )
}
