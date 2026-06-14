'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gift, Plus, Search, CreditCard, DollarSign, CheckCircle2,
  XCircle, AlertTriangle, Eye, Loader2, Filter, Calendar,
  User, Mail, Phone, MessageSquare, Clock,
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
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface GiftCardData {
  id: string
  code: string
  initialBalance: number
  remainingBalance: number
  recipientName: string
  recipientEmail: string
  recipientPhone: string
  message: string | null
  status: 'active' | 'redeemed' | 'expired' | 'cancelled'
  purchaseDate: string
  expiryDate: string | null
  transactions: GiftCardTransaction[]
}

interface GiftCardTransaction {
  id: string
  type: 'purchase' | 'redemption' | 'refund'
  amount: number
  date: string
  description: string
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

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'active':
      return { label: 'Active', className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' }
    case 'redeemed':
      return { label: 'Redeemed', className: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/30 dark:text-gray-300 dark:border-gray-700' }
    case 'expired':
      return { label: 'Expired', className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' }
    case 'cancelled':
      return { label: 'Cancelled', className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' }
    default:
      return { label: status, className: 'bg-gray-100 text-gray-800 border-gray-200' }
  }
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function GiftCardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <GlassCard key={i} variant="default" className="p-5" animateOnMount={false}>
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20 rounded-lg" />
                <Skeleton className="h-7 w-28 rounded-lg" />
                <Skeleton className="h-3 w-16 rounded-lg" />
              </div>
              <Skeleton className="h-11 w-11 rounded-xl" />
            </div>
          </GlassCard>
        ))}
      </div>
      <GlassCard variant="default" className="p-0 overflow-hidden" animateOnMount={false}>
        <div className="p-6"><Skeleton className="h-5 w-40 rounded-lg" /></div>
        <div className="space-y-3 px-6 pb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-6">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function GiftCardModule() {
  const [giftCards, setGiftCards] = useState<GiftCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Dialogs
  const [showIssueDialog, setShowIssueDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showRedeemDialog, setShowRedeemDialog] = useState(false)
  const [selectedCard, setSelectedCard] = useState<GiftCardData | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Issue form
  const [issueForm, setIssueForm] = useState({
    initialBalance: '',
    recipientName: '',
    recipientEmail: '',
    recipientPhone: '',
    message: '',
    expiryDate: '',
  })

  // Redeem form
  const [redeemAmount, setRedeemAmount] = useState('')

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchGiftCards = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)
      const res = await fetch(`/api/gift-cards?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setGiftCards(data.data)
      } else {
        setError(data.error || 'Failed to fetch gift cards')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchQuery])

  useEffect(() => {
    fetchGiftCards()
  }, [fetchGiftCards])

  // ─── Computed ───────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const active = giftCards.filter(gc => gc.status === 'active')
    const redeemedThisMonth = giftCards.filter(gc => {
      if (gc.status !== 'redeemed') return false
      const tx = gc.transactions.find(t => t.type === 'redemption')
      if (!tx) return false
      const d = new Date(tx.date)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const totalOutstanding = active.reduce((sum, gc) => sum + gc.remainingBalance, 0)
    const avgValue = active.length > 0 ? totalOutstanding / active.length : 0
    return {
      totalActive: active.length,
      totalOutstanding,
      redeemedThisMonth: redeemedThisMonth.length,
      avgValue,
    }
  }, [giftCards])

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleIssueGiftCard = async () => {
    if (!issueForm.initialBalance || !issueForm.recipientName) {
      toast.error('Please fill in required fields')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialBalance: parseFloat(issueForm.initialBalance),
          recipientName: issueForm.recipientName,
          recipientEmail: issueForm.recipientEmail || undefined,
          recipientPhone: issueForm.recipientPhone || undefined,
          message: issueForm.message || undefined,
          expiryDate: issueForm.expiryDate || undefined,
          status: 'active',
          remainingBalance: parseFloat(issueForm.initialBalance),
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Gift card issued successfully')
        setShowIssueDialog(false)
        resetIssueForm()
        fetchGiftCards()
      } else {
        toast.error(data.error || 'Failed to issue gift card')
      }
    } catch {
      toast.error('Failed to issue gift card')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRedeem = async () => {
    if (!selectedCard || !redeemAmount) return
    const amount = parseFloat(redeemAmount)
    if (amount <= 0 || amount > selectedCard.remainingBalance) {
      toast.error('Invalid redemption amount')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/gift-cards/${selectedCard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'redeem',
          amount,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Redeemed ${formatCurrency(amount)} from gift card`)
        setShowRedeemDialog(false)
        setRedeemAmount('')
        fetchGiftCards()
      } else {
        toast.error(data.error || 'Failed to redeem')
      }
    } catch {
      toast.error('Failed to redeem gift card')
    } finally {
      setSubmitting(false)
    }
  }

  const resetIssueForm = () => {
    setIssueForm({
      initialBalance: '',
      recipientName: '',
      recipientEmail: '',
      recipientPhone: '',
      message: '',
      expiryDate: '',
    })
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading && giftCards.length === 0) return <GiftCardSkeleton />

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
        <p className="text-sm font-medium text-destructive">Failed to load gift cards</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchGiftCards}>
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
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-500/10">
            <Gift className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Gift Cards</h2>
            <p className="text-sm text-muted-foreground">Issue, track, and redeem gift cards</p>
          </div>
        </motion.div>
        <Button
          className="gap-2 bg-tahoe-accent hover:bg-tahoe-accent/90"
          onClick={() => setShowIssueDialog(true)}
        >
          <Plus className="h-4 w-4" />
          Issue Gift Card
        </Button>
      </div>

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" staggerDelay={0.06}>
        <StaggerItem>
          <AnimatedMetricCard
            title="Total Active"
            value={stats.totalActive.toString()}
            subtitle="Active gift cards"
            icon={CreditCard}
            accentGradient="from-rose-500/30 to-pink-500/30"
            iconBg="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Total Outstanding"
            value={formatCurrency(stats.totalOutstanding)}
            subtitle="Balance remaining"
            icon={DollarSign}
            accentGradient="from-emerald-500/30 to-green-500/30"
            iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Redeemed This Month"
            value={stats.redeemedThisMonth.toString()}
            subtitle="Cards fully redeemed"
            icon={CheckCircle2}
            accentGradient="from-pink-500/30 to-rose-500/30"
            iconBg="bg-pink-500/10 text-pink-600 dark:text-pink-400"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Average Card Value"
            value={formatCurrency(Math.round(stats.avgValue))}
            subtitle="Per active card"
            icon={Gift}
            accentGradient="from-orange-500/30 to-amber-500/30"
            iconBg="bg-orange-500/10 text-orange-600 dark:text-orange-400"
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
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code or recipient..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="redeemed">Redeemed</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Gift Cards Table */}
      <GlassCard variant="default" glow delay={0.35} className="p-0 overflow-hidden">
        {giftCards.length === 0 ? (
          <div className="text-center py-16">
            <Gift className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-medium mb-1">No gift cards found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Issue your first gift card to get started'}
            </p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="pl-6 text-[11px]">Code</TableHead>
                  <TableHead className="text-[11px]">Recipient</TableHead>
                  <TableHead className="text-[11px]">Balance</TableHead>
                  <TableHead className="text-[11px]">Status</TableHead>
                  <TableHead className="text-[11px] hidden md:table-cell">Purchase Date</TableHead>
                  <TableHead className="text-[11px] hidden lg:table-cell">Expiry</TableHead>
                  <TableHead className="pr-6 text-[11px] w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {giftCards.map((gc, i) => {
                  const statusBadge = getStatusBadge(gc.status)
                  return (
                    <motion.tr
                      key={gc.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, type: 'spring', stiffness: 200 }}
                      className="border-border/30 hover:bg-foreground/[0.02] transition-colors cursor-pointer"
                      onClick={() => { setSelectedCard(gc); setShowDetailDialog(true) }}
                    >
                      <TableCell className="pl-6 py-3">
                        <p className="font-mono text-sm font-semibold text-tahoe-accent">{gc.code}</p>
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="text-sm font-medium">{gc.recipientName}</p>
                        <p className="text-[11px] text-muted-foreground">{gc.recipientEmail || gc.recipientPhone}</p>
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="text-sm font-semibold">{formatCurrency(gc.remainingBalance)}</p>
                        <p className="text-[11px] text-muted-foreground">of {formatCurrency(gc.initialBalance)}</p>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge className={cn('text-[10px] rounded-lg border', statusBadge.className)}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 hidden md:table-cell">
                        <p className="text-sm text-muted-foreground">{formatDate(gc.purchaseDate)}</p>
                      </TableCell>
                      <TableCell className="py-3 hidden lg:table-cell">
                        <p className="text-sm text-muted-foreground">
                          {gc.expiryDate ? formatDate(gc.expiryDate) : 'No expiry'}
                        </p>
                      </TableCell>
                      <TableCell className="pr-6 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-lg hover:bg-rose-500/10"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedCard(gc)
                              setShowDetailDialog(true)
                            }}
                          >
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          {gc.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 rounded-lg hover:bg-emerald-500/10"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedCard(gc)
                                setRedeemAmount('')
                                setShowRedeemDialog(true)
                              }}
                            >
                              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>

      {/* Issue Gift Card Dialog */}
      <Dialog open={showIssueDialog} onOpenChange={(open) => { setShowIssueDialog(open); if (!open) resetIssueForm() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-tahoe-accent" />
              Issue Gift Card
            </DialogTitle>
            <DialogDescription>Create a new gift card for a recipient</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Initial Balance *
              </Label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={issueForm.initialBalance}
                onChange={(e) => setIssueForm(prev => ({ ...prev, initialBalance: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Recipient Name *
                </Label>
                <Input
                  placeholder="Full name"
                  value={issueForm.recipientName}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, recipientName: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email
                </Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={issueForm.recipientEmail}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, recipientEmail: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Phone
                </Label>
                <Input
                  placeholder="+92 300 1234567"
                  value={issueForm.recipientPhone}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, recipientPhone: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Expiry Date
                </Label>
                <Input
                  type="date"
                  value={issueForm.expiryDate}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Message
              </Label>
              <Textarea
                placeholder="Optional gift message..."
                value={issueForm.message}
                onChange={(e) => setIssueForm(prev => ({ ...prev, message: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowIssueDialog(false); resetIssueForm() }}>
              Cancel
            </Button>
            <Button
              className="bg-tahoe-accent hover:bg-tahoe-accent/90"
              onClick={handleIssueGiftCard}
              disabled={submitting || !issueForm.initialBalance || !issueForm.recipientName}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Issue Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-tahoe-accent" />
              Gift Card Details
            </DialogTitle>
            <DialogDescription>
              {selectedCard?.code}
            </DialogDescription>
          </DialogHeader>
          {selectedCard && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recipient</p>
                  <p className="text-sm font-medium mt-0.5">{selectedCard.recipientName}</p>
                  {selectedCard.recipientEmail && (
                    <p className="text-xs text-muted-foreground">{selectedCard.recipientEmail}</p>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
                  <Badge className={cn('text-[10px] rounded-lg border mt-1', getStatusBadge(selectedCard.status).className)}>
                    {getStatusBadge(selectedCard.status).label}
                  </Badge>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Initial Balance</p>
                  <p className="text-sm font-semibold mt-0.5">{formatCurrency(selectedCard.initialBalance)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Remaining Balance</p>
                  <p className="text-sm font-semibold mt-0.5 text-tahoe-accent">
                    {formatCurrency(selectedCard.remainingBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Purchase Date</p>
                  <p className="text-sm mt-0.5">{formatDate(selectedCard.purchaseDate)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Expiry Date</p>
                  <p className="text-sm mt-0.5">{selectedCard.expiryDate ? formatDate(selectedCard.expiryDate) : 'No expiry'}</p>
                </div>
              </div>

              {selectedCard.message && (
                <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Message</p>
                  <p className="text-sm italic">{selectedCard.message}</p>
                </div>
              )}

              {/* Transaction History */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Transaction History</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedCard.transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
                  ) : (
                    selectedCard.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-border/30 bg-foreground/[0.01]"
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'flex items-center justify-center w-7 h-7 rounded-lg',
                            tx.type === 'purchase' ? 'bg-rose-500/10' :
                            tx.type === 'redemption' ? 'bg-amber-500/10' : 'bg-gray-500/10'
                          )}>
                            {tx.type === 'purchase' ? <CreditCard className="w-3.5 h-3.5 text-rose-500" /> :
                             tx.type === 'redemption' ? <DollarSign className="w-3.5 h-3.5 text-amber-500" /> :
                             <XCircle className="w-3.5 h-3.5 text-gray-500" />}
                          </div>
                          <div>
                            <p className="text-xs font-medium">{tx.description}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDate(tx.date)}</p>
                          </div>
                        </div>
                        <span className={cn(
                          'text-sm font-semibold',
                          tx.type === 'redemption' ? 'text-red-500' : 'text-emerald-500'
                        )}>
                          {tx.type === 'redemption' ? '-' : '+'}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selectedCard.status === 'active' && (
                <Button
                  className="w-full bg-tahoe-accent hover:bg-tahoe-accent/90 gap-2"
                  onClick={() => {
                    setShowDetailDialog(false)
                    setRedeemAmount('')
                    setShowRedeemDialog(true)
                  }}
                >
                  <DollarSign className="h-4 w-4" />
                  Redeem from this Card
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Redeem Dialog */}
      <Dialog open={showRedeemDialog} onOpenChange={setShowRedeemDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-tahoe-accent" />
              Redeem Gift Card
            </DialogTitle>
            <DialogDescription>
              Card: {selectedCard?.code} — Balance: {selectedCard ? formatCurrency(selectedCard.remainingBalance) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Amount to Redeem *</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(e.target.value)}
                max={selectedCard?.remainingBalance}
              />
              {selectedCard && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-7"
                    onClick={() => setRedeemAmount(selectedCard.remainingBalance.toString())}
                  >
                    Full Amount
                  </Button>
                  {[0.25, 0.5, 0.75].map((pct) => (
                    <Button
                      key={pct}
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-7"
                      onClick={() => setRedeemAmount(Math.round(selectedCard.remainingBalance * pct).toString())}
                    >
                      {pct * 100}%
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRedeemDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-tahoe-accent hover:bg-tahoe-accent/90"
              onClick={handleRedeem}
              disabled={submitting || !redeemAmount || (selectedCard ? parseFloat(redeemAmount) > selectedCard.remainingBalance : true)}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Redeem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
