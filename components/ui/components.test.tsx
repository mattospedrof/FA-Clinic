import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatCard, Badge, Pagination, Modal, Toast, Skeleton } from '@/components/ui'
import { Calendar } from 'lucide-react'

// ============================================
// StatCard
// ============================================

describe('StatCard', () => {
  it('should render with label and value', () => {
    render(<StatCard label="Total" value={42} icon={Calendar} />)
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<StatCard label="Total" value={42} icon={Calendar} loading />)
    expect(screen.getByText('...')).toBeInTheDocument()
  })

  it('should use custom color', () => {
    const { container } = render(<StatCard label="Total" value={42} icon={Calendar} color="bg-red-500" />)
    expect(container.querySelector('.bg-red-500')).toBeInTheDocument()
  })
})

// ============================================
// Badge
// ============================================

describe('Badge', () => {
  it('should render scheduled status', () => {
    render(<Badge status="scheduled" />)
    expect(screen.getByText('Agendado')).toBeInTheDocument()
  })

  it('should render completed status', () => {
    render(<Badge status="completed" />)
    expect(screen.getByText('Concluído')).toBeInTheDocument()
  })

  it('should render cancelled status', () => {
    render(<Badge status="cancelled" />)
    expect(screen.getByText('Cancelado')).toBeInTheDocument()
  })

  it('should fallback to raw status for unknown values', () => {
    render(<Badge status="unknown_status" />)
    expect(screen.getByText('unknown_status')).toBeInTheDocument()
  })
})

// ============================================
// Toast
// ============================================

describe('Toast', () => {
  it('should render message', () => {
    render(<Toast message="Test message" type="error" />)
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('should call onClose when close button clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<Toast message="Test" type="info" onClose={onClose} />)
    await user.click(screen.getByRole('button'))
    expect(onClose).toHaveBeenCalled()
  })

  it('should use error styling', () => {
    const { container } = render(<Toast message="Error" type="error" />)
    expect(container.querySelector('.bg-red-50')).toBeInTheDocument()
  })

  it('should use success styling', () => {
    const { container } = render(<Toast message="Success" type="success" />)
    expect(container.querySelector('.bg-green-50')).toBeInTheDocument()
  })
})

// ============================================
// Modal
// ============================================

describe('Modal', () => {
  it('should not render when open=false', () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} title="Test">
        <p>Content</p>
      </Modal>
    )
    expect(container.querySelector('.fixed')).not.toBeInTheDocument()
  })

  it('should render when open=true', () => {
    render(
      <Modal open onClose={() => {}} title="Test Title">
        <p>Modal Content</p>
      </Modal>
    )
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Modal Content')).toBeInTheDocument()
  })

  it('should call onClose when X button clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <Modal open onClose={onClose} title="Close Test">
        <p>Content</p>
      </Modal>
    )
    await user.click(screen.getByText('×'))
    expect(onClose).toHaveBeenCalled()
  })
})

// ============================================
// Pagination
// ============================================

describe('Pagination', () => {
  it('should not render for single page', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} totalItems={5} itemsPerPage={25} onPageChange={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render page buttons for multiple pages', () => {
    render(
      <Pagination currentPage={1} totalPages={5} totalItems={100} itemsPerPage={20} onPageChange={() => {}} />
    )
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('should show current page info', () => {
    render(
      <Pagination currentPage={1} totalPages={5} totalItems={100} itemsPerPage={20} onPageChange={() => {}} />
    )
    expect(screen.getByText('Mostrando 1-20 de 100 registros')).toBeInTheDocument()
  })

  it('should call onPageChange when page button clicked', async () => {
    const onPageChange = vi.fn()
    const user = userEvent.setup()
    render(
      <Pagination currentPage={1} totalPages={3} totalItems={30} itemsPerPage={10} onPageChange={onPageChange} />
    )
    await user.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('should call onPageChange when next button clicked', async () => {
    const onPageChange = vi.fn()
    const user = userEvent.setup()
    render(
      <Pagination currentPage={1} totalPages={3} totalItems={30} itemsPerPage={10} onPageChange={onPageChange} />
    )
    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('should disable previous button on first page', () => {
    render(
      <Pagination currentPage={1} totalPages={3} totalItems={30} itemsPerPage={10} onPageChange={() => {}} />
    )
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
  })

  it('should disable next button on last page', () => {
    render(
      <Pagination currentPage={3} totalPages={3} totalItems={30} itemsPerPage={10} onPageChange={() => {}} />
    )
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled()
  })
})

// ============================================
// Skeleton
// ============================================

describe('Skeleton', () => {
  it('should render default count of 3', () => {
    const { container } = render(<Skeleton />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('should render specified count', () => {
    const { container } = render(<Skeleton count={5} />)
    expect(container.querySelectorAll('.bg-gray-200').length).toBeGreaterThan(0)
  })
})
