'use client'

import { useState, useCallback, useRef } from 'react'

/**
 * Cache em memória para evitar re-fetch de dados que mudam raramente.
 * Usa um Map com timestamp de expiração.
 */
class MemoryCache {
  private cache = new Map<string, { data: any; expiresAt: number }>()

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    return entry.data as T
  }

  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs })
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) this.cache.delete(key)
    }
  }
}

export const globalCache = new MemoryCache()

/**
 * Hook para obter patientIds do usuário logado com cache.
 * Evita refetch toda vez que navega para uma página de paciente.
 */
export function usePatientIds() {
  const [patientIds, setPatientIds] = useState<string[] | null>(null)
  const fetchingRef = useRef(false)

  const fetchPatientIds = useCallback(async (supabase: any) => {
    // Verificar cache
    const cached = globalCache.get<string[]>('patientIds')
    if (cached) {
      setPatientIds(cached)
      return cached
    }

    if (fetchingRef.current) return patientIds
    fetchingRef.current = true

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      fetchingRef.current = false
      return []
    }

    const { data } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)

    const ids = data?.map((p: any) => p.id) || []
    globalCache.set('patientIds', ids, 10 * 60 * 1000) // 10 min
    setPatientIds(ids)
    fetchingRef.current = false
    return ids
  }, [patientIds])

  const invalidate = useCallback(() => {
    globalCache.invalidate('patientIds')
    setPatientIds(null)
  }, [])

  return { patientIds, fetchPatientIds, invalidate }
}

/**
 * Hook para obter clinicId do staff logado com cache.
 */
export function useClinicId() {
  const [clinicId, setClinicId] = useState<string | null>(null)
  const fetchingRef = useRef(false)

  const fetchClinicId = useCallback(async (supabase: any) => {
    const cached = globalCache.get<string>('clinicId')
    if (cached) {
      setClinicId(cached)
      return cached
    }

    if (fetchingRef.current) return clinicId
    fetchingRef.current = true

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      fetchingRef.current = false
      return null
    }

    const { data } = await supabase
      .from('clinic_staff')
      .select('clinic_id')
      .eq('user_id', user.id)

    const id = data?.[0]?.clinic_id || null
    globalCache.set('clinicId', id, 10 * 60 * 1000)
    setClinicId(id)
    fetchingRef.current = false
    return id
  }, [clinicId])

  const invalidate = useCallback(() => {
    globalCache.invalidate('clinicId')
    setClinicId(null)
  }, [])

  return { clinicId, fetchClinicId, invalidate }
}

/**
 * Hook para busca de CEP com debounce e cache.
 */
export function useCepSearch() {
  const [cepData, setCepData] = useState<{ logradouro: string; localidade: string; uf: string } | null>(null)
  const [searching, setSearching] = useState(false)

  const searchCep = useCallback(async (cep: string, onSuccess: (data: { logradouro: string; localidade: string; uf: string }) => void) => {
    const cleaned = cep.replace(/\D/g, '')
    if (cleaned.length !== 8) return

    const cached = globalCache.get<{ logradouro: string; localidade: string; uf: string }>(`cep:${cleaned}`)
    if (cached) {
      setCepData(cached)
      onSuccess(cached)
      return
    }

    setSearching(true)
    const { fetchCep } = await import('@/lib/utils')
    const data = await fetchCep(cleaned)
    setSearching(false)

    if (data) {
      globalCache.set(`cep:${cleaned}`, data, 60 * 60 * 1000)
      setCepData(data)
      onSuccess(data)
    }
  }, [])

  return { cepData, searchCep, searching }
}
