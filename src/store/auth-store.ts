'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  avatar?: string
  phone?: string
  token: string
}

interface AuthStore {
  user: AuthUser | null
  isAuthenticated: boolean
  isDeviceActivated: boolean
  deviceId: string
  isLoading: boolean

  login: (user: AuthUser) => void
  logout: () => void
  setDeviceActivated: (activated: boolean) => void
  setDeviceId: (id: string) => void
  setLoading: (loading: boolean) => void
  checkAuth: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isDeviceActivated: false,
      deviceId: '',
      isLoading: true,

      login: (user: AuthUser) => {
        set({ user, isAuthenticated: true, isLoading: false })
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, isLoading: false })
        // Clear token from localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('salonflow_token')
        }
      },

      setDeviceActivated: (activated: boolean) => {
        set({ isDeviceActivated: activated })
      },

      setDeviceId: (id: string) => {
        set({ deviceId: id })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      checkAuth: () => {
        const state = get()
        if (state.user && state.isAuthenticated) {
          return true
        }
        // Check localStorage for token
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('salonflow_token')
          if (token) {
            // Token exists, we'll validate it via API
            return true
          }
        }
        return false
      },
    }),
    {
      name: 'salonflow-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isDeviceActivated: state.isDeviceActivated,
        deviceId: state.deviceId,
      }),
    }
  )
)
