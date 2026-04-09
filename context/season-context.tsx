'use client'

/**
 * SeasonContext - Global State untuk Status Musim
 * 
 * Musim (Kemarau/Hujan) memengaruhi seluruh kalkulasi HPP di platform.
 * Disimpan di localStorage agar persist saat refresh halaman.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { Musim } from '@/types/database.types'

// ============================================================
// TYPES
// ============================================================

interface SeasonContextValue {
  musim: Musim
  setMusim: (musim: Musim) => void
  toggleMusim: () => void
  isKemarau: boolean
  isHujan: boolean
}

// ============================================================
// CONTEXT
// ============================================================

const SeasonContext = createContext<SeasonContextValue | undefined>(undefined)

const STORAGE_KEY = 'surga-buah-musim'
const DEFAULT_MUSIM: Musim = 'kemarau'

// ============================================================
// PROVIDER
// ============================================================

export function SeasonProvider({ children }: { children: React.ReactNode }) {
  const [musim, setMusimState] = useState<Musim>(DEFAULT_MUSIM)
  const [isHydrated, setIsHydrated] = useState(false)

  // Ambil nilai musim dari localStorage saat pertama load
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'kemarau' || stored === 'hujan') {
      setMusimState(stored)
    }
    setIsHydrated(true)
  }, [])

  const setMusim = useCallback((newMusim: Musim) => {
    setMusimState(newMusim)
    localStorage.setItem(STORAGE_KEY, newMusim)
  }, [])

  const toggleMusim = useCallback(() => {
    setMusim(musim === 'kemarau' ? 'hujan' : 'kemarau')
  }, [musim, setMusim])

  // Hindari hydration mismatch: render setelah client-side mount
  if (!isHydrated) return null

  return (
    <SeasonContext.Provider
      value={{
        musim,
        setMusim,
        toggleMusim,
        isKemarau: musim === 'kemarau',
        isHujan: musim === 'hujan',
      }}
    >
      {children}
    </SeasonContext.Provider>
  )
}

// ============================================================
// HOOK
// ============================================================

export function useSeason(): SeasonContextValue {
  const context = useContext(SeasonContext)
  if (context === undefined) {
    throw new Error('useSeason harus digunakan di dalam SeasonProvider')
  }
  return context
}
