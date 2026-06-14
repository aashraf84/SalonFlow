'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, UserCheck, UserX, AlertCircle, Loader2, Search,
  LogIn, LogOut, Calendar, BarChart3, Grid3X3, Filter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface StaffInfo {
  id: string
  firstName: string
  lastName: string
  role: string
  branch?: { id: string; name: string }
}

interface AttendanceData {
  id: string
  staffId: string
  branchId: string
  date: string
  clockIn: string | null
  clockOut: string | null
  status: string
  notes: string | null
  createdAt: string
  staff: StaffInfo
}

interface TodayStats {
  total: number
  present: number
  late: number
  absent: number
  halfDay: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'present':
      return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">Present</Badge>
    case 'absent':
      return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20">Absent</Badge>
    case 'late':
      return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20">Late</Badge>
    case 'half_day':
      return <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 hover:bg-sky-500/20">Half Day</Badge>
    default:
      return <Badge variant="outline" className="capitalize">{status}</Badge>
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AttendanceModule() {
  const [records, setRecords] = useState<AttendanceData[]>([])
  const [loading, setLoading] = useState(true)
  const [clockingId, setClockingId] = useState<string | null>(null)
  const [todayStats, setTodayStats] = useState<TodayStats>({ total: 0, present: 0, late: 0, absent: 0, halfDay: 0 })

  // Filters for history
  const [staffFilter, setStaffFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [activeTab, setActiveTab] = useState('today')

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('take', '100')
      if (staffFilter !== 'all') params.set('staffId', staffFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (dateFilter) params.set('date', dateFilter)

      const res = await fetch(`/api/attendance?${params}`)
      const json = await res.json()
      if (json.success) {
        setRecords(json.data)
        setTodayStats(json.todayStats)
      }
    } catch {
      toast.error('Failed to load attendance')
    } finally {
      setLoading(false)
    }
  }, [staffFilter, statusFilter, dateFilter])

  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  const handleClockIn = async (staffId: string) => {
    try {
      setClockingId(staffId)
      // Look up the staff member's branchId from existing records
      const staffRecord = records.find((r) => r.staffId === staffId)
      const branchId = staffRecord?.staff?.branch?.id
        || staffRecord?.branchId
        || records.find((r) => r.staff?.branch)?.staff?.branch?.id
        || 'default'
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, branchId }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Clocked in successfully')
        fetchAttendance()
      } else {
        toast.error(json.error || 'Failed to clock in')
      }
    } catch {
      toast.error('Failed to clock in')
    } finally {
      setClockingId(null)
    }
  }

  const handleClockOut = async (staffId: string) => {
    try {
      setClockingId(staffId)
      const res = await fetch('/api/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Clocked out successfully')
        fetchAttendance()
      } else {
        toast.error(json.error || 'Failed to clock out')
      }
    } catch {
      toast.error('Failed to clock out')
    } finally {
      setClockingId(null)
    }
  }

  // Unique staff for filter
  const staffList = useMemo(() => {
    const map = new Map<string, StaffInfo>()
    records.forEach((r) => {
      if (!map.has(r.staffId)) map.set(r.staffId, r.staff)
    })
    return Array.from(map.values())
  }, [records])

  // Group records for today's view
  const todayRecords = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return records.filter((r) => new Date(r.date).toISOString().split('T')[0] === today)
  }, [records])

  // Heatmap data: last 30 days
  const heatmapData = useMemo(() => {
    const days: { date: string; present: number; absent: number; late: number; halfDay: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayRecords = records.filter((r) => new Date(r.date).toISOString().split('T')[0] === dateStr)
      days.push({
        date: dateStr,
        present: dayRecords.filter((r) => r.status === 'present').length,
        absent: dayRecords.filter((r) => r.status === 'absent').length,
        late: dayRecords.filter((r) => r.status === 'late').length,
        halfDay: dayRecords.filter((r) => r.status === 'half_day').length,
      })
    }
    return days
  }, [records])

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Attendance</h2>
        <p className="text-sm text-muted-foreground">Track staff attendance and clock-in/out</p>
      </div>

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StaggerItem>
          <AnimatedMetricCard
            title="Total Today"
            value={todayStats.total.toString()}
            icon={Clock}
            iconBg="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Present"
            value={todayStats.present.toString()}
            icon={UserCheck}
            iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            accentGradient="from-emerald-500/20 to-green-500/20"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Late"
            value={todayStats.late.toString()}
            icon={AlertCircle}
            iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            accentGradient="from-amber-500/20 to-yellow-500/20"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Absent"
            value={todayStats.absent.toString()}
            icon={UserX}
            iconBg="bg-red-500/10 text-red-600 dark:text-red-400"
            accentGradient="from-red-500/20 to-rose-500/20"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Half Day"
            value={todayStats.halfDay.toString()}
            icon={Clock}
            iconBg="bg-sky-500/10 text-sky-600 dark:text-sky-400"
            accentGradient="from-sky-500/20 to-cyan-500/20"
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-foreground/[0.03]">
          <TabsTrigger value="today" className="gap-1.5">
            <Clock className="size-3.5" /> Today
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Calendar className="size-3.5" /> History
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="gap-1.5">
            <Grid3X3 className="size-3.5" /> Calendar
          </TabsTrigger>
        </TabsList>

        {/* Today's View */}
        <TabsContent value="today" className="mt-4">
          <GlassCard variant="default" className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50">
                    <TableHead className="text-xs font-semibold">Staff</TableHead>
                    <TableHead className="text-xs font-semibold">Role</TableHead>
                    <TableHead className="text-xs font-semibold">Clock In</TableHead>
                    <TableHead className="text-xs font-semibold">Clock Out</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : todayRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <Clock className="size-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No attendance records for today</p>
                        <p className="text-xs mt-1">Clock in to start tracking</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <AnimatePresence>
                      {todayRecords.map((record) => (
                        <motion.tr
                          key={record.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="border-b border-border/30 hover:bg-foreground/[0.02] transition-colors"
                        >
                          <TableCell className="font-medium text-sm">
                            {record.staff.firstName} {record.staff.lastName}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground capitalize">
                            {record.staff.role}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {formatTime(record.clockIn)}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {formatTime(record.clockOut)}
                          </TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              {!record.clockIn && (
                                <Button
                                  size="sm"
                                  className="h-8 gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white"
                                  disabled={clockingId === record.staffId}
                                  onClick={() => handleClockIn(record.staffId)}
                                >
                                  {clockingId === record.staffId ? <Loader2 className="size-3.5 animate-spin" /> : <LogIn className="size-3.5" />}
                                  Clock In
                                </Button>
                              )}
                              {record.clockIn && !record.clockOut && (
                                <Button
                                  size="sm"
                                  className="h-8 gap-1.5 bg-rose-500 hover:bg-rose-600 text-white"
                                  disabled={clockingId === record.staffId}
                                  onClick={() => handleClockOut(record.staffId)}
                                >
                                  {clockingId === record.staffId ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
                                  Clock Out
                                </Button>
                              )}
                              {record.clockIn && record.clockOut && (
                                <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30">
                                  Completed
                                </Badge>
                              )}
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
        </TabsContent>

        {/* History View */}
        <TabsContent value="history" className="mt-4 space-y-4">
          {/* Filters */}
          <GlassCard variant="flat" className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
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
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full sm:w-[160px]"
              />
            </div>
          </GlassCard>

          <GlassCard variant="default" className="overflow-hidden">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="border-b border-border/50">
                    <TableHead className="text-xs font-semibold">Staff</TableHead>
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold">Clock In</TableHead>
                    <TableHead className="text-xs font-semibold">Clock Out</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <Calendar className="size-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No attendance records found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <AnimatePresence>
                      {records.map((record) => (
                        <motion.tr
                          key={record.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="border-b border-border/30 hover:bg-foreground/[0.02] transition-colors"
                        >
                          <TableCell className="font-medium text-sm">
                            {record.staff.firstName} {record.staff.lastName}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(record.date)}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {formatTime(record.clockIn)}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {formatTime(record.clockOut)}
                          </TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                            {record.notes || '—'}
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  )}
                </TableBody>
              </Table>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Heatmap/Calendar View */}
        <TabsContent value="heatmap" className="mt-4 space-y-4">
          <GlassCard variant="default" className="p-6">
            <h3 className="text-sm font-semibold mb-4">30-Day Attendance Heatmap</h3>
            <div className="grid grid-cols-7 gap-2">
              {/* Day labels */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-[10px] font-semibold text-muted-foreground pb-2">
                  {day}
                </div>
              ))}
              {/* Fill empty cells for alignment */}
              {Array.from({ length: new Date(heatmapData[0]?.date || Date.now()).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {heatmapData.map((day) => {
                const total = day.present + day.late + day.halfDay
                const intensity = Math.min(total / 5, 1) // normalize
                return (
                  <motion.div
                    key={day.date}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      'aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] cursor-default transition-colors',
                      total === 0
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                        : intensity < 0.3
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                          : intensity < 0.7
                            ? 'bg-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                            : 'bg-emerald-500/60 text-white'
                    )}
                    title={`${day.date}: ${day.present} present, ${day.late} late, ${day.absent} absent, ${day.halfDay} half-day`}
                  >
                    <span className="font-bold">{new Date(day.date).getDate()}</span>
                    {total > 0 && <span>{total}</span>}
                  </motion.div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded bg-red-500/10" /> No attendance
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded bg-emerald-500/20" /> Low
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded bg-emerald-500/40" /> Medium
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded bg-emerald-500/60" /> High
              </div>
            </div>
          </GlassCard>

          {/* Monthly Summary */}
          <GlassCard variant="default" className="p-6">
            <h3 className="text-sm font-semibold mb-4">Monthly Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {records.filter((r) => r.status === 'present').length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Present</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {records.filter((r) => r.status === 'late').length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Late</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {records.filter((r) => r.status === 'absent').length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Absent</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-sky-500/5 border border-sky-500/10">
                <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                  {records.filter((r) => r.status === 'half_day').length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Half Day</p>
              </div>
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
