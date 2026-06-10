'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { format, parseISO, isToday, isThisWeek, isThisMonth, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import {
  CalendarDays, Plus, Search, Clock, User, ChevronDown,
  CheckCircle2, XCircle, AlertCircle, Play, Eye, Phone,
  Loader2, Filter, MapPin, UserCheck, Stethoscope, StickyNote,
  Calendar, DollarSign, Timer, Tag, MoreHorizontal,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AppointmentServiceItem {
  id: string
  serviceId: string
  service: { name: string; price: number; duration: number }
  price: number
  duration: number
}

interface Appointment {
  id: string
  branchId: string
  customerId: string
  staffId: string
  date: string
  startTime: string
  endTime: string
  status: string
  type: string
  notes: string | null
  totalAmount: number
  customer: { id: string; firstName: string; lastName: string; phone: string }
  staff: { id: string; firstName: string; lastName: string; role: string; specialization: string }
  services: AppointmentServiceItem[]
  branch?: { id: string; name: string; branchCode: string }
}

interface Customer {
  id: string
  firstName: string
  lastName: string
  phone: string
  email?: string | null
  loyaltyTier: string
}

interface StaffMember {
  id: string
  firstName: string
  lastName: string
  role: string
  specialization?: string | null
  branchId: string
  status: string
}

interface Branch {
  id: string
  name: string
  branchCode: string
}

interface ServiceCategory {
  id: string
  name: string
  services: ServiceItem[]
}

interface ServiceItem {
  id: string
  name: string
  price: number
  duration: number
  categoryId: string
  isActive: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `PKR ${amount.toLocaleString()}`
}

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

