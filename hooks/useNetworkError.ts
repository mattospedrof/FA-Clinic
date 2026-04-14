import { useState, useCallback } from 'react'

type NetworkError = {
  message: string
  isNetworkError: boolean
  statusCode?: number
}

/**
 * Hook para tratamento de erros de rede em chamadas ao Supabase.
 * Diferencia erros de rede de erros de negócio.
 */
export function useNetworkError() {
  const [error, setError] = useState<NetworkError | null>(null)

  const handleError = useCallback((err: any): NetworkError | null => {
    if (!err) return null

    const isNetwork =
      err.message?.includes('fetch') ||
      err.message?.includes('network') ||
      err.message?.includes('Failed to fetch') ||
      err.code === 'NETWORK_ERROR'

    const networkError: NetworkError = {
      message: isNetwork
        ? 'Erro de conexão. Verifique sua internet e tente novamente.'
        : err.message || 'Ocorreu um erro inesperado.',
      isNetworkError: isNetwork,
      statusCode: err.status || err.code,
    }

    setError(networkError)
    return networkError
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { error, handleError, clearError }
}

/**
 * Wrapper para executar queries do Supabase com tratamento de erro.
 * Retorna { data, error, loading }.
 */
export function useSafeQuery<T = any>(initialData: T[] = []) {
  const [data, setData] = useState<T[]>(initialData)
  const [loading, setLoading] = useState(false)
  const { error, handleError, clearError } = useNetworkError()

  const execute = useCallback(async (queryFn: () => Promise<{ data: T[] | null; error: any }>) => {
    setLoading(true)
    clearError()
    try {
      const result = await queryFn()
      if (result.error) {
        handleError(result.error)
        return null
      }
      setData(result.data || [])
      return result.data
    } catch (err: any) {
      handleError(err)
      return null
    } finally {
      setLoading(false)
    }
  }, [handleError, clearError])

  return { data, loading, error, execute, setData }
}
