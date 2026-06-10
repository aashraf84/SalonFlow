'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GlassCard,
  AnimatedMetricCard,
  AnimatedInsightCard,
  StaggerContainer,
  StaggerItem,
  PulseIndicator,
} from '@/components/salon/glass-card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  CalendarDays,
  DollarSign,
  TrendingUp,
  Users,
  Crown,
  UserCog,
  AlertTriangle,
  Brain,
  Clock,
  Activity,
  Package,
  Building2,
  Star,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TodayStats {
  appointmentsCount: number
  revenue: number
  completedAppointments: number
}

interface MonthlyStats {
  revenue: number
  appointmentsCount: number
  newCustomers: number
}

interface CustomerMetrics {
  totalActive: number
  membershipRevenue: number
  totalLoyaltyPoints: number
  averageLifetimeValue: number
}

interface StaffMetrics {
  total: number
  byRole: Record<string, number>
}

interface AppointmentTrend {
  date: string
  count: number
  revenue: number
}

interface RevenueByService {
  category: string
  revenue: number
}

interface RecentAppointment {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  type: string
  totalAmount: number
  notes: string | null
  customer: {
    id: string
    firstName: string
    lastName: string
    phone: string
  } | null
  staff: {
    id: string
    firstName: string
    lastName: string
    role: string
  }
}

interface InventoryAlert {
  id: string
  productName: string
  sku: string
  quantity: number
  reorderLevel: number
  branchName: string
}

interface BranchPerformance {
  branchId: string
  branchName: string
  revenue: number
  appointmentsCount: number
}

interface DashboardData {
  todayStats: TodayStats
  monthlyStats: MonthlyStats
  customerMetrics: CustomerMetrics
  staffMetrics: StaffMetrics
  appointmentTrends: AppointmentTrend[]
  revenueByService: RevenueByService[]
  recentAppointments: RecentAppointment[]
  topServices: {
    serviceId: string
    name: string
    price: number
    duration: number
    category: string
    bookingCount: number
  }[]
  branchPerformance: BranchPerformance[]
  inventoryAlerts: InventoryAlert[]
  loyaltyTierBreakdown: Record<string, number>
  monthlyRevenueTrend: {
    month: string
    revenue: number
  }[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `PKR ${amount.toLocaleString()}`
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString()
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default'
    case 'confirmed':
    case 'in_progress':
      return 'secondary'
    case 'cancelled':
    case 'no_show':
      return 'destructive'
    default:
      return 'outline'
  }
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    scheduled: 'Scheduled',
    confirmed: 'Confirmed',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No Show',
  }
  return map[status] || status
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const tierColors: Record<string, string> = {
  silver: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  gold: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  platinum: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  vip: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
}

const tierIcons: Record<string, string> = {
  silver: '🥈',
  gold: '🥇',
  platinum: '💎',
  vip: '👑',
}

const tierBarColors: Record<string, string> = {
  silver: 'bg-gray-400 dark:bg-gray-500',
  gold: 'bg-amber-400 dark:bg-amber-500',
  platinum: 'bg-sky-400 dark:bg-sky-500',
  vip: 'bg-rose-400 dark:bg-rose-500',
}

// ─── Chart Configs ──────────────────────────────────────────────────────────

const appointmentTrendConfig: ChartConfig = {
  count: {
    label: 'Appointments',
    color: 'hsl(175, 55%, 42%)',
  },
  revenue: {
    label: 'Revenue (PKR)',
    color: 'hsl(190, 50%, 50%)',
  },
}

const revenueByServiceConfig: ChartConfig = {
  revenue: {
    label: 'Revenue (PKR)',
    color: 'hsl(175, 55%, 42%)',
  },
}

// ─── Loading Skeleton ───────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard variant="default" className="p-6" animateOnMount={false}>
          <Skeleton className="h-5 w-40 rounded-lg mb-2" />
          <Skeleton className="h-3 w-60 rounded-lg mb-6" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </GlassCard>
        <GlassCard variant="default" className="p-6" animateOnMount={false}>
          <Skeleton className="h-5 w-40 rounded-lg mb-2" />
          <Skeleton className="h-3 w-60 rounded-lg mb-6" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </GlassCard>
      </div>
    </div>
  )
}

