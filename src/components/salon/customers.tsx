'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import {
  Users, Plus, Search, Filter, Phone, Mail, Calendar,
  Star, Award, Eye, Pencil, ChevronDown, X, Loader2,
  Heart, Sparkles, Crown, Gem, MapPin, User
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CustomerMembership {
  id: string
  status: string
  plan: { name: string; price: number }
}

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string
  gender: string | null
  dateOfBirth: string | null
  skinType: string | null
  hairType: string | null
  preferences: string | null
  loyaltyTier: string
  loyaltyPoints: number
  totalVisits: number
  lifetimeValue: number
  status: string
  memberships: CustomerMembership[]
  createdAt?: string
}

interface CustomerAppointment {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  totalAmount: number
  services: { service: { name: string } }[]
  staff: { firstName: string; lastName: string }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getTierBadge(tier: string): { className: string; icon: React.ReactNode; label: string } {
  switch (tier) {
    case 'silver':
      return { className: 'bg-gray-100 text-gray-700 border-gray-300', icon: <Award className="h-3 w-3" />, label: 'Silver' }
    case 'gold':
      return { className: 'bg-amber-100 text-amber-800 border-amber-300', icon: <Star className="h-3 w-3" />, label: 'Gold' }
    case 'platinum':
      return { className: 'bg-pink-100 text-pink-800 border-pink-300', icon: <Gem className="h-3 w-3" />, label: 'Platinum' }
    case 'vip':
      return { className: 'bg-purple-100 text-purple-800 border-purple-300', icon: <Crown className="h-3 w-3" />, label: 'VIP' }
    default:
      return { className: 'bg-gray-100 text-gray-700 border-gray-200', icon: <Award className="h-3 w-3" />, label: tier }
  }
}

function getTierProgress(tier: string): number {
  switch (tier) {
    case 'silver': return 25
    case 'gold': return 50
    case 'platinum': return 75
    case 'vip': return 100
    default: return 10
  }
}

// ─── Skeleton Loaders ────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CustomerTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CustomersModule() {
  // State
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState('all')
  const [totalCustomers, setTotalCustomers] = useState(0)

  // Profile Dialog
  const [profileCustomer, setProfileCustomer] = useState<Customer | null>(null)
  const [profileAppointments, setProfileAppointments] = useState<CustomerAppointment[]>([])
  const [profileLoading, setProfileLoading] = useState(false)

