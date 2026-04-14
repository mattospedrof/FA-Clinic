import { useState, useCallback } from 'react'
import { validateCpf } from '@/lib/utils'

export type ValidationRule = {
  test: (value: any) => boolean
  message: string
}

export type FormErrors = Record<string, string>

/**
 * Hook de validação de formulários reutilizável.
 * Valida campos individualmente e o formulário completo.
 */
export function useFormValidation<T extends Record<string, any>>(initialValues: T) {
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validateField = useCallback((name: string, value: any, rules: ValidationRule[]): string | null => {
    for (const rule of rules) {
      if (!rule.test(value)) {
        setErrors(prev => ({ ...prev, [name]: rule.message }))
        return rule.message
      }
    }
    setErrors(prev => {
      const next = { ...prev }
      delete next[name]
      return next
    })
    return null
  }, [])

  const touchField = useCallback((name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }))
  }, [])

  const validateForm = useCallback((fields: Record<string, ValidationRule[]>): boolean => {
    const newErrors: FormErrors = {}
    let isValid = true

    for (const [name, rules] of Object.entries(fields)) {
      for (const rule of rules) {
        if (!rule.test(initialValues[name as keyof T])) {
          newErrors[name] = rule.message
          isValid = false
          break
        }
      }
    }

    setErrors(newErrors)
    setTouched(Object.fromEntries(Object.keys(fields).map(k => [k, true])) as Record<string, boolean>)
    return isValid
  }, [initialValues])

  const resetValidation = useCallback(() => {
    setErrors({})
    setTouched({})
  }, [])

  return { errors, touched, validateField, validateForm, touchField, resetValidation }
}

// ============================================
// REGRAS COMUNS DE VALIDAÇÃO
// ============================================

export const rules = {
  required: (fieldLabel: string = 'Este campo'): ValidationRule => ({
    test: (v) => v !== undefined && v !== null && v !== '',
    message: `${fieldLabel} é obrigatório`,
  }),

  minLength: (min: number, fieldLabel: string = 'Este campo'): ValidationRule => ({
    test: (v) => typeof v === 'string' && v.length >= min,
    message: `${fieldLabel} deve ter no mínimo ${min} caracteres`,
  }),

  maxLength: (max: number, fieldLabel: string = 'Este campo'): ValidationRule => ({
    test: (v) => typeof v === 'string' && v.length <= max,
    message: `${fieldLabel} deve ter no máximo ${max} caracteres`,
  }),

  email: (): ValidationRule => ({
    test: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    message: 'E-mail inválido',
  }),

  cpf: (): ValidationRule => ({
    test: (v) => !v || validateCpf(v),
    message: 'CPF inválido',
  }),

  phone: (): ValidationRule => ({
    test: (v) => {
      if (!v) return true
      const digits = v.replace(/\D/g, '')
      return digits.length >= 10 && digits.length <= 11
    },
    message: 'Telefone inválido (mínimo 10 dígitos)',
  }),

  date: (): ValidationRule => ({
    test: (v) => {
      if (!v) return true
      const d = new Date(v + 'T00:00:00')
      return !isNaN(d.getTime()) && d <= new Date()
    },
    message: 'Data inválida',
  }),

  futureDate: (): ValidationRule => ({
    test: (v) => {
      if (!v) return true
      const d = new Date(v + 'T00:00:00')
      return !isNaN(d.getTime()) && d >= new Date(new Date().toDateString())
    },
    message: 'Data deve ser hoje ou no futuro',
  }),

  pastDate: (): ValidationRule => ({
    test: (v) => {
      if (!v) return true
      const d = new Date(v + 'T00:00:00')
      return !isNaN(d.getTime()) && d <= new Date()
    },
    message: 'Data deve ser hoje ou no passado',
  }),
}
