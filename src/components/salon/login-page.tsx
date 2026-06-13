'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Lock, Key, Eye, EyeOff, ArrowRight, Sparkles, Shield,
  CheckCircle2, AlertCircle, Loader2, User, Fingerprint,
  Monitor, Zap, Clock
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Device Fingerprint Generator ────────────────────────────────────────────
function generateDeviceId(): string {
  if (typeof window === 'undefined') return ''
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('SalonFlow-Device-Fingerprint', 2, 2)
  }
  const canvasData = canvas.toDataURL()
  const nav = navigator
  const screen = window.screen
  const raw = [
    nav.userAgent,
    nav.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency || 'n/a',
    canvasData.slice(-50),
  ].join('||')
  // Simple hash
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return 'SF-DEV-' + Math.abs(hash).toString(36).toUpperCase() + '-' + Date.now().toString(36).toUpperCase()
}

// ─── Live Clock Component ────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr = time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.8 }}
      className="text-center mb-4 select-none"
    >
      <p className="text-5xl sm:text-6xl font-extralight text-white tracking-tight drop-shadow-2xl" style={{ fontFeatureSettings: '"tnum"' }}>
        {timeStr}
      </p>
      <p className="text-sm font-light text-white/70 mt-0.5 tracking-wide">
        {dateStr}
      </p>
    </motion.div>
  )
}

