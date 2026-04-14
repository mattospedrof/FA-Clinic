import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { globalCache } from '@/hooks/useDataCache'
import { useNetworkError } from '@/hooks/useNetworkError'
import { useFormValidation, rules } from '@/hooks/useFormValidation'

// ============================================
// globalCache (MemoryCache)
// ============================================

describe('globalCache', () => {
  beforeEach(() => {
    // Clear cache before each test
    globalCache.invalidatePattern('')
  })

  it('should return null for non-existent key', () => {
    expect(globalCache.get('nonexistent')).toBeNull()
  })

  it('should store and retrieve values', () => {
    globalCache.set('test', { foo: 'bar' }, 5000)
    expect(globalCache.get('test')).toEqual({ foo: 'bar' })
  })

  it('should return null after TTL expires', async () => {
    globalCache.set('short', 'value', 50) // 50ms TTL
    expect(globalCache.get('short')).toBe('value')

    await new Promise((r) => setTimeout(r, 100))
    expect(globalCache.get('short')).toBeNull()
  })

  it('should invalidate specific key', () => {
    globalCache.set('key1', 'a', 60000)
    globalCache.set('key2', 'b', 60000)
    globalCache.invalidate('key1')
    expect(globalCache.get('key1')).toBeNull()
    expect(globalCache.get('key2')).toBe('b')
  })

  it('should invalidate by pattern', () => {
    globalCache.set('cep:01001000', { city: 'SP' }, 60000)
    globalCache.set('cep:02001000', { city: 'RJ' }, 60000)
    globalCache.set('other', 'data', 60000)
    globalCache.invalidatePattern('cep:')
    expect(globalCache.get('cep:01001000')).toBeNull()
    expect(globalCache.get('cep:02001000')).toBeNull()
    expect(globalCache.get('other')).toBe('data')
  })
})

// ============================================
// useNetworkError
// ============================================

describe('useNetworkError', () => {
  it('should start with null error', () => {
    const { result } = renderHook(() => useNetworkError())
    expect(result.current.error).toBeNull()
  })

  it('should detect network error', () => {
    const { result } = renderHook(() => useNetworkError())
    act(() => {
      result.current.handleError({ message: 'Failed to fetch' })
    })
    expect(result.current.error).not.toBeNull()
    expect(result.current.error?.isNetworkError).toBe(true)
    expect(result.current.error?.message).toContain('conexão')
  })

  it('should detect business error', () => {
    const { result } = renderHook(() => useNetworkError())
    act(() => {
      result.current.handleError({ message: 'CPF já cadastrado' })
    })
    expect(result.current.error).not.toBeNull()
    expect(result.current.error?.isNetworkError).toBe(false)
    expect(result.current.error?.message).toBe('CPF já cadastrado')
  })

  it('should clear error', () => {
    const { result } = renderHook(() => useNetworkError())
    act(() => {
      result.current.handleError({ message: 'Some error' })
    })
    expect(result.current.error).not.toBeNull()
    act(() => {
      result.current.clearError()
    })
    expect(result.current.error).toBeNull()
  })

  it('should handle null error gracefully', () => {
    const { result } = renderHook(() => useNetworkError())
    act(() => {
      const res = result.current.handleError(null)
      expect(res).toBeNull()
    })
    expect(result.current.error).toBeNull()
  })
})

// ============================================
// useFormValidation + rules
// ============================================

describe('rules', () => {
  describe('required', () => {
    it('should pass for non-empty string', () => {
      expect(rules.required('Nome').test('John')).toBe(true)
    })

    it('should fail for empty string', () => {
      expect(rules.required('Nome').test('')).toBe(false)
    })

    it('should fail for null/undefined', () => {
      expect(rules.required('Nome').test(null)).toBe(false)
      expect(rules.required('Nome').test(undefined)).toBe(false)
    })

    it('should have correct message', () => {
      expect(rules.required('Nome').message).toBe('Nome é obrigatório')
    })
  })

  describe('email', () => {
    it('should pass for valid email', () => {
      expect(rules.email().test('test@example.com')).toBe(true)
    })

    it('should pass for empty (optional)', () => {
      expect(rules.email().test('')).toBe(true)
    })

    it('should fail for invalid email', () => {
      expect(rules.email().test('not-an-email')).toBe(false)
      expect(rules.email().test('test@')).toBe(false)
      expect(rules.email().test('@example.com')).toBe(false)
    })
  })

  describe('cpf', () => {
    it('should pass for valid CPF', () => {
      expect(rules.cpf().test('742.462.215-35')).toBe(true)
    })

    it('should pass for empty (optional)', () => {
      expect(rules.cpf().test('')).toBe(true)
    })

    it('should fail for invalid CPF', () => {
      expect(rules.cpf().test('123.456.789-00')).toBe(false)
    })
  })

  describe('minLength / maxLength', () => {
    it('should pass min length', () => {
      expect(rules.minLength(3, 'Nome').test('John')).toBe(true)
    })

    it('should fail min length', () => {
      expect(rules.minLength(3, 'Nome').test('Jo')).toBe(false)
    })

    it('should pass max length', () => {
      expect(rules.maxLength(10, 'Campo').test('12345')).toBe(true)
    })

    it('should fail max length', () => {
      expect(rules.maxLength(5, 'Campo').test('123456')).toBe(false)
    })
  })

  describe('futureDate', () => {
    it('should pass for future date', () => {
      const future = new Date()
      future.setDate(future.getDate() + 30)
      expect(rules.futureDate().test(future.toISOString().split('T')[0])).toBe(true)
    })

    it('should pass for today', () => {
      const today = new Date().toISOString().split('T')[0]
      expect(rules.futureDate().test(today)).toBe(true)
    })

    it('should fail for past date', () => {
      expect(rules.futureDate().test('2000-01-01')).toBe(false)
    })
  })
})

describe('useFormValidation', () => {
  it('should start with empty errors', () => {
    const { result } = renderHook(() => useFormValidation({}))
    expect(result.current.errors).toEqual({})
  })

  it('should validate form successfully', async () => {
    const { result } = renderHook(() => useFormValidation({ name: 'John', email: 'john@test.com' }))
    let isValid: boolean
    await act(async () => {
      isValid = result.current.validateForm({
        name: [rules.required('Nome')],
        email: [rules.required('Email'), rules.email()],
      })
    })
    expect(isValid!).toBe(true)
    expect(result.current.errors).toEqual({})
  })

  it('should fail validation with errors', async () => {
    const { result } = renderHook(() => useFormValidation({ name: '', email: 'bad' }))
    let isValid: boolean
    await act(async () => {
      isValid = result.current.validateForm({
        name: [rules.required('Nome')],
        email: [rules.email()],
      })
    })
    expect(isValid!).toBe(false)
    expect(result.current.errors.name).toBe('Nome é obrigatório')
    expect(result.current.errors.email).toBe('E-mail inválido')
  })

  it('should reset validation', async () => {
    const { result } = renderHook(() => useFormValidation({ name: '' }))
    await act(async () => {
      result.current.validateForm({ name: [rules.required('Nome')] })
    })
    expect(result.current.errors.name).toBe('Nome é obrigatório')
    act(() => {
      result.current.resetValidation()
    })
    expect(result.current.errors).toEqual({})
  })
})