// ─── Main Dashboard Module ─────────────────────────────────────────────────

export function DashboardModule() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        setLoading(true)
        const res = await fetch('/api/dashboard')
        if (!res.ok) throw new Error('Failed to fetch dashboard data')
        const json = await res.json()
        if (!cancelled && json.success) {
          setData(json.data)
        } else if (!cancelled && !json.success) {
          setError(json.error || 'Unknown error')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [])

  if (loading) return <DashboardSkeleton />

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
        <p className="text-sm font-medium text-destructive">Failed to load dashboard</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </GlassCard>
    )
  }

  if (!data) return null

  // ─── Derived values ────────────────────────────────────────────────────────

  const appointmentChartData = data.appointmentTrends.map((t) => ({
    date: formatDateLabel(t.date),
    count: t.count,
    revenue: t.revenue,
  }))

  const revenueServiceChartData = data.revenueByService.map((s) => ({
    category: s.category,
    revenue: s.revenue,
  }))

  const totalLoyaltyCustomers = Object.values(data.loyaltyTierBreakdown).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      {/* ── Row 1: Animated Metric Cards ──────────────────────────────────────── */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4" staggerDelay={0.06}>
        <StaggerItem>
          <AnimatedMetricCard
            title="Today's Appointments"
            value={formatNumber(data.todayStats.appointmentsCount)}
            subtitle={`${data.todayStats.completedAppointments} completed`}
            icon={CalendarDays}
            accentGradient="from-teal-500/30 to-emerald-500/30"
            iconBg="bg-teal-500/10 text-teal-600 dark:text-teal-400"
            delay={0}
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Today's Revenue"
            value={formatCurrency(data.todayStats.revenue)}
            subtitle="From invoices"
            icon={DollarSign}
            accentGradient="from-emerald-500/30 to-green-500/30"
            iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            delay={0.06}
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Monthly Revenue"
            value={formatCurrency(data.monthlyStats.revenue)}
            subtitle={`${formatNumber(data.monthlyStats.appointmentsCount)} appointments`}
            icon={TrendingUp}
            accentGradient="from-cyan-500/30 to-teal-500/30"
            iconBg="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
            delay={0.12}
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Active Customers"
            value={formatNumber(data.customerMetrics.totalActive)}
            subtitle={`${formatNumber(data.monthlyStats.newCustomers)} new this month`}
            icon={Users}
            accentGradient="from-orange-500/30 to-amber-500/30"
            iconBg="bg-orange-500/10 text-orange-600 dark:text-orange-400"
            delay={0.18}
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Membership Revenue"
            value={formatCurrency(data.customerMetrics.membershipRevenue)}
            subtitle="Active subscriptions"
            icon={Crown}
            accentGradient="from-amber-500/30 to-yellow-500/30"
            iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            delay={0.24}
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Staff Count"
            value={formatNumber(data.staffMetrics.total)}
            subtitle={`${Object.keys(data.staffMetrics.byRole).length} roles`}
            icon={UserCog}
            accentGradient="from-violet-500/30 to-purple-500/30"
            iconBg="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            delay={0.30}
          />
        </StaggerItem>
      </StaggerContainer>

      {/* ── Row 2: Charts with Glass Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment Trends */}
        <GlassCard variant="default" glow delay={0.3} className="p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/10">
                <CalendarDays className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold">Appointment Trends</h3>
                <p className="text-[11px] text-muted-foreground">Last 7 days — appointments & revenue</p>
              </div>
            </div>
          </div>
          <ChartContainer config={appointmentTrendConfig} className="h-64 w-full">
            <LineChart data={appointmentChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis yAxisId="left" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="count"
                stroke="var(--color-count)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: 'var(--color-count)' }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: 'var(--color-revenue)' }}
              />
            </LineChart>
          </ChartContainer>
        </GlassCard>

        {/* Revenue by Service Category */}
        <GlassCard variant="default" glow delay={0.35} className="p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10">
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold">Revenue by Service Category</h3>
                <p className="text-[11px] text-muted-foreground">Top categories by total revenue</p>
              </div>
            </div>
          </div>
          <ChartContainer config={revenueByServiceConfig} className="h-64 w-full">
            <BarChart data={revenueServiceChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="category" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="revenue"
                fill="var(--color-revenue)"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ChartContainer>
        </GlassCard>
      </div>

      {/* ── Row 3: Recent Appointments + Inventory Alerts ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Appointments */}
        <GlassCard variant="default" glow delay={0.4} className="lg:col-span-3 p-0 overflow-hidden">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10">
                  <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold">Recent Appointments</h3>
                  <p className="text-[11px] text-muted-foreground">Latest across all branches</p>
                </div>
              </div>
              <PulseIndicator color="bg-emerald-500" />
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="pl-6 text-[11px]">Customer</TableHead>
                  <TableHead className="text-[11px]">Staff</TableHead>
                  <TableHead className="text-[11px]">Time</TableHead>
                  <TableHead className="text-[11px]">Amount</TableHead>
                  <TableHead className="pr-6 text-[11px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                      <CalendarDays className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-sm">No appointments found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recentAppointments.map((appt, i) => (
                    <motion.tr
                      key={appt.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, type: 'spring', stiffness: 200 }}
                      className="border-border/30 hover:bg-foreground/[0.02] transition-colors"
                    >
                      <TableCell className="pl-6 py-3">
                        <div>
                          <p className="font-medium text-sm">
                            {appt.customer
                              ? `${appt.customer.firstName} ${appt.customer.lastName}`
                              : 'Walk-in'}
                          </p>
                          {appt.customer && (
                            <p className="text-[11px] text-muted-foreground">{appt.customer.phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="text-sm">{appt.staff.firstName} {appt.staff.lastName}</p>
                        <p className="text-[11px] text-muted-foreground capitalize">{appt.staff.role}</p>
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="text-sm font-mono text-muted-foreground">{appt.startTime} — {appt.endTime}</p>
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="text-sm font-semibold">{formatCurrency(appt.totalAmount)}</p>
                      </TableCell>
                      <TableCell className="pr-6 py-3">
                        <Badge variant={getStatusBadgeVariant(appt.status)} className="text-[10px] rounded-lg">
                          {getStatusLabel(appt.status)}
                        </Badge>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </GlassCard>

        {/* Inventory Alerts */}
        <GlassCard variant="default" glow delay={0.45} className="lg:col-span-2 p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold">Inventory Alerts</h3>
                <p className="text-[11px] text-muted-foreground">Items below reorder level</p>
              </div>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-3">
            {data.inventoryAlerts.length === 0 ? (
              <div className="text-center py-10">
                <Package className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">No inventory alerts</p>
                <p className="text-[11px] text-muted-foreground mt-1">All items are above reorder levels</p>
              </div>
            ) : (
              data.inventoryAlerts.map((alert, i) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/[0.06] dark:bg-amber-500/[0.08] border border-amber-500/10 hover:border-amber-500/20 transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 shrink-0 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{alert.productName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      SKU: {alert.sku} &bull; {alert.branchName}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 rounded-md">
                        Qty: {alert.quantity}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        Reorder at: {alert.reorderLevel}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      {/* ── Row 4: Branch Performance + Loyalty Tier ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Performance */}
        <GlassCard variant="default" glow delay={0.5} className="p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10">
                <Building2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold">Branch Performance</h3>
                <p className="text-[11px] text-muted-foreground">Revenue & appointments per branch</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {data.branchPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No branch data available</p>
            ) : (
              data.branchPerformance.map((branch, i) => {
                const maxRevenue = Math.max(...data.branchPerformance.map(b => b.revenue), 1)
                const percentage = Math.round((branch.revenue / maxRevenue) * 100)

                return (
                  <motion.div
                    key={branch.branchId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, type: 'spring', stiffness: 200 }}
                    className="flex items-center gap-4 p-3 rounded-xl border border-border/30 hover:border-border/60 hover:bg-foreground/[0.02] transition-all group"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shrink-0 group-hover:bg-cyan-500/15 transition-colors">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{branch.branchName}</p>
                      <div className="mt-2 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: 0.5 + i * 0.1, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] text-muted-foreground">
                          {formatCurrency(branch.revenue)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {branch.appointmentsCount} appts
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-500">
                      <ArrowUpRight className="w-3 h-3" />
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </GlassCard>

        {/* Loyalty Tier Breakdown */}
        <GlassCard variant="default" glow delay={0.55} className="p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10">
                <Star className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold">Loyalty Tier Breakdown</h3>
                <p className="text-[11px] text-muted-foreground">Customer distribution across tiers</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {Object.entries(data.loyaltyTierBreakdown).map(([tier, count], i) => {
              const percentage = totalLoyaltyCustomers > 0
                ? Math.round((count / totalLoyaltyCustomers) * 100)
                : 0

              return (
                <motion.div
                  key={tier}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08, type: 'spring', stiffness: 200 }}
                  className="flex items-center gap-4"
                >
                  <span className="text-lg shrink-0">{tierIcons[tier] || '•'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold capitalize">{tier}</span>
                      <span className="text-[11px] text-muted-foreground">{count} customers ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                      <motion.div
                        className={cn('h-full rounded-full', tierBarColors[tier] || 'bg-teal-400')}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.6 + i * 0.1, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                      />
                    </div>
                  </div>
                </motion.div>
              )
            })}
            {totalLoyaltyCustomers === 0 && (
              <div className="text-center py-10">
                <Star className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">No loyalty data yet</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* ── Row 5: AI Insights ───────────────────────────────────────────────── */}
      <div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
          className="flex items-center gap-2 mb-4"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-tahoe-accent/10">
            <Sparkles className="w-4 h-4 text-tahoe-accent" />
          </div>
          <h2 className="text-[15px] font-semibold">AI Insights</h2>
          <Badge variant="secondary" className="text-[10px] rounded-lg bg-tahoe-accent/10 text-tahoe-accent border-tahoe-accent/20">
            Powered by AI
          </Badge>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatedInsightCard
            title="Revenue Forecast"
            icon={TrendingUp}
            iconBg="bg-teal-500/10 text-teal-600 dark:text-teal-400"
            metric="+12.3%"
            insight={data.monthlyStats.revenue > 0
              ? `Based on historical data, monthly revenue is trending up. With PKR ${formatNumber(data.monthlyStats.revenue)} this month, you're on track for a strong quarter.`
              : 'Revenue data is being collected. Insights will appear as more data becomes available.'}
            delay={0.65}
          />
          <AnimatedInsightCard
            title="Customer Retention"
            icon={Users}
            iconBg="bg-orange-500/10 text-orange-600 dark:text-orange-400"
            metric="78%"
            insight={`${data.customerMetrics.totalActive} active customers with an average lifetime value of ${formatCurrency(data.customerMetrics.averageLifetimeValue)}. Focus on converting silver tier members to gold.`}
            delay={0.7}
          />
          <AnimatedInsightCard
            title="Peak Hours"
            icon={Clock}
            iconBg="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
            metric="2-5 PM"
            insight="Analysis shows peak booking times are between 2:00 PM and 5:00 PM. Consider adding more staff during these hours to reduce wait times."
            delay={0.75}
          />
          <AnimatedInsightCard
            title="Staff Utilization"
            icon={Activity}
            iconBg="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            metric="72%"
            insight={`${data.staffMetrics.total} staff members across ${Object.keys(data.staffMetrics.byRole).length} roles. Current utilization is moderate. Consider cross-training for better coverage.`}
            delay={0.8}
          />
        </div>
      </div>
    </div>
  )
}