// ─── Demo Login Button Component (reusable) ────────────────────────────────
function DemoLoginButton({ onClick, disabled, compact = false }: { onClick: () => void; disabled: boolean; compact?: boolean }) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl",
      compact ? "bg-white/6 border border-amber-400/15 p-2.5" : "bg-white/8 backdrop-blur-xl border border-amber-400/20 p-3"
    )}>
      <div className="absolute -top-16 -right-16 size-32 bg-amber-500/15 rounded-full blur-3xl" />
      <div className="relative">
        <div className={cn("flex items-center gap-3", compact && "gap-2.5", !compact && "mb-2")}>
          <div className={cn(
            "flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/30 to-orange-500/30 border border-amber-400/25 shrink-0",
            compact ? "size-8" : "size-9"
          )}>
            <Sparkles className={cn("text-amber-300", compact ? "size-3.5" : "size-4")} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("font-bold text-white", compact ? "text-xs" : "text-sm")}>Try Demo Mode</p>
            <p className="text-[10px] text-white/40">{compact ? 'View-only access, no activation needed' : 'View-only access — explore features without editing'}</p>
          </div>
        </div>
        <Button
          className={cn(
            "w-full text-sm font-semibold rounded-xl gap-2 bg-gradient-to-r from-amber-500/80 to-orange-600/80 hover:from-amber-500 hover:to-orange-600 text-white border border-amber-400/30 hover:border-amber-400/50 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all duration-200",
            compact ? "h-9" : "h-10"
          )}
          onClick={onClick}
          disabled={disabled}
        >
          {disabled ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing In...
            </>
          ) : (
            <>
              <Zap className="size-4" />
              Demo (View-Only)
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ─── Main Login Page ─────────────────────────────────────────────────────────
interface LoginPageProps {
  onLogin: (user: { id: string; email: string; name: string; role: string; avatar?: string; phone?: string; token: string }) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  // Activation state
  const [phase, setPhase] = useState<'loading' | 'activate' | 'login' | 'activating' | 'logging-in'>('loading')
  const [deviceId, setDeviceId] = useState('')
  const [serialKey, setSerialKey] = useState('')
  const [activationError, setActivationError] = useState('')
  const [isDeviceActivated, setIsDeviceActivated] = useState(false)

  // Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  // Demo login animation
  const [demoTyping, setDemoTyping] = useState(false)

  // ─── Initialize (combined seed + activation check) ────────────────────────
  useEffect(() => {
    const init = async () => {
      // Get or create device ID
      let storedDeviceId = localStorage.getItem('salonflow_device_id')
      if (!storedDeviceId) {
        storedDeviceId = generateDeviceId()
        localStorage.setItem('salonflow_device_id', storedDeviceId)
      }
      setDeviceId(storedDeviceId)

      const fetchWithTimeout = (url: string, timeoutMs: number) => {
        const controller = new AbortController()
        const id = setTimeout(() => controller.abort(), timeoutMs)
        return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id))
      }

      // Try init endpoint with retries
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetchWithTimeout(`/api/auth/init?deviceId=${encodeURIComponent(storedDeviceId)}`, 15000)
          const json = await res.json()

          if (json.success && json.data?.activated) {
            setIsDeviceActivated(true)
            setPhase('login')
          } else {
            setPhase('activate')
          }
          return
        } catch (err) {
          console.warn(`Init attempt ${attempt + 1} failed:`, err)
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
        }
      }

      // Fallback: try direct activation check
      try {
        const res = await fetchWithTimeout(`/api/auth/activate?deviceId=${encodeURIComponent(storedDeviceId)}`, 10000)
        const json = await res.json()
        if (json.success && json.data?.activated) {
          setIsDeviceActivated(true)
          setPhase('login')
        } else {
          setPhase('activate')
        }
      } catch {
        setPhase('activate')
      }
    }
    init()
  }, [])

  // ─── Handle Serial Key Activation ────────────────────────────────────────
  const handleActivate = async () => {
    if (!serialKey.trim()) {
      setActivationError('Please enter a serial key')
      return
    }

    setPhase('activating')
    setActivationError('')

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)

      const res = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          serialKey: serialKey.trim().toUpperCase(),
          deviceName: navigator.userAgent.split(' ').slice(-1)[0] || 'Unknown',
          browserInfo: navigator.userAgent.substring(0, 100),
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const json = await res.json()

      if (json.success) {
        toast.success('Device activated successfully!')
        setIsDeviceActivated(true)
        setTimeout(() => setPhase('login'), 500)
      } else {
        setActivationError(json.error || 'Activation failed')
        setPhase('activate')
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setActivationError('Request timed out. Please try again.')
      } else {
        setActivationError('Connection error. Please try again.')
      }
      setPhase('activate')
    }
  }

  // ─── Handle Login ─────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setLoginError('Please enter email and password')
      return
    }

    setPhase('logging-in')
    setLoginError('')

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const json = await res.json()

      if (json.success) {
        localStorage.setItem('salonflow_token', json.data.token)
        toast.success(`Welcome back, ${json.data.name}!`)
        onLogin(json.data)
      } else {
        setLoginError(json.error || 'Login failed')
        setPhase('login')
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setLoginError('Request timed out. Please try again.')
      } else {
        setLoginError('Connection error. Please try again.')
      }
      setPhase('login')
    }
  }

  // ─── Handle Demo Login ────────────────────────────────────────────────────
  const handleDemoLogin = async () => {
    setDemoTyping(true)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const json = await res.json()

      if (json.success) {
        localStorage.setItem('salonflow_token', json.data.token)

        // Auto-activate device in background (non-blocking, ignore errors)
        fetch('/api/auth/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId,
            serialKey: 'SALON-DEMO-2024-ACTIVATION',
            deviceName: navigator.userAgent.split(' ').slice(-1)[0] || 'Demo Device',
            browserInfo: navigator.userAgent.substring(0, 100),
          }),
        }).catch(() => {})

        toast.success('Welcome to SalonFlow OS Demo!')
        onLogin(json.data)
      } else {
        toast.error(json.error || 'Demo login failed')
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        toast.error('Request timed out. Server may be starting up, please try again.')
      } else {
        toast.error('Connection error. Please try again.')
      }
    }
    setDemoTyping(false)
  }

  // ─── Handle Enter Key ─────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent, action: 'activate' | 'login') => {
    if (e.key === 'Enter') {
      if (action === 'activate') handleActivate()
      else handleLogin()
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* ─── Background ──────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900" />

      {/* ─── Content ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8 overflow-y-auto">
        {/* Clock */}
        <LiveClock />

        {/* Main Content Area */}
        <AnimatePresence mode="wait">
          {phase === 'loading' ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <Loader2 className="size-8 text-white/60 animate-spin" />
              <p className="text-sm text-white/40">Initializing SalonFlow OS...</p>
            </motion.div>
          ) : phase === 'activate' || phase === 'activating' ? (
            /* ═══ SERIAL KEY ACTIVATION ═════════════════════════════════════════ */
            <motion.div
              key="activate"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md"
            >
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 shadow-2xl shadow-black/20">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
                  className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/30 to-pink-600/30 border border-white/20 mx-auto mb-3"
                >
                  <Shield className="size-7 text-white drop-shadow-lg" />
                </motion.div>

                {/* Title */}
                <div className="text-center mb-4">
                  <h1 className="text-xl font-bold text-white mb-1">Activate Your Device</h1>
                  <p className="text-xs text-white/60 leading-relaxed">
                    This device needs to be activated with a valid serial key before you can access SalonFlow OS.
                  </p>
                </div>

                {/* Serial Key Input */}
                <div className="space-y-3">
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/40" />
                    <Input
                      placeholder="Enter Serial Key (e.g. SF-XXXX-XXXX-XXXXX)"
                      className="pl-11 h-11 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/30 rounded-xl focus:border-rose-400/50 focus:ring-rose-400/20"
                      value={serialKey}
                      onChange={e => setSerialKey(e.target.value.toUpperCase())}
                      onKeyDown={e => handleKeyDown(e, 'activate')}
                      disabled={phase === 'activating'}
                    />
                  </div>

                  {/* Serial key input help text */}
                  <p className="text-[10px] text-white/25 text-center">
                    Contact your administrator for a valid serial key
                  </p>

                  {activationError && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
                    >
                      <AlertCircle className="size-4 text-red-400 shrink-0" />
                      <span className="text-xs text-red-300">{activationError}</span>
                    </motion.div>
                  )}

                  <Button
                    className="w-full h-11 text-sm font-semibold rounded-xl gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg shadow-rose-500/30 disabled:opacity-50"
                    onClick={handleActivate}
                    disabled={phase === 'activating' || !serialKey.trim()}
                  >
                    {phase === 'activating' ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Activating Device...
                      </>
                    ) : (
                      <>
                        <Zap className="size-4" />
                        Activate Device
                      </>
                    )}
                  </Button>
                </div>

                {/* Device Info */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2 text-white/30">
                    <Monitor className="size-3" />
                    <span className="text-[10px] font-mono truncate">Device: {deviceId.slice(0, 25)}...</span>
                  </div>
                </div>
              </div>

              {/* Demo Login - Below Activation Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-3"
              >
                <DemoLoginButton onClick={handleDemoLogin} disabled={demoTyping || phase === 'activating'} />
                <p className="text-[9px] text-white/20 text-center mt-1.5">
                  View-only access with sample data. No activation required.
                </p>
              </motion.div>
            </motion.div>
          ) : (
            /* ═══ LOGIN SCREEN ═══════════════════════════════════════════════════ */
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-sm"
            >
              <div className="w-full">
                {/* User Avatar */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  className="flex flex-col items-center mb-8"
                >
                  <div className="relative">
                    <div className="flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-pink-600 shadow-2xl shadow-rose-500/30 ring-4 ring-white/20">
                      <User className="size-12 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white/20">
                      <CheckCircle2 className="size-4 text-white" />
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-white mt-4">SalonFlow OS</h2>
                  <p className="text-xs text-white/50 mt-1">Beauty & Spa Management System</p>
                </motion.div>

                {/* Login Card */}
                <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-2xl shadow-black/20">
                  {/* Email */}
                  <div className="space-y-1.5 mb-4">
                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Email</Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                      <Input
                        placeholder="Enter your email"
                        type="email"
                        className="pl-10 h-11 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/25 rounded-xl focus:border-rose-400/50 focus:ring-rose-400/20"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => handleKeyDown(e, 'login')}
                        disabled={phase === 'logging-in'}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5 mb-4">
                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                      <Input
                        placeholder="Enter your password"
                        type={showPassword ? 'text' : 'password'}
                        className="pl-10 pr-10 h-11 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/25 rounded-xl focus:border-rose-400/50 focus:ring-rose-400/20"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => handleKeyDown(e, 'login')}
                        disabled={phase === 'logging-in'}
                      />
                      <button
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                        type="button"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center justify-between mb-5">
                    <button
                      className="flex items-center gap-2 group"
                      onClick={() => setRememberMe(!rememberMe)}
                      type="button"
                    >
                      <div className={cn(
                        'flex size-4 items-center justify-center rounded border transition-all',
                        rememberMe ? 'bg-rose-500 border-rose-500' : 'border-white/20 group-hover:border-white/40'
                      )}>
                        {rememberMe && <CheckCircle2 className="size-3 text-white" />}
                      </div>
                      <span className="text-[11px] text-white/40 group-hover:text-white/60 transition-colors">Remember me</span>
                    </button>
                    <button className="text-[11px] text-rose-300/60 hover:text-rose-300 transition-colors" type="button">
                      Forgot password?
                    </button>
                  </div>

                  {/* Login Error */}
                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4"
                    >
                      <AlertCircle className="size-4 text-red-400 shrink-0" />
                      <span className="text-xs text-red-300">{loginError}</span>
                    </motion.div>
                  )}

                  {/* Login Button */}
                  <Button
                    className="w-full h-11 text-sm font-semibold rounded-xl gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg shadow-rose-500/30 disabled:opacity-50"
                    onClick={handleLogin}
                    disabled={phase === 'logging-in' || !email.trim() || !password.trim()}
                  >
                    {phase === 'logging-in' ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>

                  {/* Demo Login on Login Screen */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <DemoLoginButton onClick={handleDemoLogin} disabled={demoTyping || phase === 'logging-in'} compact />
                  </div>

                  {/* Demo Credentials Hint */}
                  <div className="mt-3 p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[10px] text-white/30 text-center">
                      Demo credentials: <span className="font-mono text-white/50">demo@salonflow.pk</span> / <span className="font-mono text-white/50">demo123</span>
                    </p>
                  </div>
                </div>

                {/* Activation status */}
                {isDeviceActivated && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center justify-center gap-1.5 mt-3 text-white/20"
                  >
                    <Shield className="size-3" />
                    <span className="text-[10px]">Device Activated</span>
                    <CheckCircle2 className="size-2.5 text-emerald-400/60" />
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-6 left-0 right-0 flex justify-center"
        >
          <div className="flex items-center gap-4 text-white/20 text-[10px]">
            <span>SalonFlow OS v2.0</span>
            <span>·</span>
            <span>Enterprise Edition</span>
            <span>·</span>
            <span>Powered by ApexFlow</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
