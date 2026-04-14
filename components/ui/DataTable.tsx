import { useState } from 'react'
import { Pagination } from './Pagination'

interface DataTableProps {
  columns: Array<{ key: string; label: string; render?: (row: any) => React.ReactNode }>
  data: any[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: any) => void
  paginate?: boolean
  itemsPerPage?: number
  highlightOnHover?: boolean
}

export function DataTable({
  columns,
  data,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado',
  onRowClick,
  paginate = true,
  itemsPerPage = 25,
  highlightOnHover = false,
}: DataTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow overflow-hidden" role="status" aria-label="Carregando dados">
        <p className="text-gray-500 text-center py-8">Carregando...</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow overflow-hidden" role="status">
        <p className="text-gray-500 text-center py-8">{emptyMessage}</p>
      </div>
    )
  }

  // Paginação client-side
  const totalPages = Math.ceil(data.length / itemsPerPage)
  const [currentPage, setCurrentPage] = useState(1)
  const startIdx = (currentPage - 1) * itemsPerPage
  const paginatedData = data.slice(startIdx, startIdx + itemsPerPage)

  return (
    <>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto" role="region" aria-label="Tabela de dados" tabIndex={0}>
          <table className="w-full" role="table">
            <thead className="bg-gray-50 border-b">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase" role="columnheader">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  className={`${onRowClick ? 'cursor-pointer hover:bg-blue-50/50' : ''} ${highlightOnHover ? 'hover:bg-gray-50' : ''}`}
                  onClick={() => onRowClick?.(row)}
                  role="row"
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4 text-gray-600" role="cell">
                      {col.render ? col.render(row) : row[col.key] || 'N/A'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {paginate && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={data.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </>
  )
}
