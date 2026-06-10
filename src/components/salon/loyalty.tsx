'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Star,
  Gift,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Users,
  Award,
  Zap,
  Crown,
  Heart,
  Plus,
  Minus,
  Search,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const formatCurrency = (amount: number) => `PKR ${amount.toLocaleString()}`

// Types
interface LoyaltyStats {
  totalPoints: number
  earnedPoints: number
  redeemedPoints: number
  bonusPoints: number
}

interface TierBreakdown {
  tier: string
  customerCount: number
  totalPoints: number
  totalLifetimeValue: number
}

interface LoyaltyTransaction {
  id: string
  customerId: string
  type: string
  points: number
  description: string | null
  referenceId: string | null
  createdAt: string
  customer: {
    id: string
    firstName: string
    lastName: string
    phone: string
    email: string | null
    loyaltyTier: string
    loyaltyPoints: number
  }
}

// Transaction type badge styles
const typeBadgeStyles: Record<string, { bg: string; icon: React.ReactNode }> = {
  earn: { bg: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: <ArrowUpRight className="h-3 w-3" /> },
  redeem: { bg: 'bg-amber-100 text-amber-700 border-amber-300', icon: <ArrowDownRight className="h-3 w-3" /> },
  bonus: { bg: 'bg-blue-100 text-blue-700 border-blue-300', icon: <Zap className="h-3 w-3" /> },
  referral: { bg: 'bg-purple-100 text-purple-700 border-purple-300', icon: <Heart className="h-3 w-3" /> },
  birthday: { bg: 'bg-pink-100 text-pink-700 border-pink-300', icon: <Gift className="h-3 w-3" /> },
}

