'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Ticket, Plus, Search, Edit2, Trash2, Loader2, Filter,
  Calendar, Percent, DollarSign, Gift, ToggleLeft, ToggleRight,
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CouponData {
  id: string
  code: string
  name: string
  description: string | null
  discountType: string
  discountValue: number
  minPurchase: number
  maxDiscount: number | null
  usageLimit: number | null
  usedCount: number
  perCustomerLimit: number
  applicableServices: string | null
  applicableCategories: string | null
  startDate: string
  endDate: string
  status: string
  createdAt: string
  updatedAt: string
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
    case 'active':
      return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">Active</Badge>
    case 'expired':
      return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20">Expired</Badge>
    case 'disabled':
      return <Badge className="bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20 hover:bg-gray-500/20">Disabled</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getDiscountTypeIcon(type: string) {
  switch (type) {
    case 'percentage': return <Percent className="size-3.5" />
    case 'fixed_amount': return <DollarSign className="size-3.5" />
    case 'free_service': return <Gift className="size-3.5" />
    default: return <DollarSign className="size-3.5" />
  }
}

function formatDiscountValue(coupon: CouponData) {
  switch (coupon.discountType) {
    case 'percentage': return `${coupon.discountValue}%`
    case 'fixed_amount': return formatCurrency(coupon.discountValue)
    case 'free_service': return 'Free Service'
    default: return `${coupon.discountValue}`
  }
}

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'COUPON-'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CouponsModule() {
  const [coupons, setCoupons] = useState<CouponData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [discountTypeFilter, setDiscountTypeFilter] = useState<string>('all')
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, disabled: 0 })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<CouponData | null>(null)
  const [deletingCoupon, setDeletingCoupon] = useState<CouponData | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formDiscountType, setFormDiscountType] = useState('percentage')
  const [formDiscountValue, setFormDiscountValue] = useState('')
  const [formMinPurchase, setFormMinPurchase] = useState('0')
  const [formMaxDiscount, setFormMaxDiscount] = useState('')
  const [formUsageLimit, setFormUsageLimit] = useState('')
  const [formPerCustomerLimit, setFormPerCustomerLimit] = useState('1')
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formStatus, setFormStatus] = useState('active')

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (discountTypeFilter !== 'all') params.set('discountType', discountTypeFilter)
      params.set('take', '100')

      const res = await fetch(`/api/coupons?${params}`)
      const json = await res.json()
      if (json.success) {
        setCoupons(json.data)
        setStats(json.stats)
      }
    } catch {
      toast.error('Failed to load coupons')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, discountTypeFilter])

  useEffect(() => {
    fetchCoupons()
  }, [fetchCoupons])

  const resetForm = () => {
    setFormCode('')
    setFormName('')
    setFormDescription('')
    setFormDiscountType('percentage')
    setFormDiscountValue('')
    setFormMinPurchase('0')
    setFormMaxDiscount('')
    setFormUsageLimit('')
    setFormPerCustomerLimit('1')
    setFormStartDate('')
    setFormEndDate('')
    setFormStatus('active')
    setEditingCoupon(null)
  }

  const openAddDialog = () => {
    resetForm()
    setFormCode(generateCode())
    // Default start date to today, end date to 30 days from now
    const now = new Date()
    const later = new Date()
    later.setDate(later.getDate() + 30)
    setFormStartDate(now.toISOString().split('T')[0])
    setFormEndDate(later.toISOString().split('T')[0])
    setDialogOpen(true)
  }

  const openEditDialog = (coupon: CouponData) => {
    setEditingCoupon(coupon)
    setFormCode(coupon.code)
    setFormName(coupon.name)
    setFormDescription(coupon.description || '')
    setFormDiscountType(coupon.discountType)
    setFormDiscountValue(coupon.discountValue.toString())
    setFormMinPurchase(coupon.minPurchase.toString())
    setFormMaxDiscount(coupon.maxDiscount?.toString() || '')
    setFormUsageLimit(coupon.usageLimit?.toString() || '')
    setFormPerCustomerLimit(coupon.perCustomerLimit.toString())
    setFormStartDate(new Date(coupon.startDate).toISOString().split('T')[0])
    setFormEndDate(new Date(coupon.endDate).toISOString().split('T')[0])
    setFormStatus(coupon.status)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formName || !formDiscountValue || !formStartDate || !formEndDate) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)
      const payload = {
        code: formCode,
        name: formName,
        description: formDescription || null,
        discountType: formDiscountType,
        discountValue: formDiscountValue,
        minPurchase: formMinPurchase || '0',
        maxDiscount: formMaxDiscount || null,
        usageLimit: formUsageLimit || null,
        perCustomerLimit: formPerCustomerLimit || '1',
        startDate: formStartDate,
        endDate: formEndDate,
        status: formStatus,
      }

      let res: Response
      if (editingCoupon) {
        res = await fetch(`/api/coupons/${editingCoupon.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      const json = await res.json()
      if (json.success) {
        toast.success(editingCoupon ? 'Coupon updated' : 'Coupon created')
        setDialogOpen(false)
        resetForm()
        fetchCoupons()
      } else {
        toast.error(json.error || 'Failed to save coupon')
      }
    } catch {
      toast.error('Failed to save coupon')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingCoupon) return
    try {
      const res = await fetch(`/api/coupons/${deletingCoupon.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('Coupon deleted')
        setDeleteDialogOpen(false)
        setDeletingCoupon(null)
        fetchCoupons()
      } else {
        toast.error(json.error || 'Failed to delete coupon')
      }
    } catch {
      toast.error('Failed to delete coupon')
    }
  }

  const toggleStatus = async (coupon: CouponData) => {
    const newStatus = coupon.status === 'active' ? 'disabled' : 'active'
    try {
      const res = await fetch(`/api/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Coupon ${newStatus === 'active' ? 'enabled' : 'disabled'}`)
        fetchCoupons()
      } else {
        toast.error(json.error || 'Failed to update status')
      }
    } catch {
      toast.error('Failed to update status')
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Coupons & Promotions</h2>
          <p className="text-sm text-muted-foreground">Manage discount codes and promotional offers</p>
        </div>
        <Button onClick={openAddDialog} className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg shadow-rose-500/20">
          <Plus className="size-4 mr-2" /> Add Coupon
        </Button>
      </div>

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StaggerItem>
          <AnimatedMetricCard
            title="Total Coupons"
            value={stats.total.toString()}
            icon={Ticket}
            iconBg="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Active"
            value={stats.active.toString()}
            icon={ToggleRight}
            iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            accentGradient="from-emerald-500/20 to-green-500/20"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Expired"
            value={stats.expired.toString()}
            icon={Calendar}
            iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            accentGradient="from-amber-500/20 to-yellow-500/20"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Disabled"
            value={stats.disabled.toString()}
            icon={ToggleLeft}
            iconBg="bg-gray-500/10 text-gray-600 dark:text-gray-400"
            accentGradient="from-gray-500/20 to-slate-500/20"
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Filters */}
      <GlassCard variant="flat" className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search coupons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={discountTypeFilter} onValueChange={setDiscountTypeFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Discount Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
              <SelectItem value="free_service">Free Service</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard variant="default" className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50">
                <TableHead className="text-xs font-semibold">Code</TableHead>
                <TableHead className="text-xs font-semibold">Name</TableHead>
                <TableHead className="text-xs font-semibold">Discount</TableHead>
                <TableHead className="text-xs font-semibold">Usage</TableHead>
                <TableHead className="text-xs font-semibold">Valid Period</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
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
              ) : coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Ticket className="size-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No coupons found</p>
                    <p className="text-xs mt-1">Create your first coupon to get started</p>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {coupons.map((coupon) => (
                    <motion.tr
                      key={coupon.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="border-b border-border/30 hover:bg-foreground/[0.02] transition-colors"
                    >
                      <TableCell>
                        <code className="text-xs font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-1 rounded">
                          {coupon.code}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{coupon.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {getDiscountTypeIcon(coupon.discountType)}
                          <span className="text-sm font-medium">{formatDiscountValue(coupon)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">{coupon.usedCount}</span>
                          {coupon.usageLimit && <span className="text-muted-foreground">/{coupon.usageLimit}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(coupon.startDate)} — {formatDate(coupon.endDate)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(coupon.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg"
                            onClick={() => toggleStatus(coupon)}
                            title={coupon.status === 'active' ? 'Disable' : 'Enable'}
                          >
                            {coupon.status === 'active' ? (
                              <ToggleRight className="size-4 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="size-4 text-gray-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg"
                            onClick={() => openEditDialog(coupon)}
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg hover:bg-red-500/10 hover:text-red-500"
                            onClick={() => { setDeletingCoupon(coupon); setDeleteDialogOpen(true) }}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
            <DialogDescription>
              {editingCoupon ? 'Update coupon details' : 'Create a new promotional coupon'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <div className="flex gap-2">
                <Input value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="COUPON-XXXXXX" className="font-mono" />
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => setFormCode(generateCode())}>
                  Generate
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Summer Sale 20%" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional description..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Discount Type *</Label>
              <Select value={formDiscountType} onValueChange={setFormDiscountType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
                  <SelectItem value="free_service">Free Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Discount Value *</Label>
              <Input
                type="number"
                value={formDiscountValue}
                onChange={(e) => setFormDiscountValue(e.target.value)}
                placeholder={formDiscountType === 'percentage' ? '20' : '15.00'}
                min="0"
                step={formDiscountType === 'percentage' ? '1' : '0.01'}
              />
            </div>
            <div className="space-y-2">
              <Label>Min Purchase ($)</Label>
              <Input type="number" value={formMinPurchase} onChange={(e) => setFormMinPurchase(e.target.value)} placeholder="0" min="0" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label>Max Discount ($)</Label>
              <Input type="number" value={formMaxDiscount} onChange={(e) => setFormMaxDiscount(e.target.value)} placeholder="No limit" min="0" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label>Usage Limit</Label>
              <Input type="number" value={formUsageLimit} onChange={(e) => setFormUsageLimit(e.target.value)} placeholder="Unlimited" min="1" />
            </div>
            <div className="space-y-2">
              <Label>Per Customer Limit</Label>
              <Input type="number" value={formPerCustomerLimit} onChange={(e) => setFormPerCustomerLimit(e.target.value)} placeholder="1" min="1" />
            </div>
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date *</Label>
              <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false) }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white">
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editingCoupon ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Coupon</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingCoupon?.name}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
