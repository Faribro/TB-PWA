'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type SpreadsheetContextValue = {
  columnWidths: Record<string, number>
  setColumnWidth: (colKey: string, width: number) => void
  resetColumnWidths: () => void
}

const SpreadsheetContext = createContext<SpreadsheetContextValue | null>(null)

export function SpreadsheetProvider({ children }: { children: ReactNode }) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  
  const setColumnWidth = useCallback((colKey: string, width: number) => {
    setColumnWidths(prev => ({ ...prev, [colKey]: width }))
  }, [])
  
  const resetColumnWidths = useCallback(() => setColumnWidths({}), [])
  
  return (
    <SpreadsheetContext.Provider value={{ columnWidths, setColumnWidth, resetColumnWidths }}>
      {children}
    </SpreadsheetContext.Provider>
  )
}

export function useSpreadsheetContext(): SpreadsheetContextValue {
  const ctx = useContext(SpreadsheetContext)
  if (!ctx) throw new Error('useSpreadsheetContext must be used inside SpreadsheetProvider')
  return ctx
}