// Tier card styles
const tierCardStyles: Record<string, { gradient: string; icon: React.ReactNode; accent: string; text: string }> = {
  silver: {
    gradient: 'from-gray-50 to-gray-100',
    icon: <Award className="h-6 w-6 text-gray-500" />,
    accent: 'bg-gray-200 text-gray-700',
    text: 'text-gray-700',
  },
  gold: {
    gradient: 'from-amber-50 to-amber-100',
    icon: <Crown className="h-6 w-6 text-amber-500" />,
    accent: 'bg-amber-200 text-amber-700',
    text: 'text-amber-700',
  },
  platinum: {
    gradient: 'from-cyan-50 to-cyan-100',
    icon: <Star className="h-6 w-6 text-cyan-500" />,
    accent: 'bg-cyan-200 text-cyan-700',
    text: 'text-cyan-700',
  },
  vip: {
    gradient: 'from-purple-50 to-purple-100',
    icon: <Crown className="h-6 w-6 text-purple-500" />,
    accent: 'bg-purple-200 text-purple-700',
    text: 'text-purple-700',
  },
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function LoyaltyModule() {
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([])
  const [tierBreakdown, setTierBreakdown] = useState<TierBreakdown[]>([])
  const [stats, setStats] = useState<LoyaltyStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Award/Redeem dialog state
  const [awardDialogOpen, setAwardDialogOpen] = useState(false)
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<{id: string; firstName: string; lastName: string; phone: string; loyaltyPoints: number}[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [dialogPoints, setDialogPoints] = useState('')
  const [dialogDescription, setDialogDescription] = useState('')
  const [dialogSubmitting, setDialogSubmitting] = useState(false)
  const [searchingCustomers, setSearchingCustomers] = useState(false)

  const searchCustomers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setCustomerResults([])
      return
    }
    setSearchingCustomers(true)
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}&take=10`)
      const json = await res.json()
      if (json.success) {
        setCustomerResults(json.data.map((c: {id: string; firstName: string; lastName: string; phone: string; loyaltyPoints: number}) => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          phone: c.phone,
          loyaltyPoints: c.loyaltyPoints,
        })))
      }
    } catch {
      setCustomerResults([])
    } finally {
      setSearchingCustomers(false)
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => searchCustomers(customerSearch), 300)
    return () => clearTimeout(timeout)
  }, [customerSearch, searchCustomers])

  const resetDialog = () => {
    setCustomerSearch('')
    setCustomerResults([])
    setSelectedCustomerId('')
    setDialogPoints('')
    setDialogDescription('')
    setDialogSubmitting(false)
  }

  const handleLoyaltyAction = async (action: 'award' | 'redeem') => {
    if (!selectedCustomerId || !dialogPoints || parseInt(dialogPoints) <= 0) return
    setDialogSubmitting(true)
    try {
      const res = await fetch('/api/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          customerId: selectedCustomerId,
          points: parseInt(dialogPoints),
          description: dialogDescription || undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(action === 'award' ? 'Points awarded successfully' : 'Points redeemed successfully')
        if (action === 'award') setAwardDialogOpen(false)
        else setRedeemDialogOpen(false)
        resetDialog()
        fetchData()
      } else {
        toast.error(json.error || 'Failed to process request')
      }
    } catch {
      toast.error('An error occurred. Please try again.')
    } finally {
      setDialogSubmitting(false)
    }
  }

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/loyalty')
      const json = await res.json()
      if (json.success) {
        setTransactions(json.data.transactions || [])
        setTierBreakdown(json.data.tierBreakdown || [])
        setStats(json.data.stats || { totalPoints: 0, earnedPoints: 0, redeemedPoints: 0, bonusPoints: 0 })
      }
    } catch (err) {
      console.error('Failed to fetch loyalty data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate active referrals (referral type transactions)
  const activeReferrals = transactions.filter((t) => t.type === 'referral').length

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-50 text-yellow-600">
          <Star className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Loyalty & Rewards</h2>
          <p className="text-sm text-muted-foreground">Points, tiers, and customer rewards</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Points Outstanding</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.totalPoints || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total points in circulation
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Earned This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              +{(stats?.earnedPoints || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From visits and purchases
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Redeemed This Month</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              -{(stats?.redeemedPoints || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Used for rewards & discounts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Referrals</CardTitle>
            <Heart className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeReferrals}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Referral bonuses awarded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Breakdown */}
      <div>
        <h3 className="text-base font-semibold mb-3">Tier Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {['silver', 'gold', 'platinum', 'vip'].map((tier) => {
            const tierData = tierBreakdown.find((t) => t.tier === tier)
            const style = tierCardStyles[tier]
            const customerCount = tierData?.customerCount || 0
            const totalPoints = tierData?.totalPoints || 0
            const totalLTV = tierData?.totalLifetimeValue || 0
            const avgLTV = customerCount > 0 ? totalLTV / customerCount : 0

            return (
              <Card key={tier} className={`bg-gradient-to-br ${style.gradient} border-0 shadow-sm`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge className={`${style.accent} border-0 capitalize font-semibold`}>
                      {tier}
                    </Badge>
                    {style.icon}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-2xl font-bold">{customerCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Customers</p>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Points</p>
                      <p className="text-sm font-semibold">{totalPoints.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Avg LTV</p>
                      <p className="text-sm font-semibold">{formatCurrency(Math.round(avgLTV))}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                Latest loyalty point activities
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const badgeStyle = typeBadgeStyles[tx.type] || typeBadgeStyles.earn
                    const isPositive = tx.type === 'earn' || tx.type === 'bonus' || tx.type === 'referral' || tx.type === 'birthday'

                    return (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium text-sm">
                              {tx.customer.firstName} {tx.customer.lastName}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {tx.customer.loyaltyPoints.toLocaleString()} pts
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${badgeStyle.bg} gap-1 capitalize`}>
                            {badgeStyle.icon}
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : '-'}{Math.abs(tx.points).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {tx.description || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(tx.createdAt)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted/50 mb-3">
                <Star className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No loyalty transactions</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Transactions will appear as customers earn and redeem points.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loyalty Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
              <Plus className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">Award Points</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manually award loyalty points to a customer
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { resetDialog(); setAwardDialogOpen(true) }}>
              Award
            </Button>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 text-amber-600 shrink-0">
              <Minus className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">Redeem Points</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Process a loyalty points redemption for a customer
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { resetDialog(); setRedeemDialogOpen(true) }}>
              Redeem
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Award Points Dialog */}
      <Dialog open={awardDialogOpen} onOpenChange={(open) => { setAwardDialogOpen(open); if (!open) resetDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Award Loyalty Points</DialogTitle>
            <DialogDescription>Manually award points to a customer</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Search Customer</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {searchingCustomers && <p className="text-xs text-muted-foreground">Searching...</p>}
              {customerResults.length > 0 && !selectedCustomerId && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm border-b last:border-0"
                      onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(`${c.firstName} ${c.lastName}`); setCustomerResults([]) }}
                    >
                      <span className="font-medium">{c.firstName} {c.lastName}</span>
                      <span className="text-muted-foreground ml-2">{c.phone}</span>
                      <span className="text-xs text-muted-foreground ml-2">({c.loyaltyPoints.toLocaleString()} pts)</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedCustomerId && (
                <p className="text-xs text-emerald-600 font-medium">Customer selected</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Points *</Label>
                <Input type="number" min="1" value={dialogPoints} onChange={(e) => setDialogPoints(e.target.value)} placeholder="100" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={dialogDescription} onChange={(e) => setDialogDescription(e.target.value)} placeholder="Reason for award" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAwardDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => handleLoyaltyAction('award')} disabled={dialogSubmitting || !selectedCustomerId || !dialogPoints}>
              {dialogSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Award Points
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redeem Points Dialog */}
      <Dialog open={redeemDialogOpen} onOpenChange={(open) => { setRedeemDialogOpen(open); if (!open) resetDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redeem Loyalty Points</DialogTitle>
            <DialogDescription>Process a points redemption for a customer</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Search Customer</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {searchingCustomers && <p className="text-xs text-muted-foreground">Searching...</p>}
              {customerResults.length > 0 && !selectedCustomerId && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm border-b last:border-0"
                      onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(`${c.firstName} ${c.lastName}`); setCustomerResults([]) }}
                    >
                      <span className="font-medium">{c.firstName} {c.lastName}</span>
                      <span className="text-muted-foreground ml-2">{c.phone}</span>
                      <span className="text-xs text-amber-600 ml-2">({c.loyaltyPoints.toLocaleString()} pts available)</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedCustomerId && (
                <p className="text-xs text-emerald-600 font-medium">Customer selected</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Points to Redeem *</Label>
                <Input type="number" min="1" value={dialogPoints} onChange={(e) => setDialogPoints(e.target.value)} placeholder="50" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={dialogDescription} onChange={(e) => setDialogDescription(e.target.value)} placeholder="Reason for redemption" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedeemDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => handleLoyaltyAction('redeem')} disabled={dialogSubmitting || !selectedCustomerId || !dialogPoints}>
              {dialogSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Redeem Points
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
