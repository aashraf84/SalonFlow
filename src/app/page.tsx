'use client'

import { useAuthStore, type AuthUser } from '@/store/auth-store'
import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { LoginPage } from '@/components/salon/login-page'

// Dynamically import the heavy app shell - only loads AFTER login
// This dramatically reduces initial page load memory usage
const MainAppShell = dynamic(() => import('@/components/salon/main-app-shell').then(mod => ({ default: mod.MainAppShell })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex size-8 items-center justify-center rounded-full border-2 border-tahoe-accent border-t-transparent animate-spin" />
    </div>
  )
})

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function SalonFlowOS() {
  const { isAuthenticated, user, login, logout, setLoading, isLoading } = useAuthStore()

  // Validate existing token on mount
  useEffect(() => {
    const validateAuth = async () => {
      const token = localStorage.getItem('salonflow_token')
      if (token) {
        try {
          const res = await fetch('/api/auth/validate', {
            headers: { Authorization: `Bearer ${token}` }
          })
          const json = await res.json()
          if (json.success) {
            login(json.data)
          } else {
            localStorage.removeItem('salonflow_token')
            logout()
          }
        } catch {
          // If validate fails, keep logged out
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }
    validateAuth()
  }, [login, logout, setLoading])

  // Handle login from LoginPage
  const handleLogin = (userData: AuthUser) => {
    login(userData)
  }

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex size-8 items-center justify-center rounded-full border-2 border-tahoe-accent border-t-transparent animate-spin" />
      </div>
    )
  }

  // Show login page if not authenticated (lightweight - no module imports)
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />
  }

  // Show main app shell (dynamically loaded - heavy)
  return <MainAppShell />
}
