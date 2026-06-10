'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Plus, Bell, CalendarCheck, XCircle, User,
  Search, Loader2, AlertTriangle, Filter, Timer,
  Users, Phone, StickyNote, MapPin,
} from 'lucide-react'
import {
  GlassCard,
  AnimatedMetricCard,
  StaggerContainer,
  StaggerItem,
  PulseIndicator,
} from '@/components/salon/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

type WaitStatus = 'waiting' | 'notified' | 'booked' | 'cancelled'

interface WaitlistEntry {
  id: string
  customerId?: string
  customerName: string
  customerPhone: string
  serviceId: string
  serviceName: string
  preferredDate: string
  preferredTime: string
  status: WaitStatus
  notes: string | null
  branchId: string
  branchName: string
  createdAt: string
}

interface BranchOption {
  id: string
  name: string
}

interface ServiceOption {
  id: string
  name: string
  category: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

function formatTime12(time24: string): string {
  if (!time24) return '--'
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

function getStatusBadge(status: WaitStatus): { label: string; className: string } {
  switch (status) {
    case 'waiting':
      return { label: 'Waiting', className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' }
    case 'notified':
      return { label: 'Notified', className: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800' }
    case 'booked':
      return { label: 'Booked', className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' }
    case 'cancelled':
      return { label: 'Cancelled', className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' }
  }
}

function formatWaitTime(createdAt: string): string {
  const now = new Date()
  const created = new Date(createdAt)
  const diff = now.getTime() - created.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMins = minutes % 60
  return `${hours}h ${remainingMins}m`
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function WaitlistSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
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
        {Array.from({ length: 4 }).map((_, i) => (
          <GlassCard key={i} variant="default" className="p-5" animateOnMount={false}>
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32 rounded" />
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

export function WaitlistModule() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [branchFilter, setBranchFilter] = useState<string>('all')

  // Dialog
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [addForm, setAddForm] = useState({
    customerName: '',
    customerPhone: '',
    serviceId: '',
    preferredDate: '',
    preferredTime: '',
    notes: '',
    branchId: '',
  })

  // Reference
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [services, setServices] = useState<ServiceOption[]>([])

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (branchFilter !== 'all') params.set('branchId', branchFilter)
      const res = await fetch(`/api/waitlist?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setEntries(data.data)
      } else {
        setError(data.error || 'Failed to fetch waitlist')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, branchFilter])

  const fetchReferenceData = useCallback(async () => {
    try {
      const [branchRes, serviceRes] = await Promise.all([
        fetch('/api/branches'),
        fetch('/api/services'),
      ])
      const branchData = await branchRes.json()
      const serviceData = await serviceRes.json()
      if (branchData.success) setBranches(branchData.data)
      if (serviceData.success) {
        const allServices = serviceData.data.flatMap((cat: { services: ServiceOption[] }) =>
          cat.services.map((s: ServiceOption) => ({
            id: s.id,
            name: s.name,
            category: s.category,
          }))
        )
        setServices(allServices)
      }
    } catch (err) {
      console.error('Failed to fetch reference data:', err)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  useEffect(() => {
    fetchReferenceData()
  }, [fetchReferenceData])

  // ─── Computed ───────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const waiting = entries.filter(e => e.status === 'waiting')
    const notifiedToday = entries.filter(e => {
      if (e.status !== 'notified') return false
      const today = new Date().toISOString().split('T')[0]
      return e.preferredDate === today
    })
    const booked = entries.filter(e => e.status === 'booked')
    const avgWait = waiting.length > 0
      ? waiting.reduce((sum, e) => {
          const diff = Date.now() - new Date(e.createdAt).getTime()
          return sum + diff / 60000
        }, 0) / waiting.length
      : 0
    return {
      waitingCount: waiting.length,
      notifiedToday: notifiedToday.length,
      bookedCount: booked.length,
      avgWaitTime: avgWait > 0 ? `${Math.round(avgWait)}m` : '--',
    }
  }, [entries])

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!addForm.customerName || !addForm.serviceId || !addForm.preferredDate) {
      toast.error('Please fill in required fields')
      return
    }
    setSubmitting(true)
    try {
      const service = services.find(s => s.id === addForm.serviceId)
      const branch = branches.find(b => b.id === addForm.branchId)
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: addForm.customerName,
          customerPhone: addForm.customerPhone || undefined,
          serviceId: addForm.serviceId,
          serviceName: service?.name || '',
          preferredDate: addForm.preferredDate,
          preferredTime: addForm.preferredTime || undefined,
          notes: addForm.notes || undefined,
          branchId: addForm.branchId || undefined,
          branchName: branch?.name || '',
          status: 'waiting',
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Added to waitlist')
        setShowAddDialog(false)
        resetForm()
        fetchEntries()
      } else {
        toast.error(data.error || 'Failed to add to waitlist')
      }
    } catch {
      toast.error('Failed to add to waitlist')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNotify = async (id: string) => {
    try {
      const res = await fetch(`/api/waitlist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'notified' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Customer notified')
        setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'notified' as WaitStatus } : e))
      }
    } catch {
      toast.error('Failed to notify customer')
    }
  }

  const handleBook = async (id: string) => {
    try {
      const res = await fetch(`/api/waitlist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'booked' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Converted to booking')
        setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'booked' as WaitStatus } : e))
      }
    } catch {
      toast.error('Failed to convert to booking')
    }
  }

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/waitlist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Waitlist entry cancelled')
        setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'cancelled' as WaitStatus } : e))
      }
    } catch {
      toast.error('Failed to cancel entry')
    }
  }

  const resetForm = () => {
    setAddForm({
      customerName: '',
      customerPhone: '',
      serviceId: '',
      preferredDate: '',
      preferredTime: '',
      notes: '',
      branchId: '',
    })
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading && entries.length === 0) return <WaitlistSkeleton />

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
        <p className="text-sm font-medium text-destructive">Failed to load waitlist</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchEntries}>
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
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Waitlist</h2>
            <p className="text-sm text-muted-foreground">Manage customer waitlist entries</p>
          </div>
        </motion.div>
        <Button
          className="gap-2 bg-tahoe-accent hover:bg-tahoe-accent/90"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-4 w-4" />
          Add to Waitlist
        </Button>
      </div>

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" staggerDelay={0.06}>
        <StaggerItem>
          <AnimatedMetricCard
            title="Waiting"
            value={stats.waitingCount.toString()}
            subtitle="Currently waiting"
            icon={Clock}
            accentGradient="from-amber-500/30 to-orange-500/30"
            iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Notified Today"
            value={stats.notifiedToday.toString()}
            subtitle="Sent notifications"
            icon={Bell}
            accentGradient="from-rose-500/30 to-pink-500/30"
            iconBg="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Converted"
            value={stats.bookedCount.toString()}
            subtitle="To bookings"
            icon={CalendarCheck}
            accentGradient="from-emerald-500/30 to-green-500/30"
            iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Avg Wait Time"
            value={stats.avgWaitTime}
            subtitle="Current average"
            icon={Timer}
            accentGradient="from-pink-500/30 to-rose-500/30"
            iconBg="bg-pink-500/10 text-pink-600 dark:text-pink-400"
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="notified">Notified</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[180px]">
            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Waitlist Entries */}
      <div className="space-y-3">
        <AnimatePresence>
          {entries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <GlassCard variant="default" className="p-12 text-center">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-medium mb-1">No waitlist entries</h3>
                <p className="text-sm text-muted-foreground">
                  {statusFilter !== 'all' || branchFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Add a customer to the waitlist to get started'}
                </p>
              </GlassCard>
            </motion.div>
          ) : (
            entries.map((entry, i) => {
              const statusBadge = getStatusBadge(entry.status)
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100, height: 0 }}
                  transition={{ delay: i * 0.04, type: 'spring', stiffness: 200 }}
                  layout
                >
                  <GlassCard
                    variant="default"
                    className="p-5 group"
                    animateOnMount={false}
                    hover3d={false}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-full text-white text-sm font-bold shrink-0',
                        entry.status === 'waiting' ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                        entry.status === 'notified' ? 'bg-gradient-to-br from-rose-400 to-pink-500' :
                        entry.status === 'booked' ? 'bg-gradient-to-br from-emerald-400 to-green-500' :
                        'bg-gradient-to-br from-gray-400 to-gray-500'
                      )}>
                        {entry.customerName.charAt(0).toUpperCase()}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                          <div>
                            <p className="text-sm font-semibold">{entry.customerName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{entry.customerPhone || 'No phone'}</span>
                            </div>
                          </div>
                          <Badge className={cn('text-[10px] rounded-lg border', statusBadge.className)}>
                            {statusBadge.label}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {entry.serviceName}
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarCheck className="w-3 h-3" />
                            {formatDate(entry.preferredDate)}
                            {entry.preferredTime && ` at ${formatTime12(entry.preferredTime)}`}
                          </span>
                          {entry.branchName && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {entry.branchName}
                            </span>
                          )}
                          {entry.status === 'waiting' && (
                            <span className="flex items-center gap-1 text-amber-500">
                              <Timer className="w-3 h-3" />
                              Waiting {formatWaitTime(entry.createdAt)}
                            </span>
                          )}
                        </div>

                        {entry.notes && (
                          <div className="mt-2 p-2 rounded-lg bg-muted/30 border border-border/20">
                            <p className="text-[11px] text-muted-foreground flex items-start gap-1">
                              <StickyNote className="w-3 h-3 mt-0.5 shrink-0" />
                              {entry.notes}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3">
                          {entry.status === 'waiting' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] gap-1 text-rose-600 border-rose-200 hover:bg-rose-500/10"
                                onClick={() => handleNotify(entry.id)}
                              >
                                <Bell className="h-3 w-3" />
                                Notify
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-500/10"
                                onClick={() => handleBook(entry.id)}
                              >
                                <CalendarCheck className="h-3 w-3" />
                                Book
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] gap-1 text-red-600 border-red-200 hover:bg-red-500/10"
                                onClick={() => handleCancel(entry.id)}
                              >
                                <XCircle className="h-3 w-3" />
                                Cancel
                              </Button>
                            </>
                          )}
                          {entry.status === 'notified' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-500/10"
                                onClick={() => handleBook(entry.id)}
                              >
                                <CalendarCheck className="h-3 w-3" />
                                Book
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] gap-1 text-red-600 border-red-200 hover:bg-red-500/10"
                                onClick={() => handleCancel(entry.id)}
                              >
                                <XCircle className="h-3 w-3" />
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>

      {/* Add to Waitlist Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-tahoe-accent" />
              Add to Waitlist
            </DialogTitle>
            <DialogDescription>Add a customer to the waitlist for a service</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Customer Name *
                </Label>
                <Input
                  placeholder="Full name"
                  value={addForm.customerName}
                  onChange={(e) => setAddForm(prev => ({ ...prev, customerName: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Phone
                </Label>
                <Input
                  placeholder="+92 300 1234567"
                  value={addForm.customerPhone}
                  onChange={(e) => setAddForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Service *</Label>
              <Select value={addForm.serviceId} onValueChange={(v) => setAddForm(prev => ({ ...prev, serviceId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Preferred Date *</Label>
                <Input
                  type="date"
                  value={addForm.preferredDate}
                  onChange={(e) => setAddForm(prev => ({ ...prev, preferredDate: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Preferred Time</Label>
                <Input
                  type="time"
                  value={addForm.preferredTime}
                  onChange={(e) => setAddForm(prev => ({ ...prev, preferredTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Branch
              </Label>
              <Select value={addForm.branchId} onValueChange={(v) => setAddForm(prev => ({ ...prev, branchId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Any branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <StickyNote className="h-4 w-4" /> Notes
              </Label>
              <Textarea
                placeholder="Any special requests..."
                value={addForm.notes}
                onChange={(e) => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm() }}>
              Cancel
            </Button>
            <Button
              className="bg-tahoe-accent hover:bg-tahoe-accent/90"
              onClick={handleAdd}
              disabled={submitting || !addForm.customerName || !addForm.serviceId || !addForm.preferredDate}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add to Waitlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
