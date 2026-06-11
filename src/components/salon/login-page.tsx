'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Lock, Key, Eye, EyeOff, ArrowRight, Sparkles, Shield,
  CheckCircle2, AlertCircle, Loader2, User, Fingerprint,
  Monitor, Zap, Globe, ChevronRight, Clock, Sun, Moon
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
      className="text-center mb-8 select-none"
    >
      <p className="text-7xl sm:text-8xl font-extralight text-white tracking-tight drop-shadow-2xl" style={{ fontFeatureSettings: '"tnum"' }}>
        {timeStr}
      </p>
      <p className="text-lg sm:text-xl font-light text-white/70 mt-1 tracking-wide">
        {dateStr}
      </p>
    </motion.div>
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
  const [demoStep, setDemoStep] = useState(0)

  // ─── Initialize ───────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      // Get or create device ID
      let storedDeviceId = localStorage.getItem('salonflow_device_id')
      if (!storedDeviceId) {
        storedDeviceId = generateDeviceId()
        localStorage.setItem('salonflow_device_id', storedDeviceId)
      }
      setDeviceId(storedDeviceId)

      // Check if device is already activated
      try {
        const res = await fetch(`/api/auth/activate?deviceId=${encodeURIComponent(storedDeviceId)}`)
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

      // Seed demo data on first load
      try {
        await fetch('/api/auth/seed', { method: 'GET' })
      } catch { /* ignore */ }
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
      const res = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          serialKey: serialKey.trim().toUpperCase(),
          deviceName: navigator.userAgent.split(' ').slice(-1)[0] || 'Unknown',
          browserInfo: navigator.userAgent.substring(0, 100),
        }),
      })
      const json = await res.json()

      if (json.success) {
        toast.success('Device activated successfully!')
        setIsDeviceActivated(true)
        setTimeout(() => setPhase('login'), 500)
      } else {
        setActivationError(json.error || 'Activation failed')
        setPhase('activate')
      }
    } catch {
      setActivationError('Connection error. Please try again.')
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })
      const json = await res.json()

      if (json.success) {
        localStorage.setItem('salonflow_token', json.data.token)
        toast.success(`Welcome back, ${json.data.name}!`)
        onLogin(json.data)
      } else {
        setLoginError(json.error || 'Login failed')
        setPhase('login')
      }
    } catch {
      setLoginError('Connection error. Please try again.')
      setPhase('login')
    }
  }

  // ─── Handle Demo Login ────────────────────────────────────────────────────
  const handleDemoLogin = async () => {
    setDemoTyping(true)
    setDemoStep(1)
    setEmail('demo@salonflow.pk')

    await new Promise(r => setTimeout(r, 300))
    setDemoStep(2)
    setPassword('demo123')

    await new Promise(r => setTimeout(r, 400))
    setDemoStep(3)

    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' })
      const json = await res.json()

      if (json.success) {
        localStorage.setItem('salonflow_token', json.data.token)
        toast.success(`Welcome to SalonFlow OS Demo!`)
        await new Promise(r => setTimeout(r, 300))
        onLogin(json.data)
      } else {
        setLoginError(json.error || 'Demo login failed')
        setPhase('login')
      }
    } catch {
      setLoginError('Connection error')
      setPhase('login')
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
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* ─── Background ──────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900" />

      {/* ─── Content ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
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
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl shadow-black/20">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
                  className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/30 to-pink-600/30 border border-white/20 mx-auto mb-6"
                >
                  <Shield className="size-10 text-white drop-shadow-lg" />
                </motion.div>

                {/* Title */}
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-white mb-2">Activate Your Device</h1>
                  <p className="text-sm text-white/60 leading-relaxed">
                    This device needs to be activated with a valid serial key before you can access SalonFlow OS.
                  </p>
                </div>

                {/* Serial Key Input */}
                <div className="space-y-4">
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/40" />
                    <Input
                      placeholder="Enter Serial Key (e.g. SALONFLOW-PRO-2024-LICENSE)"
                      className="pl-11 h-12 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/30 rounded-xl focus:border-rose-400/50 focus:ring-rose-400/20"
                      value={serialKey}
                      onChange={e => setSerialKey(e.target.value.toUpperCase())}
                      onKeyDown={e => handleKeyDown(e, 'activate')}
                      disabled={phase === 'activating'}
                    />
                  </div>

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
                    className="w-full h-12 text-sm font-semibold rounded-xl gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg shadow-rose-500/30 disabled:opacity-50"
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
                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-white/30">
                    <Monitor className="size-3" />
                    <span className="text-[10px] font-mono truncate">Device: {deviceId.slice(0, 25)}...</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ═══ LOGIN SCREEN ═══════════════════════════════════════════════════ */
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-5xl flex flex-col lg:flex-row items-center gap-8 lg:gap-16"
            >
              {/* ─── LEFT: Login Form ──────────────────────────────────────────── */}
              <div className="w-full max-w-sm">
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
                        className={cn(
                          'pl-10 h-11 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/25 rounded-xl focus:border-rose-400/50 focus:ring-rose-400/20',
                          demoTyping && demoStep >= 1 && 'border-rose-400/50'
                        )}
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
                        className={cn(
                          'pl-10 pr-10 h-11 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/25 rounded-xl focus:border-rose-400/50 focus:ring-rose-400/20',
                          demoTyping && demoStep >= 2 && 'border-rose-400/50'
                        )}
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

              {/* ─── RIGHT: Demo Login Card ────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="w-full max-w-xs"
              >
                <div className="bg-white/10 backdrop-blur-2xl border border-white/15 rounded-2xl p-6 shadow-2xl shadow-black/20 relative overflow-hidden">
                  {/* Decorative glow */}
                  <div className="absolute -top-20 -right-20 size-40 bg-rose-500/20 rounded-full blur-3xl" />
                  <div className="absolute -bottom-20 -left-20 size-40 bg-pink-500/20 rounded-full blur-3xl" />

                  <div className="relative">
                    {/* Demo Badge */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/20">
                        <Sparkles className="size-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Demo Access</p>
                        <p className="text-[10px] text-white/30">Try SalonFlow OS</p>
                      </div>
                    </div>

                    <p className="text-xs text-white/40 leading-relaxed mb-4">
                      Click below to auto-fill demo credentials and explore all features of SalonFlow OS with sample data.
                    </p>

                    {/* Demo Credentials Preview */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="size-3 text-white/30" />
                        <span className="text-[10px] text-white/30">Email</span>
                      </div>
                      <p className={cn(
                        'text-xs font-mono transition-colors duration-300',
                        demoTyping && demoStep >= 1 ? 'text-rose-300' : 'text-white/20'
                      )}>
                        {demoTyping && demoStep >= 1 ? 'demo@salonflow.pk' : '••••••••••••'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Lock className="size-3 text-white/30" />
                        <span className="text-[10px] text-white/30">Password</span>
                      </div>
                      <p className={cn(
                        'text-xs font-mono transition-colors duration-300',
                        demoTyping && demoStep >= 2 ? 'text-rose-300' : 'text-white/20'
                      )}>
                        {demoTyping && demoStep >= 2 ? '••••••' : '••••••'}
                      </p>
                    </div>

                    {/* Demo Login Button */}
                    <Button
                      className="w-full h-11 text-sm font-semibold rounded-xl gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 hover:border-white/30 shadow-lg disabled:opacity-50 transition-all duration-200"
                      onClick={handleDemoLogin}
                      disabled={demoTyping || phase === 'logging-in'}
                    >
                      {demoTyping ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        <>
                          <Zap className="size-4" />
                          Demo Login
                          <ChevronRight className="size-3 opacity-50" />
                        </>
                      )}
                    </Button>

                    {/* Info */}
                    <div className="flex items-start gap-2 mt-3">
                      <Globe className="size-3 text-white/20 shrink-0 mt-0.5" />
                      <p className="text-[9px] text-white/20 leading-relaxed">
                        Demo account with full admin access. All features available. Data resets periodically.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Info Cards */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-4 space-y-2"
                >
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3 flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                      <Shield className="size-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-white/60">Enterprise Security</p>
                      <p className="text-[9px] text-white/25">Encrypted & Device-Locked</p>
                    </div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3 flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
                      <Fingerprint className="size-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-white/60">Device Binding</p>
                      <p className="text-[9px] text-white/25">Serial Key Activation</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
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
