'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Crown,
  Plus,
  Users,
  DollarSign,
  Percent,
  CreditCard,
  Sparkles,
  Calendar,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Loader2,
  Ban,
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
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'

const formatCurrency = (amount: number) => `PKR ${amount.toLocaleString()}`

// Types
interface MembershipPlan {
  id: string
  name: string
  description: string | null
  price: number
  duration: number
  discount: number
  freeServices: number
  priorityBooking: boolean
  loyaltyBonus: number
  isActive: boolean
  createdAt: string
  memberCount: number
}

interface ActiveMembership {
  id: string
  customerId: string
  planId: string
  startDate: string
  endDate: string
  status: string
  autoRenew: boolean
  paymentMethod: string | null
  createdAt: string
  customer: {
    id: string
    firstName: string
    lastName: string
    phone: string
    email: string | null
    loyaltyTier: string
  }
  plan: {
    id: string
    name: string
    price: number
    duration: number
    discount: number
  }
}

// Tier color mapping
const tierColors: Record<string, { bg: string; text: string; border: string; card: string; badge: string }> = {
  Silver: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', card: 'bg-gray-50', badge: 'bg-gray-100 text-gray-700 border-gray-300' },
  Gold: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', card: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700 border-amber-300' },
  Platinum: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300', card: 'bg-cyan-50', badge: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  VIP: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', card: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700 border-purple-300' },
}

function getTierColor(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes('vip')) return tierColors.VIP
  if (lower.includes('platinum')) return tierColors.Platinum
  if (lower.includes('gold')) return tierColors.Gold
  return tierColors.Silver
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  expired: 'bg-red-100 text-red-700 border-red-300',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-300',
  paused: 'bg-amber-100 text-amber-700 border-amber-300',
}

