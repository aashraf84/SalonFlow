'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign, Plus, Users, CheckCircle2, Clock,
  Loader2, AlertTriangle, Filter, Wallet, TrendingUp,
} from 'lucide-react'
import {
  GlassCard,
  AnimatedMetricCard,
  StaggerContainer,
  StaggerItem,
} from '@/components/salon/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
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

type CommissionStatus = 'pending' | 'paid'
type CommissionType = 'service' | 'product' | 'bonus' | 'referral'

interface Commission {
  id: string
  staffId: string
  staffName: string
  type: CommissionType
  amount: number
  period: string
  status: CommissionStatus
  date: string
}

interface StaffOption {
  id: string
  firstName: string
  lastName: string
  role: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `PKR ${amount.toLocaleString()}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function getTypeBadge(type: CommissionType): { label: string; className: string } {
  switch (type) {
    case 'service':
      return { label: 'Service', className: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800' }
    case 'product':
      return { label: 'Product', className: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800' }
    case 'bonus':
      return { label: 'Bonus', className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' }
    case 'referral':
      return { label: 'Referral', className: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800' }
  }
}

function getStatusBadge(status: CommissionStatus): { label: string; className: string } {
  switch (status) {
    case 'pending':
      return { label: 'Pending', className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' }
    case 'paid':
      return { label: 'Paid', className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' }
  }
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function CommissionSkeleton() {
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
      <GlassCard variant="default" className="p-0 overflow-hidden" animateOnMount={false}>
        <div className="space-y-3 p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-6">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CommissionModule() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [staffFilter, setStaffFilter] = useState<string>('all')
  const [periodFilter, setPeriodFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [addForm, setAddForm] = useState({
    staffId: '',
    type: 'service' as CommissionType,
    amount: '',
    period: '',
  })

  // Reference
  const [staffList, setStaffList] = useState<StaffOption[]>([])

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchCommissions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (staffFilter !== 'all') params.set('staffId', staffFilter)
      if (periodFilter !== 'all') params.set('period', periodFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/commissions?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setCommissions(data.data)
      } else {
        setError(data.error || 'Failed to fetch commissions')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [staffFilter, periodFilter, statusFilter])

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch('/api/staff?take=100&status=active')
      const data = await res.json()
      if (data.success) {
        setStaffList(data.data.map((s: StaffOption) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          role: s.role,
        })))
      }
    } catch (err) {
      console.error('Failed to fetch staff:', err)
    }
  }, [])

  useEffect(() => {
    fetchCommissions()
  }, [fetchCommissions])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  // ─── Computed ───────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const pending = commissions.filter(c => c.status === 'pending')
    const paid = commissions.filter(c => c.status === 'paid')
    const totalPending = pending.reduce((sum, c) => sum + c.amount, 0)
    const totalPaid = paid.reduce((sum, c) => sum + c.amount, 0)
    const now = new Date()
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const thisPeriod = commissions.filter(c => c.period === currentPeriod)
    const thisPeriodTotal = thisPeriod.reduce((sum, c) => sum + c.amount, 0)
    const uniqueStaff = new Set(commissions.map(c => c.staffId)).size
    return { totalPending, totalPaid, thisPeriodTotal, staffCount: uniqueStaff }
  }, [commissions])

  // Per-staff summaries
  const staffSummaries = useMemo(() => {
    const map: Record<string, { name: string; total: number; pending: number; paid: number }> = {}
    commissions.forEach(c => {
      if (!map[c.staffId]) {
        map[c.staffId] = { name: c.staffName, total: 0, pending: 0, paid: 0 }
      }
      map[c.staffId].total += c.amount
      if (c.status === 'pending') map[c.staffId].pending += c.amount
      if (c.status === 'paid') map[c.staffId].paid += c.amount
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [commissions])

  // Unique periods for filter
  const periods = useMemo(() => {
    const set = new Set(commissions.map(c => c.period))
    return Array.from(set).sort().reverse()
  }, [commissions])

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleAddCommission = async () => {
    if (!addForm.staffId || !addForm.amount || !addForm.period) {
      toast.error('Please fill in all fields')
      return
    }
    setSubmitting(true)
    try {
      const staff = staffList.find(s => s.id === addForm.staffId)
      const res = await fetch('/api/commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: addForm.staffId,
          staffName: staff ? `${staff.firstName} ${staff.lastName}` : '',
          type: addForm.type,
          amount: parseFloat(addForm.amount),
          period: addForm.period,
          status: 'pending',
          date: new Date().toISOString(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Commission added successfully')
        setShowAddDialog(false)
        resetAddForm()
        fetchCommissions()
      } else {
        toast.error(data.error || 'Failed to add commission')
      }
    } catch {
      toast.error('Failed to add commission')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkAsPaid = async (id: string) => {
    try {
      const res = await fetch(`/api/commissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Commission marked as paid')
        setCommissions(prev => prev.map(c => c.id === id ? { ...c, status: 'paid' as CommissionStatus } : c))
      }
    } catch {
      toast.error('Failed to update commission')
    }
  }

  const resetAddForm = () => {
    setAddForm({ staffId: '', type: 'service', amount: '', period: '' })
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading && commissions.length === 0) return <CommissionSkeleton />

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
        <p className="text-sm font-medium text-destructive">Failed to load commissions</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchCommissions}>
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
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10">
            <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Commissions & Payroll</h2>
            <p className="text-sm text-muted-foreground">Track and manage staff commissions</p>
          </div>
        </motion.div>
        <Button
          className="gap-2 bg-tahoe-accent hover:bg-tahoe-accent/90"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-4 w-4" />
          Add Commission
        </Button>
      </div>

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" staggerDelay={0.06}>
        <StaggerItem>
          <AnimatedMetricCard
            title="Total Pending"
            value={formatCurrency(stats.totalPending)}
            subtitle="Awaiting payment"
            icon={Clock}
            accentGradient="from-amber-500/30 to-orange-500/30"
            iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Total Paid"
            value={formatCurrency(stats.totalPaid)}
            subtitle="All time"
            icon={CheckCircle2}
            accentGradient="from-emerald-500/30 to-green-500/30"
            iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="This Period"
            value={formatCurrency(stats.thisPeriodTotal)}
            subtitle="Current month"
            icon={TrendingUp}
            accentGradient="from-rose-500/30 to-pink-500/30"
            iconBg="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Staff Count"
            value={stats.staffCount.toString()}
            subtitle="With commissions"
            icon={Users}
            accentGradient="from-pink-500/30 to-rose-500/30"
            iconBg="bg-pink-500/10 text-pink-600 dark:text-pink-400"
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Staff Summary Cards */}
      {staffSummaries.length > 0 && (
        <GlassCard variant="default" glow delay={0.3} className="p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-500/10">
                <Users className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold">Period Summary</h3>
                <p className="text-[11px] text-muted-foreground">Per-staff commission totals</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {staffSummaries.map((summary, i) => (
              <motion.div
                key={summary.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.05, type: 'spring', stiffness: 200 }}
                className="p-3 rounded-xl border border-border/30 hover:border-border/60 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-white text-[10px] font-bold shrink-0">
                    {summary.name.charAt(0)}
                  </div>
                  <p className="text-sm font-semibold truncate">{summary.name}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold">{formatCurrency(summary.total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-500">Pending</span>
                    <span className="font-medium text-amber-600 dark:text-amber-400">{formatCurrency(summary.pending)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-500">Paid</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(summary.paid)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Select value={staffFilter} onValueChange={setStaffFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            {staffList.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Periods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Periods</SelectItem>
            {periods.map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Commissions Table */}
      <GlassCard variant="default" glow delay={0.45} className="p-0 overflow-hidden">
        {commissions.length === 0 ? (
          <div className="text-center py-16">
            <Wallet className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-medium mb-1">No commissions found</h3>
            <p className="text-sm text-muted-foreground">
              {staffFilter !== 'all' || periodFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Add a commission to get started'}
            </p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="pl-6 text-[11px]">Staff</TableHead>
                  <TableHead className="text-[11px]">Type</TableHead>
                  <TableHead className="text-[11px]">Amount</TableHead>
                  <TableHead className="text-[11px] hidden md:table-cell">Period</TableHead>
                  <TableHead className="text-[11px]">Status</TableHead>
                  <TableHead className="text-[11px] hidden lg:table-cell">Date</TableHead>
                  <TableHead className="pr-6 text-[11px] w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((commission, i) => {
                  const typeBadge = getTypeBadge(commission.type)
                  const statusBadge = getStatusBadge(commission.status)
                  return (
                    <motion.tr
                      key={commission.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, type: 'spring', stiffness: 200 }}
                      className="border-border/30 hover:bg-foreground/[0.02] transition-colors"
                    >
                      <TableCell className="pl-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-white text-[10px] font-bold shrink-0">
                            {commission.staffName.charAt(0)}
                          </div>
                          <p className="text-sm font-medium">{commission.staffName}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge className={cn('text-[10px] rounded-lg border', typeBadge.className)}>
                          {typeBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="text-sm font-semibold">{formatCurrency(commission.amount)}</p>
                      </TableCell>
                      <TableCell className="py-3 hidden md:table-cell">
                        <p className="text-sm text-muted-foreground font-mono">{commission.period}</p>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge className={cn('text-[10px] rounded-lg border', statusBadge.className)}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 hidden lg:table-cell">
                        <p className="text-sm text-muted-foreground">{formatDate(commission.date)}</p>
                      </TableCell>
                      <TableCell className="pr-6 py-3">
                        {commission.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-500/10"
                            onClick={() => handleMarkAsPaid(commission.id)}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Mark Paid
                          </Button>
                        )}
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>

      {/* Add Commission Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetAddForm() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-tahoe-accent" />
              Add Commission
            </DialogTitle>
            <DialogDescription>Create a new commission entry for staff</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Staff *</Label>
              <Select value={addForm.staffId} onValueChange={(v) => setAddForm(prev => ({ ...prev, staffId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select value={addForm.type} onValueChange={(v) => setAddForm(prev => ({ ...prev, type: v as CommissionType }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="bonus">Bonus</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={addForm.amount}
                  onChange={(e) => setAddForm(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Period *</Label>
              <Input
                type="month"
                value={addForm.period}
                onChange={(e) => setAddForm(prev => ({ ...prev, period: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetAddForm() }}>
              Cancel
            </Button>
            <Button
              className="bg-tahoe-accent hover:bg-tahoe-accent/90"
              onClick={handleAddCommission}
              disabled={submitting || !addForm.staffId || !addForm.amount || !addForm.period}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Commission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
