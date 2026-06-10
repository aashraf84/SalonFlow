'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Clock, UserCheck, UserX, Timer, Plus,
  Loader2, AlertTriangle, Edit2, Trash2, LogIn, LogOut,
  ChevronLeft, ChevronRight, MapPin, Users,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

interface Shift {
  id: string
  staffId: string
  staffName: string
  branchId: string
  branchName: string
  date: string
  startTime: string
  endTime: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
}

interface AttendanceRecord {
  id: string
  staffId: string
  staffName: string
  staffRole: string
  date: string
  clockIn: string | null
  clockOut: string | null
  hoursWorked: number | null
  status: 'on_time' | 'late' | 'absent' | 'on_leave'
}

interface StaffOption {
  id: string
  firstName: string
  lastName: string
  role: string
  branchId: string
}

interface BranchOption {
  id: string
  name: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `PKR ${amount.toLocaleString()}`
}

function formatTime12(time24: string): string {
  if (!time24) return '--'
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

function getDayName(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' })
}

function getShiftStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'scheduled':
      return { label: 'Scheduled', className: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800' }
    case 'in_progress':
      return { label: 'In Progress', className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' }
    case 'completed':
      return { label: 'Completed', className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' }
    case 'cancelled':
      return { label: 'Cancelled', className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' }
    default:
      return { label: status, className: 'bg-gray-100 text-gray-800 border-gray-200' }
  }
}

function getAttendanceBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'on_time':
      return { label: 'On Time', className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' }
    case 'late':
      return { label: 'Late', className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' }
    case 'absent':
      return { label: 'Absent', className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' }
    case 'on_leave':
      return { label: 'On Leave', className: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/30 dark:text-gray-300 dark:border-gray-700' }
    default:
      return { label: status, className: 'bg-gray-100 text-gray-800 border-gray-200' }
  }
}

function generateTimeSlots(): { value: string; label: string }[] {
  const slots: { value: string; label: string }[] = []
  for (let h = 7; h <= 22; h++) {
    for (const m of [0, 30]) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      slots.push({ value, label: formatTime12(value) })
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SchedulingSkeleton() {
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
      <GlassCard variant="default" className="p-6" animateOnMount={false}>
        <Skeleton className="h-8 w-64 rounded-lg mb-4" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-12 rounded" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SchedulingModule() {
  // Shifts state
  const [shifts, setShifts] = useState<Shift[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Reference data
  const [staffList, setStaffList] = useState<StaffOption[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0)
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  // Dialogs
  const [showShiftDialog, setShowShiftDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [shiftForm, setShiftForm] = useState({
    staffId: '',
    branchId: '',
    date: '',
    startTime: '',
    endTime: '',
  })

  // ─── Week helpers ───────────────────────────────────────────────────────────

  const weekDays = useMemo(() => {
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + 1 + weekOffset * 7)
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d.toISOString().split('T')[0]
    })
  }, [weekOffset])

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchShifts = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set('from', weekDays[0])
      params.set('to', weekDays[6])
      const res = await fetch(`/api/shifts?${params.toString()}`)
      const data = await res.json()
      if (data.success) setShifts(data.data)
    } catch (err) {
      console.error('Failed to fetch shifts:', err)
    }
  }, [weekDays])

  const fetchAttendance = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set('date', attendanceDate)
      const res = await fetch(`/api/attendance?${params.toString()}`)
      const data = await res.json()
      if (data.success) setAttendance(data.data)
    } catch (err) {
      console.error('Failed to fetch attendance:', err)
    }
  }, [attendanceDate])

  const fetchReferenceData = useCallback(async () => {
    try {
      const [staffRes, branchRes] = await Promise.all([
        fetch('/api/staff?take=100&status=active'),
        fetch('/api/branches'),
      ])
      const staffData = await staffRes.json()
      const branchData = await branchRes.json()
      if (staffData.success) {
        setStaffList(staffData.data.map((s: StaffOption & { id: string }) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          role: s.role,
          branchId: s.branchId,
        })))
      }
      if (branchData.success) setBranches(branchData.data)
    } catch (err) {
      console.error('Failed to fetch reference data:', err)
    }
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([fetchShifts(), fetchAttendance(), fetchReferenceData()])
    } catch {
      setError('Failed to load scheduling data')
    } finally {
      setLoading(false)
    }
  }, [fetchShifts, fetchAttendance, fetchReferenceData])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // ─── Computed ───────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const todayShifts = shifts.filter(s => s.date === today && s.status !== 'cancelled')
    const onDuty = attendance.filter(a => a.status === 'on_time' || a.status === 'late').length
    const onLeave = attendance.filter(a => a.status === 'on_leave').length
    const avgHours = attendance.length > 0
      ? attendance.filter(a => a.hoursWorked).reduce((sum, a) => sum + (a.hoursWorked || 0), 0) / Math.max(attendance.filter(a => a.hoursWorked).length, 1)
      : 0
    const shiftsThisWeek = shifts.filter(s => s.status !== 'cancelled').length
    return { onDuty, onLeave, avgHours: avgHours.toFixed(1), shiftsThisWeek }
  }, [shifts, attendance])

  // Group shifts by staff for weekly view
  const shiftsByStaffAndDay = useMemo(() => {
    const map: Record<string, Record<string, Shift[]>> = {}
    shifts.forEach(shift => {
      if (!map[shift.staffName]) map[shift.staffName] = {}
      if (!map[shift.staffName][shift.date]) map[shift.staffName][shift.date] = []
      map[shift.staffName][shift.date].push(shift)
    })
    return map
  }, [shifts])

  const staffNames = useMemo(() => Object.keys(shiftsByStaffAndDay), [shiftsByStaffAndDay])

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleCreateShift = async () => {
    if (!shiftForm.staffId || !shiftForm.branchId || !shiftForm.date || !shiftForm.startTime || !shiftForm.endTime) {
      toast.error('Please fill in all fields')
      return
    }
    setSubmitting(true)
    try {
      const staff = staffList.find(s => s.id === shiftForm.staffId)
      const branch = branches.find(b => b.id === shiftForm.branchId)
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: shiftForm.staffId,
          staffName: staff ? `${staff.firstName} ${staff.lastName}` : '',
          branchId: shiftForm.branchId,
          branchName: branch?.name || '',
          date: shiftForm.date,
          startTime: shiftForm.startTime,
          endTime: shiftForm.endTime,
          status: 'scheduled',
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Shift created successfully')
        setShowShiftDialog(false)
        resetShiftForm()
        fetchShifts()
      } else {
        toast.error(data.error || 'Failed to create shift')
      }
    } catch {
      toast.error('Failed to create shift')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteShift = async (id: string) => {
    try {
      const res = await fetch(`/api/shifts/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Shift deleted')
        fetchShifts()
      }
    } catch {
      toast.error('Failed to delete shift')
    }
  }

  const handleClockIn = async (staffId: string) => {
    try {
      const now = new Date()
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId,
          date: attendanceDate,
          clockIn: time,
          status: 'on_time',
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Clocked in successfully')
        fetchAttendance()
      }
    } catch {
      toast.error('Failed to clock in')
    }
  }

  const handleClockOut = async (recordId: string) => {
    try {
      const now = new Date()
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const res = await fetch(`/api/attendance/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clockOut: time }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Clocked out successfully')
        fetchAttendance()
      }
    } catch {
      toast.error('Failed to clock out')
    }
  }

  const resetShiftForm = () => {
    setShiftForm({ staffId: '', branchId: '', date: '', startTime: '', endTime: '' })
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <SchedulingSkeleton />

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
        <p className="text-sm font-medium text-destructive">Failed to load scheduling data</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={loadAll}>
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
            <Calendar className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Scheduling & Attendance</h2>
            <p className="text-sm text-muted-foreground">Manage shifts and track attendance</p>
          </div>
        </motion.div>
        <Button
          className="gap-2 bg-tahoe-accent hover:bg-tahoe-accent/90"
          onClick={() => setShowShiftDialog(true)}
        >
          <Plus className="h-4 w-4" />
          Create Shift
        </Button>
      </div>

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" staggerDelay={0.06}>
        <StaggerItem>
          <AnimatedMetricCard
            title="Staff On Duty"
            value={stats.onDuty.toString()}
            subtitle="Currently working"
            icon={UserCheck}
            accentGradient="from-rose-500/30 to-pink-500/30"
            iconBg="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="On Leave"
            value={stats.onLeave.toString()}
            subtitle="Today"
            icon={UserX}
            accentGradient="from-gray-500/30 to-slate-500/30"
            iconBg="bg-gray-500/10 text-gray-600 dark:text-gray-400"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Avg Hours Today"
            value={`${stats.avgHours}h`}
            subtitle="Per staff member"
            icon={Timer}
            accentGradient="from-pink-500/30 to-rose-500/30"
            iconBg="bg-pink-500/10 text-pink-600 dark:text-pink-400"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Shifts This Week"
            value={stats.shiftsThisWeek.toString()}
            subtitle="Total scheduled"
            icon={Calendar}
            accentGradient="from-emerald-500/30 to-green-500/30"
            iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Tabs */}
      <Tabs defaultValue="shifts" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="shifts" className="gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Shifts
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Attendance
          </TabsTrigger>
        </TabsList>

        {/* ── Shifts Tab ──────────────────────────────────────────────────────── */}
        <TabsContent value="shifts" className="space-y-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg"
                onClick={() => setWeekOffset(prev => prev - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                {formatDate(weekDays[0])} — {formatDate(weekDays[6])}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg"
                onClick={() => setWeekOffset(prev => prev + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {weekOffset !== 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[11px] h-8"
                  onClick={() => setWeekOffset(0)}
                >
                  Today
                </Button>
              )}
            </div>
          </div>

          {/* Weekly Shift Calendar */}
          <GlassCard variant="default" glow className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header Row */}
                <div className="grid grid-cols-8 border-b border-border/30">
                  <div className="p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-r border-border/30">
                    Staff
                  </div>
                  {weekDays.map(day => (
                    <div
                      key={day}
                      className={cn(
                        'p-3 text-center border-r border-border/30 last:border-r-0',
                        day === new Date().toISOString().split('T')[0] && 'bg-tahoe-accent/5'
                      )}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {getDayName(day)}
                      </p>
                      <p className="text-sm font-bold">{formatDate(day)}</p>
                    </div>
                  ))}
                </div>

                {/* Staff Rows */}
                {staffNames.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                    <p className="text-sm text-muted-foreground">No shifts scheduled this week</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Create a shift to get started</p>
                  </div>
                ) : (
                  staffNames.map((name, i) => (
                    <motion.div
                      key={name}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, type: 'spring', stiffness: 200 }}
                      className="grid grid-cols-8 border-b border-border/20 last:border-0"
                    >
                      <div className="p-3 text-sm font-medium border-r border-border/30 flex items-center">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-white text-[10px] font-bold shrink-0">
                            {name.charAt(0)}
                          </div>
                          <span className="truncate text-xs">{name}</span>
                        </div>
                      </div>
                      {weekDays.map(day => {
                        const dayShifts = shiftsByStaffAndDay[name]?.[day] || []
                        return (
                          <div
                            key={day}
                            className={cn(
                              'p-1.5 border-r border-border/30 last:border-r-0 min-h-[60px]',
                              day === new Date().toISOString().split('T')[0] && 'bg-tahoe-accent/[0.02]'
                            )}
                          >
                            {dayShifts.map(shift => {
                              const statusBadge = getShiftStatusBadge(shift.status)
                              return (
                                <div
                                  key={shift.id}
                                  className={cn(
                                    'p-1.5 rounded-lg text-[10px] mb-1 border',
                                    shift.status === 'in_progress'
                                      ? 'bg-amber-500/10 border-amber-500/20'
                                      : shift.status === 'completed'
                                      ? 'bg-emerald-500/10 border-emerald-500/20'
                                      : 'bg-muted/30 border-border/30'
                                  )}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">
                                      {formatTime12(shift.startTime).replace(' ', '')}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-4 w-4 p-0 hover:bg-red-500/10"
                                      onClick={() => handleDeleteShift(shift.id)}
                                    >
                                      <Trash2 className="h-2.5 w-2.5 text-red-400" />
                                    </Button>
                                  </div>
                                  <span className="text-muted-foreground">
                                    -{formatTime12(shift.endTime).replace(' ', '')}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* ── Attendance Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="attendance" className="space-y-4">
          {/* Date Filter */}
          <div className="flex items-center gap-3">
            <Label className="text-sm">Date:</Label>
            <Input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="w-[180px]"
            />
          </div>

          {/* Attendance Table */}
          <GlassCard variant="default" glow className="p-0 overflow-hidden">
            {attendance.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">No attendance records for this date</p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="pl-6 text-[11px]">Staff</TableHead>
                      <TableHead className="text-[11px]">Clock In</TableHead>
                      <TableHead className="text-[11px]">Clock Out</TableHead>
                      <TableHead className="text-[11px]">Hours</TableHead>
                      <TableHead className="text-[11px]">Status</TableHead>
                      <TableHead className="pr-6 text-[11px] w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record, i) => {
                      const attBadge = getAttendanceBadge(record.status)
                      const isToday = attendanceDate === new Date().toISOString().split('T')[0]
                      return (
                        <motion.tr
                          key={record.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03, type: 'spring', stiffness: 200 }}
                          className="border-border/30 hover:bg-foreground/[0.02] transition-colors"
                        >
                          <TableCell className="pl-6 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-white text-[10px] font-bold shrink-0">
                                {record.staffName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{record.staffName}</p>
                                <p className="text-[11px] text-muted-foreground capitalize">{record.staffRole}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <p className="text-sm font-mono">
                              {record.clockIn ? formatTime12(record.clockIn) : '--'}
                            </p>
                          </TableCell>
                          <TableCell className="py-3">
                            <p className="text-sm font-mono">
                              {record.clockOut ? formatTime12(record.clockOut) : '--'}
                            </p>
                          </TableCell>
                          <TableCell className="py-3">
                            <p className="text-sm font-semibold">
                              {record.hoursWorked ? `${record.hoursWorked.toFixed(1)}h` : '--'}
                            </p>
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge className={cn('text-[10px] rounded-lg border', attBadge.className)}>
                              {attBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="pr-6 py-3">
                            {isToday && (
                              <div className="flex items-center gap-1">
                                {!record.clockIn && record.status !== 'on_leave' && record.status !== 'absent' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-500/10"
                                    onClick={() => handleClockIn(record.staffId)}
                                  >
                                    <LogIn className="h-3 w-3" />
                                    Clock In
                                  </Button>
                                )}
                                {record.clockIn && !record.clockOut && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] gap-1 text-amber-600 border-amber-200 hover:bg-amber-500/10"
                                    onClick={() => handleClockOut(record.id)}
                                  >
                                    <LogOut className="h-3 w-3" />
                                    Clock Out
                                  </Button>
                                )}
                              </div>
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
        </TabsContent>
      </Tabs>

      {/* Create Shift Dialog */}
      <Dialog open={showShiftDialog} onOpenChange={(open) => { setShowShiftDialog(open); if (!open) resetShiftForm() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-tahoe-accent" />
              Create Shift
            </DialogTitle>
            <DialogDescription>Schedule a new shift for staff</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" /> Staff *
                </Label>
                <Select value={shiftForm.staffId} onValueChange={(v) => setShiftForm(prev => ({ ...prev, staffId: v }))}>
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
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Branch *
                </Label>
                <Select value={shiftForm.branchId} onValueChange={(v) => setShiftForm(prev => ({ ...prev, branchId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={shiftForm.date}
                onChange={(e) => setShiftForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Start Time *
                </Label>
                <Select value={shiftForm.startTime} onValueChange={(v) => setShiftForm(prev => ({ ...prev, startTime: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {TIME_SLOTS.map(slot => (
                      <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> End Time *
                </Label>
                <Select value={shiftForm.endTime} onValueChange={(v) => setShiftForm(prev => ({ ...prev, endTime: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {TIME_SLOTS.map(slot => (
                      <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowShiftDialog(false); resetShiftForm() }}>
              Cancel
            </Button>
            <Button
              className="bg-tahoe-accent hover:bg-tahoe-accent/90"
              onClick={handleCreateShift}
              disabled={submitting || !shiftForm.staffId || !shiftForm.branchId || !shiftForm.date || !shiftForm.startTime || !shiftForm.endTime}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