  // Add Customer Dialog
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null)
  const [addForm, setAddForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    gender: '',
    dateOfBirth: '',
    skinType: '',
    hairType: '',
    preferences: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('take', '100')
      if (searchQuery) params.set('search', searchQuery)
      if (tierFilter !== 'all') params.set('loyaltyTier', tierFilter)

      const res = await fetch(`/api/customers?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setCustomers(data.data)
        setTotalCustomers(data.pagination?.total ?? data.data.length)
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, tierFilter])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const fetchProfile = async (customerId: string) => {
    setProfileLoading(true)
    try {
      const res = await fetch(`/api/appointments?customerId=${customerId}&take=10`)
      const data = await res.json()
      if (data.success) {
        setProfileAppointments(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch customer profile:', err)
    } finally {
      setProfileLoading(false)
    }
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const vipPlatinumCount = customers.filter(c => c.loyaltyTier === 'vip' || c.loyaltyTier === 'platinum').length
  const avgLifetimeValue = customers.length > 0
    ? customers.reduce((sum, c) => sum + c.lifetimeValue, 0) / customers.length
    : 0
  const totalLoyaltyPoints = customers.reduce((sum, c) => sum + c.loyaltyPoints, 0)

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleAddCustomer = async () => {
    if (!addForm.firstName || !addForm.lastName || !addForm.phone) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addForm,
          email: addForm.email || undefined,
          gender: addForm.gender || undefined,
          dateOfBirth: addForm.dateOfBirth || undefined,
          skinType: addForm.skinType || undefined,
          hairType: addForm.hairType || undefined,
          preferences: addForm.preferences || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Customer added successfully')
        setShowAddDialog(false)
        resetAddForm()
        fetchCustomers()
      } else {
        toast.error(data.error || 'Failed to add customer')
      }
    } catch (err) {
      console.error('Failed to add customer:', err)
      toast.error('Failed to add customer')
    } finally {
      setSubmitting(false)
    }
  }

  const resetAddForm = () => {
    setAddForm({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      gender: '',
      dateOfBirth: '',
      skinType: '',
      hairType: '',
      preferences: '',
    })
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your salon&apos;s customer relationships and loyalty programs
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetAddForm() }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>Register a new customer in the system</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>First Name *</Label>
                  <Input
                    placeholder="First name"
                    value={addForm.firstName}
                    onChange={(e) => setAddForm(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Last Name *</Label>
                  <Input
                    placeholder="Last name"
                    value={addForm.lastName}
                    onChange={(e) => setAddForm(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Phone *</Label>
                  <Input
                    placeholder="+92-3XX-XXXXXXX"
                    value={addForm.phone}
                    onChange={(e) => setAddForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Gender</Label>
                  <Select value={addForm.gender} onValueChange={(v) => setAddForm(prev => ({ ...prev, gender: v }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={addForm.dateOfBirth}
                    onChange={(e) => setAddForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  />
                </div>
              </div>

              <Separator />

              <p className="text-sm font-medium text-muted-foreground">Beauty Profile</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Skin Type</Label>
                  <Select value={addForm.skinType} onValueChange={(v) => setAddForm(prev => ({ ...prev, skinType: v }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="dry">Dry</SelectItem>
                      <SelectItem value="oily">Oily</SelectItem>
                      <SelectItem value="combination">Combination</SelectItem>
                      <SelectItem value="sensitive">Sensitive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Hair Type</Label>
                  <Select value={addForm.hairType} onValueChange={(v) => setAddForm(prev => ({ ...prev, hairType: v }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="straight">Straight</SelectItem>
                      <SelectItem value="wavy">Wavy</SelectItem>
                      <SelectItem value="curly">Curly</SelectItem>
                      <SelectItem value="fine">Fine</SelectItem>
                      <SelectItem value="coily">Coily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Preferences / Notes</Label>
                <Textarea
                  placeholder="Customer preferences, allergies, special notes..."
                  value={addForm.preferences}
                  onChange={(e) => setAddForm(prev => ({ ...prev, preferences: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAddDialog(false); resetAddForm() }}>
                Cancel
              </Button>
              <Button
                onClick={handleAddCustomer}
                disabled={submitting || !addForm.firstName || !addForm.lastName || !addForm.phone}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Customer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Customers</p>
                  <p className="text-2xl font-bold">{totalCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">VIP / Platinum</p>
                  <p className="text-2xl font-bold">{vipPlatinumCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg. Lifetime Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(avgLifetimeValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Star className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Loyalty Points</p>
                  <p className="text-2xl font-bold">{totalLoyaltyPoints.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="silver">Silver</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="platinum">Platinum</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Customer Table */}
      {loading ? (
        <CustomerTableSkeleton />
      ) : customers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-1">No customers found</h3>
          <p className="text-sm">Try adjusting your search or filter, or add a new customer</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Loyalty Tier</TableHead>
                  <TableHead className="hidden md:table-cell">Total Visits</TableHead>
                  <TableHead>Lifetime Value</TableHead>
                  <TableHead className="hidden lg:table-cell">Membership</TableHead>
                  <TableHead className="hidden sm:table-cell">Last Visit</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map(customer => {
                  const tierInfo = getTierBadge(customer.loyaltyTier)
                  const activeMembership = customer.memberships?.find(m => m.status === 'active')
                  const initials = `${customer.firstName[0]}${customer.lastName[0]}`.toUpperCase()

                  return (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className={cn(
                              'text-xs font-medium',
                              customer.loyaltyTier === 'vip' ? 'bg-purple-100 text-purple-700' :
                              customer.loyaltyTier === 'platinum' ? 'bg-pink-100 text-pink-700' :
                              customer.loyaltyTier === 'gold' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-700'
                            )}>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{customer.firstName} {customer.lastName}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {customer.phone}
                            </p>
                            {customer.email && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {customer.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('font-medium text-xs border gap-1', tierInfo.className)}>
                          {tierInfo.icon}
                          {tierInfo.label}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{customer.loyaltyPoints.toLocaleString()} pts</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm font-medium">{customer.totalVisits}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold">{formatCurrency(customer.lifetimeValue)}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {activeMembership ? (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Heart className="h-3 w-3 text-rose-500" />
                            {activeMembership.plan.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {customer.createdAt ? format(parseISO(customer.createdAt), 'MMM d, yyyy') : 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setProfileCustomer(customer)
                              fetchProfile(customer.id)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditCustomer(customer)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Customer Profile Dialog */}
      <Dialog open={!!profileCustomer} onOpenChange={(open) => { if (!open) setProfileCustomer(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {profileCustomer && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className={cn(
                      'text-lg font-medium',
                      profileCustomer.loyaltyTier === 'vip' ? 'bg-purple-100 text-purple-700' :
                      profileCustomer.loyaltyTier === 'platinum' ? 'bg-pink-100 text-pink-700' :
                      profileCustomer.loyaltyTier === 'gold' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    )}>
                      {`${profileCustomer.firstName[0]}${profileCustomer.lastName[0]}`}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl">
                      {profileCustomer.firstName} {profileCustomer.lastName}
                    </DialogTitle>
                    <DialogDescription>
                      {(() => {
                        const t = getTierBadge(profileCustomer.loyaltyTier)
                        return (
                          <Badge className={cn('font-medium text-xs border gap-1 mt-1', t.className)}>
                            {t.icon} {t.label} Member
                          </Badge>
                        )
                      })()}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-2">
                {/* Contact Info */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Contact Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{profileCustomer.phone}</span>
                    </div>
                    {profileCustomer.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{profileCustomer.email}</span>
                      </div>
                    )}
                    {profileCustomer.dateOfBirth && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>DOB: {format(parseISO(profileCustomer.dateOfBirth), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    {profileCustomer.gender && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="capitalize">{profileCustomer.gender}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Beauty Profile */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Beauty Profile</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {profileCustomer.skinType && (
                      <div className="bg-accent/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Skin Type</p>
                        <p className="text-sm font-medium capitalize">{profileCustomer.skinType}</p>
                      </div>
                    )}
                    {profileCustomer.hairType && (
                      <div className="bg-accent/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Hair Type</p>
                        <p className="text-sm font-medium capitalize">{profileCustomer.hairType}</p>
                      </div>
                    )}
                    {profileCustomer.preferences && (
                      <div className="col-span-2 bg-accent/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Preferences</p>
                        <p className="text-sm">{profileCustomer.preferences}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Loyalty Info */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Loyalty & Value</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-accent/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Tier</p>
                      <Badge className={cn('font-medium text-xs border gap-1', getTierBadge(profileCustomer.loyaltyTier).className)}>
                        {getTierBadge(profileCustomer.loyaltyTier).icon}
                        {getTierBadge(profileCustomer.loyaltyTier).label}
                      </Badge>
                    </div>
                    <div className="bg-accent/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Points</p>
                      <p className="text-lg font-bold">{profileCustomer.loyaltyPoints.toLocaleString()}</p>
                    </div>
                    <div className="bg-accent/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Lifetime Value</p>
                      <p className="text-lg font-bold">{formatCurrency(profileCustomer.lifetimeValue)}</p>
                    </div>
                    <div className="bg-accent/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Total Visits</p>
                      <p className="text-lg font-bold">{profileCustomer.totalVisits}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Silver</span>
                      <span>Gold</span>
                      <span>Platinum</span>
                      <span>VIP</span>
                    </div>
                    <Progress value={getTierProgress(profileCustomer.loyaltyTier)} className="h-2" />
                  </div>
                </div>

                {/* Membership Status */}
                {profileCustomer.memberships && profileCustomer.memberships.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Membership</h3>
                      {profileCustomer.memberships.map(m => (
                        <div key={m.id} className="flex items-center justify-between bg-accent/50 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <Heart className={cn('h-4 w-4', m.status === 'active' ? 'text-rose-500' : 'text-muted-foreground')} />
                            <span className="text-sm font-medium">{m.plan.name}</span>
                          </div>
                          <Badge variant={m.status === 'active' ? 'default' : 'secondary'} className="text-xs capitalize">
                            {m.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <Separator />

                {/* Recent Appointments */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Recent Appointments</h3>
                  {profileLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : profileAppointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No appointments yet</p>
                  ) : (
                    <ScrollArea className="max-h-64">
                      <div className="space-y-2">
                        {profileAppointments.slice(0, 5).map(apt => (
                          <div key={apt.id} className="flex items-center gap-3 p-3 rounded-lg border bg-accent/30">
                            <div className="text-center min-w-[50px]">
                              <p className="text-xs font-bold">{apt.startTime}</p>
                              <p className="text-xs text-muted-foreground">{apt.endTime}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">
                                {apt.services.map(s => s.service.name).join(', ')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(parseISO(apt.date), 'MMM d')} · {apt.staff.firstName} {apt.staff.lastName}
                              </p>
                            </div>
                            <Badge className={cn(
                              'text-xs border',
                              apt.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                              apt.status === 'cancelled' ? 'bg-red-100 text-red-800 border-red-200' :
                              apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                              apt.status === 'in_progress' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                              'bg-blue-100 text-blue-800 border-blue-200'
                            )}>
                              {apt.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={!!editCustomer} onOpenChange={(open) => { if (!open) setEditCustomer(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>Update customer information</DialogDescription>
          </DialogHeader>
          {editCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input defaultValue={editCustomer.firstName} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input defaultValue={editCustomer.lastName} disabled />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input defaultValue={editCustomer.phone} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input defaultValue={editCustomer.email || ''} disabled />
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                Customer editing requires a PATCH endpoint. Feature coming soon!
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCustomer(null)}>Close</Button>
            <Button onClick={() => { toast.info('Feature coming soon'); setEditCustomer(null) }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Customer Dialog */}
      <Dialog open={!!deleteCustomer} onOpenChange={(open) => { if (!open) setDeleteCustomer(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>Are you sure you want to delete this customer?</DialogDescription>
          </DialogHeader>
          {deleteCustomer && (
            <div className="space-y-3">
              <p className="text-sm">This will permanently remove <strong>{deleteCustomer.firstName} {deleteCustomer.lastName}</strong> and all associated data.</p>
              <div className="rounded-lg border bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-600 dark:text-red-400">
                Customer deletion requires a DELETE endpoint. Feature coming soon!
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCustomer(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { toast.info('Feature coming soon'); setDeleteCustomer(null) }}>Delete Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
