interface SkeletonProps {
  count?: number
  className?: string
}

/**
 * Skeleton de carregamento para listas e tabelas.
 * Usado em vez do "Carregando..." genérico.
 */
export function Skeleton({ count = 3, className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton para cards de métricas (StatCard).
 */
export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow p-5 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-6 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton para tabela.
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden animate-pulse">
      <div className="bg-gray-50 border-b px-6 py-3">
        <div className="flex gap-4">
          <div className="h-3 bg-gray-200 rounded w-1/4" />
          <div className="h-3 bg-gray-200 rounded w-1/6" />
          <div className="h-3 bg-gray-200 rounded w-1/6" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex gap-4">
            <div className="h-4 bg-gray-200 rounded flex-1" />
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Wrapper que mostra Skeleton quando loading=true.
 */
export function LoadingWrapper({
  loading,
  children,
  skeleton,
}: {
  loading: boolean
  children: React.ReactNode
  skeleton?: React.ReactNode
}) {
  if (loading) {
    return skeleton || <Skeleton count={5} />
  }
  return <>{children}</>
}
