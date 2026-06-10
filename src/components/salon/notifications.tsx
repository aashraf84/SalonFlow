'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, CheckCheck, Trash2, AlertTriangle, CalendarDays,
  DollarSign, Package, Settings, Info, AlertCircle, CheckCircle2,
  X, Loader2, Filter,
} from 'lucide-react'
import {
  GlassCard,
  AnimatedMetricCard,
  StaggerContainer,
  StaggerItem,
} from '@/components/salon/glass-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

type NotificationCategory = 'appointments' | 'payments' | 'inventory' | 'system'
type NotificationSeverity = 'info' | 'warning' | 'error' | 'success'

interface Notification {
  id: string
  title: string
  message: string
  category: NotificationCategory
  severity: NotificationSeverity
  read: boolean
  createdAt: string
  actionUrl?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getCategoryIcon(category: NotificationCategory) {
  switch (category) {
    case 'appointments': return CalendarDays
    case 'payments': return DollarSign
    case 'inventory': return Package
    case 'system': return Settings
  }
}

function getSeverityConfig(severity: NotificationSeverity) {
  switch (severity) {
    case 'info':
      return {
        icon: Info,
        iconBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
        border: 'border-teal-500/20',
        hoverBg: 'hover:bg-teal-500/[0.03]',
      }
    case 'warning':
      return {
        icon: AlertTriangle,
        iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        border: 'border-amber-500/20',
        hoverBg: 'hover:bg-amber-500/[0.03]',
      }
    case 'error':
      return {
        icon: AlertCircle,
        iconBg: 'bg-red-500/10 text-red-600 dark:text-red-400',
        border: 'border-red-500/20',
        hoverBg: 'hover:bg-red-500/[0.03]',
      }
    case 'success':
      return {
        icon: CheckCircle2,
        iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-500/20',
        hoverBg: 'hover:bg-emerald-500/[0.03]',
      }
  }
}

function getCategoryLabel(cat: NotificationCategory): string {
  switch (cat) {
    case 'appointments': return 'Appointments'
    case 'payments': return 'Payments'
    case 'inventory': return 'Inventory'
    case 'system': return 'System'
  }
}

type FilterTab = 'all' | 'unread' | NotificationCategory

// ─── Skeleton ────────────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <GlassCard key={i} variant="default" className="p-5" animateOnMount={false}>
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20 rounded-lg" />
                <Skeleton className="h-7 w-28 rounded-lg" />
              </div>
              <Skeleton className="h-11 w-11 rounded-xl" />
            </div>
          </GlassCard>
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <GlassCard key={i} variant="default" className="p-4" animateOnMount={false}>
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function NotificationModule() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (activeFilter !== 'all' && activeFilter !== 'unread') {
        params.set('category', activeFilter)
      }
      if (activeFilter === 'unread') {
        params.set('read', 'false')
      }
      const res = await fetch(`/api/notifications?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setNotifications(data.data)
      } else {
        setError(data.error || 'Failed to fetch notifications')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [activeFilter])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // ─── Computed ───────────────────────────────────────────────────────────────

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: notifications.length, unread: 0 }
    notifications.forEach(n => {
      if (!n.read) counts.unread++
      counts[n.category] = (counts[n.category] || 0) + 1
    })
    return counts
  }, [notifications])

  // ─── Actions ────────────────────────────────────────────────────────────────

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      })
      const data = await res.json()
      if (data.success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      }
    } catch {
      toast.error('Failed to mark as read')
    }
  }

  const markAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        toast.success('All notifications marked as read')
      }
    } catch {
      toast.error('Failed to mark all as read')
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setNotifications(prev => prev.filter(n => n.id !== id))
        toast.success('Notification deleted')
      }
    } catch {
      toast.error('Failed to delete notification')
    }
  }

  // ─── Filter Tabs ────────────────────────────────────────────────────────────

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'appointments', label: 'Appointments' },
    { key: 'payments', label: 'Payments' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'system', label: 'System' },
  ]

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading && notifications.length === 0) return <NotificationSkeleton />

  if (error) {
    return (
      <GlassCard variant="elevated" className="p-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <AlertTriangle className="w-10 h-10 mx-auto text-destructive mb-4" />
        </motion.div>
        <p className="text-sm font-medium text-destructive">Failed to load notifications</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchNotifications}>
          Retry
        </Button>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-teal-500/10">
            <Bell className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold">Notifications</h2>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </motion.div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={markAllRead}
          >
            <CheckCheck className="h-4 w-4" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-4" staggerDelay={0.06}>
        <StaggerItem>
          <AnimatedMetricCard
            title="Unread"
            value={unreadCount.toString()}
            subtitle="Need attention"
            icon={Bell}
            accentGradient="from-rose-500/30 to-red-500/30"
            iconBg="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Total"
            value={notifications.length.toString()}
            subtitle="All notifications"
            icon={Info}
            accentGradient="from-teal-500/30 to-cyan-500/30"
            iconBg="bg-teal-500/10 text-teal-600 dark:text-teal-400"
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Filter Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-1.5 overflow-x-auto pb-1"
      >
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-medium transition-all whitespace-nowrap',
              activeFilter === tab.key
                ? 'bg-tahoe-accent text-white shadow-md shadow-tahoe-accent/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]'
            )}
          >
            {tab.label}
            {categoryCounts[tab.key] !== undefined && (
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-md',
                activeFilter === tab.key
                  ? 'bg-white/20'
                  : 'bg-muted'
              )}>
                {categoryCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* Notification List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {notifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <GlassCard variant="default" className="p-12 text-center">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-medium mb-1">No notifications</h3>
                <p className="text-sm text-muted-foreground">
                  {activeFilter !== 'all'
                    ? 'No notifications match your filter'
                    : "You're all caught up!"}
                </p>
              </GlassCard>
            </motion.div>
          ) : (
            notifications.map((notification, i) => {
              const severityConfig = getSeverityConfig(notification.severity)
              const CategoryIcon = getCategoryIcon(notification.category)
              const SeverityIcon = severityConfig.icon

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100, height: 0 }}
                  transition={{ delay: i * 0.03, type: 'spring', stiffness: 200, damping: 20 }}
                  layout
                >
                  <GlassCard
                    variant="default"
                    className={cn(
                      'p-4 group transition-all',
                      !notification.read && 'border-l-2 border-l-tahoe-accent',
                      severityConfig.hoverBg,
                    )}
                    animateOnMount={false}
                    hover3d={false}
                  >
                    <div className="flex items-start gap-3">
                      {/* Category Icon */}
                      <div className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-xl shrink-0',
                        severityConfig.iconBg
                      )}>
                        <SeverityIcon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          if (!notification.read) markAsRead(notification.id)
                        }}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={cn(
                            'text-sm font-semibold truncate',
                            !notification.read && 'text-foreground',
                            notification.read && 'text-muted-foreground'
                          )}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="flex h-2 w-2 rounded-full bg-tahoe-accent shrink-0" />
                          )}
                        </div>
                        <p className={cn(
                          'text-xs leading-relaxed',
                          notification.read ? 'text-muted-foreground' : 'text-foreground/80'
                        )}>
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 rounded-md border-border/50"
                          >
                            <CategoryIcon className="w-3 h-3 mr-1" />
                            {getCategoryLabel(notification.category)}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-lg hover:bg-teal-500/10"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <CheckCheck className="h-3.5 w-3.5 text-teal-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-lg hover:bg-red-500/10"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