function getStatusConfig(status: string): { label: string; className: string; bgClass: string; icon: React.ReactNode } {
  switch (status) {
    case 'scheduled':
      return { label: 'Scheduled', className: 'bg-blue-100 text-blue-800 border-blue-200', bgClass: 'bg-blue-50', icon: <CalendarDays className="h-4 w-4 text-blue-600" /> }
    case 'confirmed':
      return { label: 'Confirmed', className: 'bg-emerald-100 text-emerald-800 border-emerald-200', bgClass: 'bg-emerald-50', icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" /> }
    case 'in_progress':
      return { label: 'In Progress', className: 'bg-amber-100 text-amber-800 border-amber-200', bgClass: 'bg-amber-50', icon: <Play className="h-4 w-4 text-amber-600" /> }
    case 'completed':
      return { label: 'Completed', className: 'bg-green-100 text-green-800 border-green-200', bgClass: 'bg-green-50', icon: <CheckCircle2 className="h-4 w-4 text-green-600" /> }
    case 'cancelled':
      return { label: 'Cancelled', className: 'bg-red-100 text-red-800 border-red-200', bgClass: 'bg-red-50', icon: <XCircle className="h-4 w-4 text-red-600" /> }
    case 'no_show':
      return { label: 'No Show', className: 'bg-orange-100 text-orange-800 border-orange-200', bgClass: 'bg-orange-50', icon: <AlertCircle className="h-4 w-4 text-orange-600" /> }
    default:
      return { label: status, className: 'bg-gray-100 text-gray-800 border-gray-200', bgClass: 'bg-gray-50', icon: <CalendarDays className="h-4 w-4 text-gray-600" /> }
  }
}

function getAvailableActions(status: string): { label: string; action: string; icon: React.ReactNode; className: string }[] {
  const actions: { label: string; action: string; icon: React.ReactNode; className: string }[] = []
  switch (status) {
    case 'scheduled':
      actions.push({ label: 'Confirm', action: 'confirmed', icon: <CheckCircle2 className="h-4 w-4" />, className: 'text-emerald-600' })
      actions.push({ label: 'Cancel', action: 'cancelled', icon: <XCircle className="h-4 w-4" />, className: 'text-red-600' })
      break
    case 'confirmed':
      actions.push({ label: 'Start', action: 'in_progress', icon: <Play className="h-4 w-4" />, className: 'text-amber-600' })
      actions.push({ label: 'Cancel', action: 'cancelled', icon: <XCircle className="h-4 w-4" />, className: 'text-red-600' })
      break
    case 'in_progress':
      actions.push({ label: 'Complete', action: 'completed', icon: <CheckCircle2 className="h-4 w-4" />, className: 'text-green-600' })
      break
    case 'scheduled':
    case 'confirmed':
      actions.push({ label: 'Mark No Show', action: 'no_show', icon: <AlertCircle className="h-4 w-4" />, className: 'text-orange-600' })
      break
  }
  // Allow no-show for scheduled and confirmed
  if (status === 'scheduled' || status === 'confirmed') {
    if (!actions.find(a => a.action === 'no_show')) {
      actions.push({ label: 'Mark No Show', action: 'no_show', icon: <AlertCircle className="h-4 w-4" />, className: 'text-orange-600' })
    }
  }
  return actions
}

// Generate 30-min time slots from 9:00 to 20:00
function generateTimeSlots(): { value: string; label: string }[] {
  const slots: { value: string; label: string }[] = []
  for (let h = 9; h <= 19; h++) {
    for (const m of [0, 30]) {
      if (h === 20 && m > 0) break
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      slots.push({ value, label: formatTime12(value) })
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

const STATUS_LIST = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'] as const

type DateRange = 'today' | 'this_week' | 'this_month' | 'custom'

// ─── Skeleton Loaders ────────────────────────────────────────────────────────

function StatusCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div>
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-6 w-10" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function FiltersSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-10 w-44" />
      <Skeleton className="h-10 w-40" />
    </div>
  )
}

function TableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="space-y-0">
          <div className="border-b p-4">
            <div className="flex gap-6">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-20" />
              ))}
            </div>
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AppointmentsModule() {
  // ─── State ─────────────────────────────────────────────────────────────────
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [totalAppointments, setTotalAppointments] = useState(0)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [branchFilter, setBranchFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DateRange>('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  // Reference data
  const [branches, setBranches] = useState<Branch[]>([])
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])

  // New appointment dialog
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newForm, setNewForm] = useState({
    customerId: '',
    branchId: '',
    staffId: '',
    date: '',
    startTime: '',
    serviceIds: [] as string[],
    notes: '',
    type: 'booking',
  })
  const [customerSearch, setCustomerSearch] = useState('')

  // ─── Date range helpers ────────────────────────────────────────────────────

  const getDateRangeParams = useCallback((): { from?: string; to?: string } => {
    const now = new Date()
    switch (dateRange) {
      case 'today':
        return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() }
      case 'this_week':
        return { from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), to: endOfWeek(now, { weekStartsOn: 1 }).toISOString() }
      case 'this_month':
        return { from: startOfMonth(now).toISOString(), to: endOfMonth(now).toISOString() }
      case 'custom':
        if (customFrom && customTo) {
          return { from: startOfDay(new Date(customFrom)).toISOString(), to: endOfDay(new Date(customTo)).toISOString() }
        }
        if (customFrom) {
          return { from: startOfDay(new Date(customFrom)).toISOString() }
        }
        return {}
      default:
        return {}
    }
  }, [dateRange, customFrom, customTo])

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('take', '100')
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (branchFilter !== 'all') params.set('branchId', branchFilter)
      const dateParams = getDateRangeParams()
      if (dateParams.from) params.set('from', dateParams.from)
      if (dateParams.to) params.set('to', dateParams.to)

      const res = await fetch(`/api/appointments?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setAppointments(data.data)
        setTotalAppointments(data.pagination?.total ?? data.data.length)
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, branchFilter, getDateRangeParams])

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch('/api/branches')
      const data = await res.json()
      if (data.success) setBranches(data.data)
    } catch (err) {
      console.error('Failed to fetch branches:', err)
    }
  }, [])

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch('/api/staff?take=100&status=active')
      const data = await res.json()
      if (data.success) setStaffList(data.data)
    } catch (err) {
      console.error('Failed to fetch staff:', err)
    }
  }, [])

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/services')
      const data = await res.json()
      if (data.success) {
        setServiceCategories(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch services:', err)
    }
  }, [])

  const fetchCustomers = useCallback(async (search?: string) => {
    try {
      const params = new URLSearchParams()
      params.set('take', '20')
      if (search) params.set('search', search)
      const res = await fetch(`/api/customers?${params.toString()}`)
      const data = await res.json()
      if (data.success) setCustomers(data.data)
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    }
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  useEffect(() => {
    fetchBranches()
    fetchStaff()
    fetchServices()
    fetchCustomers()
  }, [fetchBranches, fetchStaff, fetchServices, fetchCustomers])

  // ─── Computed values ───────────────────────────────────────────────────────

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      scheduled: 0, confirmed: 0, in_progress: 0,
      completed: 0, cancelled: 0, no_show: 0,
    }
    appointments.forEach(apt => {
      if (counts[apt.status] !== undefined) {
        counts[apt.status]++
      }
    })
    return counts
  }, [appointments])

  const filteredStaff = useMemo(() => {
    if (!newForm.branchId) return staffList
    return staffList.filter(s => s.branchId === newForm.branchId && s.status === 'active')
  }, [staffList, newForm.branchId])

  const allServices = useMemo(() => {
    return serviceCategories.flatMap(cat =>
      cat.services.filter(s => s.isActive).map(s => ({ ...s, categoryName: cat.name }))
    )
  }, [serviceCategories])

  const selectedServices = useMemo(() => {
    return allServices.filter(s => newForm.serviceIds.includes(s.id))
  }, [allServices, newForm.serviceIds])

  const calculatedTotal = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.price, 0)
  }, [selectedServices])

  const calculatedDuration = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.duration, 0)
  }, [selectedServices])

  const calculatedEndTime = useMemo(() => {
    if (!newForm.startTime || calculatedDuration === 0) return ''
    const [h, m] = newForm.startTime.split(':').map(Number)
    const totalMin = h * 60 + m + calculatedDuration
    const endH = Math.floor(totalMin / 60)
    const endM = totalMin % 60
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
  }, [newForm.startTime, calculatedDuration])

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (data.success) {
        fetchAppointments()
      }
    } catch (err) {
      console.error('Failed to update appointment status:', err)
    }
  }

  const handleCreateAppointment = async () => {
    if (!newForm.customerId || !newForm.branchId || !newForm.staffId || !newForm.date || !newForm.startTime || newForm.serviceIds.length === 0) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: newForm.branchId,
          customerId: newForm.customerId,
          staffId: newForm.staffId,
          date: newForm.date,
          startTime: newForm.startTime,
          endTime: calculatedEndTime,
          serviceIds: newForm.serviceIds,
          notes: newForm.notes || undefined,
          type: newForm.type,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShowNewDialog(false)
        resetNewForm()
        fetchAppointments()
      }
    } catch (err) {
      console.error('Failed to create appointment:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const resetNewForm = () => {
    setNewForm({
      customerId: '',
      branchId: '',
      staffId: '',
      date: '',
      startTime: '',
      serviceIds: [],
      notes: '',
      type: 'booking',
    })
    setCustomerSearch('')
  }

  const toggleServiceSelection = (serviceId: string) => {
    setNewForm(prev => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter(id => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }))
  }

  // Debounced customer search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showNewDialog) {
        fetchCustomers(customerSearch)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [customerSearch, showNewDialog, fetchCustomers])

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Appointments</h2>
            <p className="text-sm text-muted-foreground">Manage and track all salon appointments</p>
          </div>
        </div>

        <Dialog open={showNewDialog} onOpenChange={(open) => { setShowNewDialog(open); if (!open) resetNewForm() }}>
          <Button className="gap-2" onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4" />
            New Appointment
          </Button>

          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Appointment</DialogTitle>
              <DialogDescription>Schedule a new appointment for a customer</DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 py-4">
              {/* Customer Search */}
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Customer *
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or phone..."
                    className="pl-9"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>
                {customers.length > 0 && (
                  <Select value={newForm.customerId} onValueChange={(v) => setNewForm(prev => ({ ...prev, customerId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.firstName} {c.lastName} — {c.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Separator />

              {/* Branch + Staff */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Branch *
                  </Label>
                  <Select value={newForm.branchId} onValueChange={(v) => setNewForm(prev => ({ ...prev, branchId: v, staffId: '' }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" /> Staff *
                  </Label>
                  <Select value={newForm.staffId} onValueChange={(v) => setNewForm(prev => ({ ...prev, staffId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={newForm.branchId ? 'Select staff' : 'Select branch first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredStaff.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} ({s.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Date + Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Date *
                  </Label>
                  <Input
                    type="date"
                    value={newForm.date}
                    onChange={(e) => setNewForm(prev => ({ ...prev, date: e.target.value }))}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Time Slot *
                  </Label>
                  <Select value={newForm.startTime} onValueChange={(v) => setNewForm(prev => ({ ...prev, startTime: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {TIME_SLOTS.map(slot => (
                        <SelectItem key={slot.value} value={slot.value}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Service Selection (grouped by category) */}
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" /> Services *
                </Label>
                <ScrollArea className="h-56 rounded-lg border p-2">
                  {serviceCategories.map(cat => (
                    <div key={cat.id} className="mb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                        {cat.name}
                      </p>
                      <div className="space-y-1">
                        {cat.services.filter(s => s.isActive).map(svc => {
                          const isSelected = newForm.serviceIds.includes(svc.id)
                          return (
                            <button
                              key={svc.id}
                              type="button"
                              onClick={() => toggleServiceSelection(svc.id)}
                              className={cn(
                                'w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors text-left',
                                isSelected
                                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                                  : 'hover:bg-muted/50 border border-transparent'
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={cn(
                                  'h-4 w-4 rounded border flex items-center justify-center shrink-0',
                                  isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                                )}>
                                  {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                                </div>
                                <span className="truncate">{svc.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <span className="text-xs text-muted-foreground">{svc.duration}m</span>
                                <span className="text-xs font-medium">{formatCurrency(svc.price)}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
                {selectedServices.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedServices.map(s => (
                      <Badge key={s.id} variant="secondary" className="text-xs gap-1">
                        {s.name}
                        <button
                          type="button"
                          onClick={() => toggleServiceSelection(s.id)}
                          className="hover:text-destructive"
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Notes + Type + Summary */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4" /> Notes
                  </Label>
                  <Textarea
                    placeholder="Special instructions, preferences, allergies..."
                    value={newForm.notes}
                    onChange={(e) => setNewForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    <Tag className="h-4 w-4" /> Booking Type
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={newForm.type === 'booking' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setNewForm(prev => ({ ...prev, type: 'booking' }))}
                    >
                      <CalendarDays className="h-4 w-4 mr-1" /> Booking
                    </Button>
                    <Button
                      type="button"
                      variant={newForm.type === 'walk_in' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setNewForm(prev => ({ ...prev, type: 'walk_in' }))}
                    >
                      <User className="h-4 w-4 mr-1" /> Walk-in
                    </Button>
                  </div>
                </div>

                {/* Summary */}
                {selectedServices.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                    <p className="text-sm font-semibold">Appointment Summary</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Timer className="h-4 w-4" /> Total Duration
                      </span>
                      <span className="font-medium">{calculatedDuration} min</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-4 w-4" /> Total Amount
                      </span>
                      <span className="font-semibold text-emerald-600">{formatCurrency(calculatedTotal)}</span>
                    </div>
                    {newForm.startTime && calculatedEndTime && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-4 w-4" /> Time Slot
                        </span>
                        <span className="font-medium">{formatTime12(newForm.startTime)} — {formatTime12(calculatedEndTime)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowNewDialog(false); resetNewForm() }}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateAppointment}
                disabled={submitting || !newForm.customerId || !newForm.branchId || !newForm.staffId || !newForm.date || !newForm.startTime || newForm.serviceIds.length === 0}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Appointment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Summary Cards */}
      {loading ? (
        <StatusCardsSkeleton />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {STATUS_LIST.map(status => {
            const config = getStatusConfig(status)
            const isActive = statusFilter === status
            return (
              <Card
                key={status}
                className={cn('cursor-pointer transition-all hover:shadow-md', isActive && 'ring-2 ring-primary/50')}
                onClick={() => setStatusFilter(isActive ? 'all' : status)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', config.bgClass)}>
                      {config.icon}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{config.label}</p>
                      <p className="text-xl font-bold">{statusCounts[status]}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Filters */}
      {loading ? (
        <FiltersSkeleton />
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUS_LIST.map(s => (
                <SelectItem key={s} value={s}>{getStatusConfig(s).label}</SelectItem>
              ))}
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

          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateRange === 'custom' && (
            <>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-[150px]"
                placeholder="From"
              />
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-[150px]"
                placeholder="To"
              />
            </>
          )}
        </div>
      )}

      {/* Appointments Table */}
      {loading ? (
        <TableSkeleton />
      ) : appointments.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarDays className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-1">No appointments found</h3>
          <p className="text-sm">Try adjusting your filters or create a new appointment</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service(s)</TableHead>
                    <TableHead className="hidden md:table-cell">Staff</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="hidden lg:table-cell">Type</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map(apt => {
                    const statusConfig = getStatusConfig(apt.status)
                    const actions = getAvailableActions(apt.status)
                    const serviceNames = apt.services.map(s => s.service.name).join(', ')
                    const totalDuration = apt.services.reduce((sum, s) => sum + s.duration, 0)

                    return (
                      <TableRow key={apt.id}>
                        {/* Customer */}
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {apt.customer.firstName} {apt.customer.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {apt.customer.phone}
                            </p>
                          </div>
                        </TableCell>

                        {/* Services */}
                        <TableCell>
                          <p className="text-sm truncate max-w-[180px]" title={serviceNames}>
                            {serviceNames}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {totalDuration} min
                          </p>
                        </TableCell>

                        {/* Staff */}
                        <TableCell className="hidden md:table-cell">
                          <div>
                            <p className="text-sm font-medium">
                              {apt.staff.firstName} {apt.staff.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {apt.staff.role}
                              {apt.staff.specialization && ` · ${apt.staff.specialization}`}
                            </p>
                          </div>
                        </TableCell>

                        {/* Date & Time */}
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">
                              {format(parseISO(apt.date), 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime12(apt.startTime)} — {formatTime12(apt.endTime)}
                            </p>
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge className={cn('font-medium text-xs border', statusConfig.className)}>
                            {statusConfig.label}
                          </Badge>
                        </TableCell>

                        {/* Amount */}
                        <TableCell>
                          <span className="text-sm font-semibold">{formatCurrency(apt.totalAmount)}</span>
                        </TableCell>

                        {/* Type */}
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="outline" className="text-xs capitalize">
                            {apt.type === 'walk_in' ? 'Walk-in' : 'Booking'}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          {actions.length > 0 ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {actions.map(action => (
                                  <DropdownMenuItem
                                    key={action.action}
                                    onClick={() => handleStatusChange(apt.id, action.action)}
                                    className={cn('gap-2 cursor-pointer', action.className)}
                                  >
                                    {action.icon}
                                    {action.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results count */}
      {!loading && appointments.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {appointments.length} of {totalAppointments} appointments
        </p>
      )}
    </div>
  )
}
