'use client'

import { openDB, IDBPDatabase } from 'idb'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'

interface PendingSubmission {
  id?: number
  data: Record<string, unknown>
  staff_name: string
  synced: boolean
  savedAt: string
  retries: number
}

const DB_NAME = 'samadhaan-offline-v1'

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      const store = db.createObjectStore('pending-submissions', {
        keyPath: 'id',
        autoIncrement: true,
      })
      store.createIndex('by-synced', 'synced')
    },
  })
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const up = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  const refreshCount = useCallback(async () => {
    const db = await getDB()
    const tx = db.transaction('pending-submissions', 'readonly')
    const index = tx.store.index('by-synced')
    const pending = await index.getAll(IDBKeyRange.only(false))
    setPendingCount(pending.length)
  }, [])

  useEffect(() => { refreshCount() }, [refreshCount])

  const saveOffline = useCallback(async (
    data: Record<string, unknown>,
    staff_name: string
  ) => {
    const db = await getDB()
    await db.add('pending-submissions', {
      data,
      staff_name,
      synced: false,
      savedAt: new Date().toISOString(),
      retries: 0,
    })
    await refreshCount()
  }, [refreshCount])

  const syncPending = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return
    setIsSyncing(true)
    try {
      const db = await getDB()
      const tx = db.transaction('pending-submissions', 'readonly')
      const index = tx.store.index('by-synced')
      const pending = await index.getAll(IDBKeyRange.only(false))
      
      for (const record of pending) {
        try {
          const { error } = await supabase.from('patients').insert({
            ...record.data,
            staff_name: record.staff_name,
          })
          if (!error && record.id) {
            const writeTx = db.transaction('pending-submissions', 'readwrite')
            await writeTx.store.put({ ...record, synced: true })
          } else if (record.id) {
            const writeTx = db.transaction('pending-submissions', 'readwrite')
            await writeTx.store.put({
              ...record,
              retries: record.retries + 1,
            })
          }
        } catch {
          if (record.id) {
            const writeTx = db.transaction('pending-submissions', 'readwrite')
            await writeTx.store.put({
              ...record,
              retries: record.retries + 1,
            })
          }
        }
      }
    } finally {
      setIsSyncing(false)
      await refreshCount()
    }
  }, [isSyncing, supabase, refreshCount])

  // Auto-sync when back online
  useEffect(() => {
    if (isOnline) syncPending()
  }, [isOnline]) // eslint-disable-line react-hooks/exhaustive-deps

  return { isOnline, pendingCount, isSyncing, saveOffline, syncPending }
}
