'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Usar window.location para que o proxy intercepte e redirecione
      if (session) window.location.href = '/dashboard'
      else window.location.href = '/login'
    })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Verificando autenticação...</p>
    </div>
  )
}
