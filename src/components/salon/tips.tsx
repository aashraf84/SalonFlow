'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign, Plus, Search, CheckCircle2, Clock,
  Loader2, CreditCard, Wallet, Banknote, Trash2,
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

interface StaffInfo {
  id: string
  firstName: string
  lastName: string
  role: string
}

interface CustomerInfo {
  id: string
  firstName: string
  lastName: string
}

interface TipData {
  id: string
  invoiceId: string | null
  staffId: string
  customerId: string | null
  amount: number
  paymentMethod: string
  status: string
  createdAt: string
  staff: StaffInfo
  customer?: CustomerInfo | null
}

interface CustomerOption {
  id: string
  firstName: string
  lastName: string
  phone: string
}

interface InvoiceOption {
  id: string
  invoiceNumber: string
  totalAmount: number
}

interface TipStats {
  totalAmount: number
  totalCount: number
  pendingAmount: number
  paidAmount: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20">Pending</Badge>
    case 'paid':
      return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">Paid</Badge>
    default:
      return <Badge variant="outline" className="capitalize">{status}</Badge>
  }
}

function getPaymentMethodIcon(method: string) {
  switch (method) {
    case 'cash': return <Banknote className="size-3.5 text-emerald-500" />
    case 'card': return <CreditCard className="size-3.5 text-sky-500" />
    case 'wallet': return <Wallet className="size-3.5 text-violet-500" />
    default: return <DollarSign className="size-3.5" />
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function TipsModule() {
  const [tips, setTips] = useState<TipData[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<TipStats>({ totalAmount: 0, totalCount: 0, pendingAmount: 0, paidAmount: 0 })

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [staffFilter, setStaffFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formStaffId, setFormStaffId] = useState('')
  const [formCustomerId, setFormCustomerId] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formPaymentMethod, setFormPaymentMethod] = useState('cash')
  const [formInvoiceId, setFormInvoiceId] = useState('')

  // Dropdown data for dialog
  const [customerList, setCustomerList] = useState<CustomerOption[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [invoiceList, setInvoiceList] = useState<InvoiceOption[]>([])
  const [invoiceSearch, setInvoiceSearch] = useState('')

  const fetchTips = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('take', '200')
      if (staffFilter !== 'all') params.set('staffId', staffFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const res = await fetch(`/api/tips?${params}`)
      const json = await res.json()
      if (json.success) {
        setTips(json.data)
        setStats(json.stats)
      }
    } catch {
      toast.error('Failed to load tips')
    } finally {
      setLoading(false)
    }
  }, [staffFilter, statusFilter, startDate, endDate])

  useEffect(() => {
    fetchTips()
  }, [fetchTips])

  // Unique staff list
  const staffList = useMemo(() => {
    const map = new Map<string, StaffInfo>()
    tips.forEach((t) => {
      if (!map.has(t.staffId)) map.set(t.staffId, t.staff)
    })
    return Array.from(map.values())
  }, [tips])

  // Staff breakdown for summary
  const staffBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; amount: number; count: number }>()
    tips.forEach((t) => {
      const key = t.staffId
      const name = `${t.staff.firstName} ${t.staff.lastName}`
      const existing = map.get(key) || { name, amount: 0, count: 0 }
      existing.amount += t.amount
      existing.count += 1
      map.set(key, existing)
    })
    return Array.from(map.entries()).map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.amount - a.amount)
  }, [tips])

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, { method: string; amount: number; count: number }>()
    tips.forEach((t) => {
      const existing = map.get(t.paymentMethod) || { method: t.paymentMethod, amount: 0, count: 0 }
      existing.amount += t.amount
      existing.count += 1
      map.set(t.paymentMethod, existing)
    })
    return Array.from(map.values())
  }, [tips])

  // Client-side search filter
  const filteredTips = useMemo(() => {
    if (!searchQuery.trim()) return tips
    const q = searchQuery.toLowerCase()
    return tips.filter((t) => {
      const staffName = `${t.staff.firstName} ${t.staff.lastName}`.toLowerCase()
      const amountStr = t.amount.toString()
      return staffName.includes(q) || amountStr.includes(q)
    })
  }, [tips, searchQuery])

  // Fetch customers & invoices when dialog opens
  useEffect(() => {
    if (!dialogOpen) return
    const fetchDropdownData = async () => {
      try {
        const [custRes, invRes] = await Promise.all([
          fetch('/api/customers?take=50'),
          fetch('/api/invoices?take=50'),
        ])
        const custJson = await custRes.json()
        const invJson = await invRes.json()
        if (custJson.success) {
          setCustomerList(
            custJson.data.map((c: { id: string; firstName: string; lastName: string; phone: string }) => ({
              id: c.id,
              firstName: c.firstName,
              lastName: c.lastName,
              phone: c.phone,
            }))
          )
        }
        if (invJson.success) {
          setInvoiceList(
            invJson.data.map((i: { id: string; invoiceNumber: string; totalAmount: number }) => ({
              id: i.id,
              invoiceNumber: i.invoiceNumber,
              totalAmount: i.totalAmount,
            }))
          )
        }
      } catch {
        // Silently fail - dropdowns will just be empty
      }
    }
    fetchDropdownData()
  }, [dialogOpen])

  // Filtered dropdown lists
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customerList
    const q = customerSearch.toLowerCase()
    return customerList.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    )
  }, [customerList, customerSearch])

  const filteredInvoices = useMemo(() => {
    if (!invoiceSearch.trim()) return invoiceList
    const q = invoiceSearch.toLowerCase()
    return invoiceList.filter((i) => i.invoiceNumber.toLowerCase().includes(q))
  }, [invoiceList, invoiceSearch])

  const handleAddTip = async () => {
    if (!formStaffId || !formAmount || parseFloat(formAmount) <= 0) {
      toast.error('Please select staff and enter a valid amount')
      return
    }

    try {
      setSaving(true)
      const res = await fetch('/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: formStaffId,
          amount: parseFloat(formAmount),
          paymentMethod: formPaymentMethod,
          customerId: formCustomerId && formCustomerId !== 'none' ? formCustomerId : null,
          invoiceId: formInvoiceId && formInvoiceId !== 'none' ? formInvoiceId : null,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Tip added successfully')
        setDialogOpen(false)
        resetForm()
        fetchTips()
      } else {
        toast.error(json.error || 'Failed to add tip')
      }
    } catch {
      toast.error('Failed to add tip')
    } finally {
      setSaving(false)
    }
  }

  const markAsPaid = async (id: string) => {
    try {
      const res = await fetch(`/api/tips/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Tip marked as paid')
        fetchTips()
      } else {
        toast.error(json.error || 'Failed to update tip')
      }
    } catch {
      toast.error('Failed to update tip')
    }
  }

  const markBatchAsPaid = async () => {
    const pendingTips = tips.filter((t) => t.status === 'pending')
    if (pendingTips.length === 0) {
      toast.error('No pending tips to mark as paid')
      return
    }

    try {
      await Promise.all(
        pendingTips.map((t) =>
          fetch(`/api/tips/${t.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'paid' }),
          })
        )
      )
      toast.success(`${pendingTips.length} tips marked as paid`)
      fetchTips()
    } catch {
      toast.error('Failed to batch update tips')
    }
  }

  const deleteTip = async (id: string) => {
    try {
      const res = await fetch(`/api/tips/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('Tip deleted')
        fetchTips()
      } else {
        toast.error(json.error || 'Failed to delete tip')
      }
    } catch {
      toast.error('Failed to delete tip')
    }
  }

  const resetForm = () => {
    setFormStaffId('')
    setFormCustomerId('')
    setFormAmount('')
    setFormPaymentMethod('cash')
    setFormInvoiceId('')
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Tips</h2>
          <p className="text-sm text-muted-foreground">Manage staff tips and payouts</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={markBatchAsPaid} variant="outline" className="gap-2">
            <CheckCircle2 className="size-4" /> Pay All Pending
          </Button>
          <Button onClick={() => { resetForm(); setDialogOpen(true) }} className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg shadow-rose-500/20">
            <Plus className="size-4 mr-2" /> Add Tip
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StaggerItem>
          <AnimatedMetricCard
            title="Total Tips"
            value={formatCurrency(stats.totalAmount)}
            subtitle={`${stats.totalCount} tips`}
            icon={DollarSign}
            iconBg="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Pending"
            value={formatCurrency(stats.pendingAmount)}
            icon={Clock}
            iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            accentGradient="from-amber-500/20 to-yellow-500/20"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Paid Out"
            value={formatCurrency(stats.paidAmount)}
            icon={CheckCircle2}
            iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            accentGradient="from-emerald-500/20 to-green-500/20"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Avg Tip"
            value={stats.totalCount > 0 ? formatCurrency(stats.totalAmount / stats.totalCount) : '$0.00'}
            icon={Wallet}
            iconBg="bg-sky-500/10 text-sky-600 dark:text-sky-400"
            accentGradient="from-sky-500/20 to-cyan-500/20"
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Staff Breakdown */}
        <GlassCard variant="default" className="p-5">
          <h3 className="text-sm font-semibold mb-3">Tips by Staff</h3>
          {staffBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No tip data</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {staffBreakdown.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 text-xs font-bold">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.count} tips</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(s.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Payment Method Breakdown */}
        <GlassCard variant="default" className="p-5">
          <h3 className="text-sm font-semibold mb-3">Tips by Payment Method</h3>
          {paymentBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No tip data</p>
          ) : (
            <div className="space-y-2">
              {paymentBreakdown.map((p) => (
                <div key={p.method} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    {getPaymentMethodIcon(p.method)}
                    <div>
                      <p className="text-sm font-medium capitalize">{p.method}</p>
                      <p className="text-[10px] text-muted-foreground">{p.count} tips</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Filters */}
      <GlassCard variant="flat" className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search tips..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {staffList.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full sm:w-[140px]" />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full sm:w-[140px]" />
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard variant="default" className="overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow className="border-b border-border/50">
                <TableHead className="text-xs font-semibold">Staff</TableHead>
                <TableHead className="text-xs font-semibold">Customer</TableHead>
                <TableHead className="text-xs font-semibold">Amount</TableHead>
                <TableHead className="text-xs font-semibold">Payment</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Date</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredTips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <DollarSign className="size-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No tips found</p>
                    <p className="text-xs mt-1">Add a tip to get started</p>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {filteredTips.map((tip) => (
                    <motion.tr
                      key={tip.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="border-b border-border/30 hover:bg-foreground/[0.02] transition-colors"
                    >
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 text-xs font-bold shrink-0">
                            {tip.staff.firstName.charAt(0)}
                          </div>
                          <span>{tip.staff.firstName} {tip.staff.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tip.customer ? `${tip.customer.firstName} ${tip.customer.lastName}` : '—'}
                      </TableCell>
                      <TableCell className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(tip.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {getPaymentMethodIcon(tip.paymentMethod)}
                          <span className="text-sm capitalize">{tip.paymentMethod}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(tip.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(tip.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {tip.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                              onClick={() => markAsPaid(tip.id)}
                            >
                              <CheckCircle2 className="size-3.5" /> Pay
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-500"
                            onClick={() => deleteTip(tip.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      {/* Add Tip Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tip</DialogTitle>
            <DialogDescription>Record a new tip for a staff member</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Staff *</Label>
              <Select value={formStaffId} onValueChange={setFormStaffId}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-9"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={formPaymentMethod} onValueChange={setFormPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="wallet">Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Customer (optional)</Label>
              <Input
                placeholder="Search customers..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="mb-1"
              />
              <Select value={formCustomerId} onValueChange={setFormCustomerId}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {filteredCustomers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.phone})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Invoice (optional)</Label>
              <Input
                placeholder="Search invoices..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="mb-1"
              />
              <Select value={formInvoiceId} onValueChange={setFormInvoiceId}>
                <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {filteredInvoices.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.invoiceNumber} — {formatCurrency(i.totalAmount)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTip} disabled={saving} className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white">
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Add Tip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
