import { useState } from 'react'

export type SyncState =
  | 'idle'         // not yet submitted
  | 'saving'       // Supabase write in progress
  | 'syncing'      // Google Sheets write in progress
  | 'synced'       // both writes confirmed
  | 'error'        // one or both writes failed

interface SyncStatus {
  state: SyncState
  message: string
  lastSyncedAt?: string
  attempts?: number
}

export function useSyncStatus(patientId: string | null) {
  const [status, setStatus] = useState<SyncStatus>({
    state: 'idle',
    message: 'Ready'
  })

  const setSaving  = () => setStatus({ state: 'saving',  message: 'Saving…' })
  const setSyncing = () => setStatus({ state: 'syncing', message: 'Syncing to Sheets…' })
  const setSynced  = (at: string) => setStatus({
    state: 'synced',
    message: 'All systems synced',
    lastSyncedAt: at
  })
  const setError   = (msg: string) => setStatus({
    state: 'error',
    message: msg
  })
  const reset      = () => setStatus({ state: 'idle', message: 'Ready' })

  return { status, setSaving, setSyncing, setSynced, setError, reset }
}