export function MembershipsModule() {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [members, setMembers] = useState<ActiveMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('plans')
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false)
  const [subscribeForm, setSubscribeForm] = useState({ customerId: '', planId: '', startDate: '' })
  const [subscribeSubmitting, setSubscribeSubmitting] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<{id: string; firstName: string; lastName: string; phone: string}[]>([])
  const [searchingCustomers, setSearchingCustomers] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formDuration, setFormDuration] = useState('')
  const [formDiscount, setFormDiscount] = useState('')
  const [formFreeServices, setFormFreeServices] = useState('')
  const [formLoyaltyBonus, setFormLoyaltyBonus] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPriorityBooking, setFormPriorityBooking] = useState(false)

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/memberships')
      const json = await res.json()
      if (json.success) {
        setPlans(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err)
    }
  }, [])

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/memberships?type=memberships')
      const json = await res.json()
      if (json.success) {
        setMembers(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch members:', err)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchPlans(), fetchMembers()])
      setLoading(false)
    }
    load()
  }, [fetchPlans, fetchMembers])

  const resetForm = () => {
    setFormName('')
    setFormPrice('')
    setFormDuration('')
    setFormDiscount('')
    setFormFreeServices('')
    setFormLoyaltyBonus('')
    setFormDescription('')
    setFormPriorityBooking(false)
  }

  // Customer search for subscribe dialog
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
        setCustomerResults(json.data.map((c: {id: string; firstName: string; lastName: string; phone: string}) => ({
          id: c.id, firstName: c.firstName, lastName: c.lastName, phone: c.phone,
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

  const handleSubscribe = async () => {
    if (!subscribeForm.customerId || !subscribeForm.planId || !subscribeForm.startDate) {
      toast.error('Please fill all required fields')
      return
    }
    setSubscribeSubmitting(true)
    try {
      const plan = plans.find(p => p.id === subscribeForm.planId)
      const startDate = new Date(subscribeForm.startDate)
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + (plan?.duration || 1))

      const res = await fetch('/api/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${plan?.name || 'Membership'} Subscription`,
          price: plan?.price || 0,
          duration: plan?.duration || 1,
          customerId: subscribeForm.customerId,
          planId: subscribeForm.planId,
          startDate: subscribeForm.startDate,
          endDate: endDate.toISOString(),
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Customer subscribed successfully')
        setSubscribeDialogOpen(false)
        setSubscribeForm({ customerId: '', planId: '', startDate: '' })
        setCustomerSearch('')
        setCustomerResults([])
        fetchMembers()
        fetchPlans()
      } else {
        toast.error(json.error || 'Failed to subscribe customer')
      }
    } catch {
      toast.error('Failed to subscribe customer')
    } finally {
      setSubscribeSubmitting(false)
    }
  }

  const handleCancelMembership = async (membershipId: string) => {
    setCancellingId(membershipId)
    try {
      const res = await fetch(`/api/memberships/${membershipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', autoRenew: false }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Membership cancelled')
        fetchMembers()
      } else {
        toast.error(json.error || 'Failed to cancel membership')
      }
    } catch {
      toast.error('Failed to cancel membership')
    } finally {
      setCancellingId(null)
    }
  }

  const handleCreatePlan = async () => {
    if (!formName || !formPrice || !formDuration) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          price: parseFloat(formPrice),
          duration: parseInt(formDuration),
          discount: formDiscount ? parseFloat(formDiscount) : 0,
          freeServices: formFreeServices ? parseInt(formFreeServices) : 0,
          loyaltyBonus: formLoyaltyBonus ? parseInt(formLoyaltyBonus) : 0,
          description: formDescription || null,
          priorityBooking: formPriorityBooking,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Membership plan created successfully')
        resetForm()
        setDialogOpen(false)
        fetchPlans()
      } else {
        toast.error(json.error || 'Failed to create plan')
      }
    } catch (err) {
      console.error('Failed to create plan:', err)
      toast.error('Failed to create plan')
    } finally {
      setSubmitting(false)
    }
  }

  // Stats
  const activePlans = plans.filter((p) => p.isActive).length
  const totalMembers = plans.reduce((sum, p) => sum + p.memberCount, 0)
  const membershipRevenue = members
    .filter((m) => m.status === 'active')
    .reduce((sum, m) => sum + m.plan.price, 0)
  const avgDiscount = plans.length > 0
    ? plans.reduce((sum, p) => sum + p.discount, 0) / plans.length
    : 0

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
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-52 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 text-amber-600">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Membership Management</h2>
            <p className="text-sm text-muted-foreground">Plans, subscriptions & member benefits</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setSubscribeDialogOpen(true)}>
            <Users className="h-4 w-4 mr-1.5" />
            Subscribe Customer
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Create Plan
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Membership Plan</DialogTitle>
              <DialogDescription>
                Define a new membership plan with benefits and pricing.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="plan-name">Plan Name *</Label>
                <Input
                  id="plan-name"
                  placeholder="e.g. Gold Membership"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="plan-price">Price (PKR) *</Label>
                  <Input
                    id="plan-price"
                    type="number"
                    placeholder="5000"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="plan-duration">Duration (months) *</Label>
                  <Input
                    id="plan-duration"
                    type="number"
                    placeholder="6"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="plan-discount">Discount %</Label>
                  <Input
                    id="plan-discount"
                    type="number"
                    placeholder="10"
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="plan-free">Free Services</Label>
                  <Input
                    id="plan-free"
                    type="number"
                    placeholder="2"
                    value={formFreeServices}
                    onChange={(e) => setFormFreeServices(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="plan-loyalty">Loyalty Bonus</Label>
                  <Input
                    id="plan-loyalty"
                    type="number"
                    placeholder="500"
                    value={formLoyaltyBonus}
                    onChange={(e) => setFormLoyaltyBonus(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plan-desc">Description</Label>
                <Textarea
                  id="plan-desc"
                  placeholder="Describe the benefits of this plan..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="priority-booking">Priority Booking</Label>
                  <p className="text-xs text-muted-foreground">
                    Members get priority access to appointment slots
                  </p>
                </div>
                <Switch
                  id="priority-booking"
                  checked={formPriorityBooking}
                  onCheckedChange={setFormPriorityBooking}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreatePlan}
                disabled={!formName || !formPrice || !formDuration || submitting}
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-1.5" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Create Plan
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Plans</CardTitle>
            <CreditCard className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePlans}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {plans.length} total plans
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all plans
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Membership Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(membershipRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From active subscriptions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Discount</CardTitle>
            <Percent className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDiscount.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average across plans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="members">Active Members</TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans" className="mt-4">
          {plans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const colors = getTierColor(plan.name)
                return (
                  <Card key={plan.id} className={`relative overflow-hidden border ${colors.border}`}>
                    {/* Color accent bar */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${colors.bg}`} />
                    <CardHeader className="pb-3 pt-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center justify-center h-8 w-8 rounded-lg ${colors.bg}`}>
                            <Crown className={`h-4 w-4 ${colors.text}`} />
                          </div>
                          <div>
                            <CardTitle className="text-base">{plan.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {plan.duration} month{plan.duration !== 1 ? 's' : ''}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className={colors.badge}>
                          {plan.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Price */}
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">{formatCurrency(plan.price)}</span>
                        <span className="text-sm text-muted-foreground">/{plan.duration}mo</span>
                      </div>

                      <Separator />

                      {/* Benefits */}
                      <div className="space-y-2">
                        {plan.discount > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <Percent className="h-3.5 w-3.5 text-emerald-500" />
                            <span>{plan.discount}% discount on services</span>
                          </div>
                        )}
                        {plan.freeServices > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            <span>{plan.freeServices} free service{plan.freeServices !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {plan.priorityBooking && (
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-500" />
                            <span>Priority booking</span>
                          </div>
                        )}
                        {plan.loyaltyBonus > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <Crown className="h-3.5 w-3.5 text-purple-500" />
                            <span>{plan.loyaltyBonus} loyalty bonus points</span>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Member count */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          <span>{plan.memberCount} member{plan.memberCount !== 1 ? 's' : ''}</span>
                        </div>
                        {plan.description && (
                          <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                            {plan.description}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted/50 mb-3">
                  <Crown className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold">No membership plans</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your first plan to start offering memberships.
                </p>
                <Button size="sm" className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create Plan
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Active Members Tab */}
        <TabsContent value="members" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Memberships</CardTitle>
              <CardDescription>
                {members.length} membership{members.length !== 1 ? 's' : ''} registered
              </CardDescription>
            </CardHeader>
            <CardContent>
              {members.length > 0 ? (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Auto-Renew</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((membership) => (
                        <TableRow key={membership.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium text-sm">
                                {membership.customer.firstName} {membership.customer.lastName}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {membership.customer.phone}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getTierColor(membership.customer.loyaltyTier).badge}
                            >
                              {membership.customer.loyaltyTier}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{membership.plan.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(membership.startDate).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(membership.endDate).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            {membership.autoRenew ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 gap-1">
                                <RefreshCw className="h-3 w-3" />
                                Yes
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300 gap-1">
                                <XCircle className="h-3 w-3" />
                                No
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusColors[membership.status] || statusColors.paused}
                            >
                              {membership.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {membership.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-red-500 hover:text-red-600 gap-1"
                                onClick={() => handleCancelMembership(membership.id)}
                                disabled={cancellingId === membership.id}
                              >
                                {cancellingId === membership.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Ban className="h-3 w-3" />
                                )}
                                Cancel
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted/50 mb-3">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold">No active memberships</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Members will appear here once they subscribe to a plan.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Subscribe Customer Dialog */}
      <Dialog open={subscribeDialogOpen} onOpenChange={setSubscribeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Subscribe Customer</DialogTitle>
            <DialogDescription>Subscribe a customer to a membership plan</DialogDescription>
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
              {customerResults.length > 0 && !subscribeForm.customerId && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm border-b last:border-0"
                      onClick={() => { setSubscribeForm({...subscribeForm, customerId: c.id}); setCustomerSearch(`${c.firstName} ${c.lastName}`); setCustomerResults([]) }}
                    >
                      <span className="font-medium">{c.firstName} {c.lastName}</span>
                      <span className="text-muted-foreground ml-2">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
              {subscribeForm.customerId && <p className="text-xs text-emerald-600 font-medium">Customer selected</p>}
            </div>
            <div className="space-y-2">
              <Label>Select Plan *</Label>
              <Select value={subscribeForm.planId} onValueChange={(v) => setSubscribeForm({...subscribeForm, planId: v})}>
                <SelectTrigger><SelectValue placeholder="Choose a plan" /></SelectTrigger>
                <SelectContent>
                  {plans.filter(p => p.isActive).map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>{plan.name} - {formatCurrency(plan.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input type="date" value={subscribeForm.startDate} onChange={(e) => setSubscribeForm({...subscribeForm, startDate: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscribeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubscribe} disabled={subscribeSubmitting || !subscribeForm.customerId || !subscribeForm.planId || !subscribeForm.startDate}>
              {subscribeSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Subscribe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
