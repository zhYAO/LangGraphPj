'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { AuthForm } from '../components/AuthForm'

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const { isAuthenticated, isLoading, setUser, signInWithOAuth } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, isLoading, router])

  const handleSuccess = async (sessionData?: { user: any }) => {
    if (sessionData?.user) {
      setUser({
        id: sessionData.user.id,
        email: sessionData.user.email,
        name: sessionData.user.name || sessionData.user.email,
      })
    }
    router.replace('/')
  }

  if (isLoading || isAuthenticated) {
    return null
  }

  return (
    <AuthForm
      mode={mode}
      onModeChange={setMode}
      onSuccess={handleSuccess}
      onOAuthLogin={signInWithOAuth}
    />
  )
}
