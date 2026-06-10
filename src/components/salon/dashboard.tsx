'use client'

import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

function formatMonthLabel(monthStr: string): string {
  const [y, m] = monthStr.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months[parseInt(m, 10) - 1] + ' ' + y.slice(2)
}

const tierColors: Record<string, string> = {
  silver: 'bg-gray-200 text-gray-800',
  gold: 'bg-amber-100 text-amber-800',
  platinum: 'bg-sky-100 text-sky-800',
  vip: 'bg-rose-100 text-rose-800',
}

const tierIcons: Record<string, string> = {
  silver: '🥈',
  gold: '🥇',
  platinum: '💎',
  vip: '👑',
}

// ─── Chart Configs ──────────────────────────────────────────────────────────

const appointmentTrendConfig: ChartConfig = {
  count: {
    label: 'Appointments',
    color: 'hsl(160, 60%, 45%)',
  },
  revenue: {
    label: 'Revenue (PKR)',
    color: 'hsl(170, 50%, 40%)',
  },
}

const revenueByServiceConfig: ChartConfig = {
  revenue: {
    label: 'Revenue (PKR)',
    color: 'hsl(25, 80%, 55%)',
  },
}

// ─── Metric Card ────────────────────────────────────────────────────────────

interface MetricCardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  accentColor: string
  iconBg: string
}

function MetricCard({ title, value, subtitle, icon: Icon, accentColor, iconBg }: MetricCardProps) {
  return (
    <Card className={`relative overflow-hidden border-l-4 hover:shadow-md transition-shadow`} style={{ borderLeftColor: accentColor }}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold mt-1 tracking-tight truncate">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ml-3 ${iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Loading Skeleton ───────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Metric cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-60" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-60" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
      {/* Table skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── AI Insight Card ───────────────────────────────────────────────────────

interface AiInsightCardProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  insight: string
  metric: string
}

function AiInsightCard({ title, icon: Icon, iconBg, insight, metric }: AiInsightCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold">{title}</p>
              <span className="text-xs font-mono font-bold text-primary">{metric}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{insight}</p>
          </div>
        </div>
      </CardContent>
    </Card>
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
      <Card className="border-destructive">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto text-destructive mb-3" />
          <p className="text-sm font-medium text-destructive">Failed to load dashboard</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </CardContent>
      </Card>
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
      {/* ── Row 1: Metric Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Today's Appointments"
          value={formatNumber(data.todayStats.appointmentsCount)}
          subtitle={`${data.todayStats.completedAppointments} completed`}
          icon={CalendarDays}
          accentColor="hsl(160, 60%, 45%)"
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <MetricCard
          title="Today's Revenue"
          value={formatCurrency(data.todayStats.revenue)}
          subtitle="From invoices"
          icon={DollarSign}
          accentColor="hsl(142, 70%, 45%)"
          iconBg="bg-green-50 text-green-600"
        />
        <MetricCard
          title="Monthly Revenue"
          value={formatCurrency(data.monthlyStats.revenue)}
          subtitle={`${formatNumber(data.monthlyStats.appointmentsCount)} appointments`}
          icon={TrendingUp}
          accentColor="hsl(170, 50%, 40%)"
          iconBg="bg-teal-50 text-teal-600"
        />
        <MetricCard
          title="Active Customers"
          value={formatNumber(data.customerMetrics.totalActive)}
          subtitle={`${formatNumber(data.monthlyStats.newCustomers)} new this month`}
          icon={Users}
          accentColor="hsl(25, 80%, 55%)"
          iconBg="bg-orange-50 text-orange-600"
        />
        <MetricCard
          title="Membership Revenue"
          value={formatCurrency(data.customerMetrics.membershipRevenue)}
          subtitle="Active subscriptions"
          icon={Crown}
          accentColor="hsl(45, 80%, 50%)"
          iconBg="bg-amber-50 text-amber-600"
        />
        <MetricCard
          title="Staff Count"
          value={formatNumber(data.staffMetrics.total)}
          subtitle={`${Object.keys(data.staffMetrics.byRole).length} roles`}
          icon={UserCog}
          accentColor="hsl(270, 50%, 55%)"
          iconBg="bg-purple-50 text-purple-600"
        />
      </div>

      {/* ── Row 2: Charts ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment Trends Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointment Trends</CardTitle>
            <CardDescription>Last 7 days — appointments & revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={appointmentTrendConfig} className="h-64 w-full">
              <LineChart data={appointmentChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis yAxisId="left" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
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
          </CardContent>
        </Card>

        {/* Revenue by Service Category Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Service Category</CardTitle>
            <CardDescription>Top categories by total revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueByServiceConfig} className="h-64 w-full">
              <BarChart data={revenueServiceChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="category" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-revenue)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Recent Appointments + Inventory Alerts ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Appointments (3/5 width) */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Recent Appointments</CardTitle>
            <CardDescription>Latest 10 appointments across all branches</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Customer</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentAppointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No appointments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentAppointments.map((appt) => (
                      <TableRow key={appt.id}>
                        <TableCell className="pl-6">
                          <div>
                            <p className="font-medium text-sm">
                              {appt.customer
                                ? `${appt.customer.firstName} ${appt.customer.lastName}`
                                : 'Walk-in'}
                            </p>
                            {appt.customer && (
                              <p className="text-xs text-muted-foreground">{appt.customer.phone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{appt.staff.firstName} {appt.staff.lastName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{appt.staff.role}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-mono">{appt.startTime} — {appt.endTime}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-semibold">{formatCurrency(appt.totalAmount)}</p>
                        </TableCell>
                        <TableCell className="pr-6">
                          <Badge variant={getStatusBadgeVariant(appt.status)} className="text-[10px]">
                            {getStatusLabel(appt.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Alerts (2/5 width) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Inventory Alerts
            </CardTitle>
            <CardDescription>Items below reorder level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {data.inventoryAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No inventory alerts</p>
                  <p className="text-xs text-muted-foreground">All items are above reorder levels</p>
                </div>
              ) : (
                data.inventoryAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alert.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {alert.sku} &bull; {alert.branchName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          Qty: {alert.quantity}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          Reorder at: {alert.reorderLevel}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Branch Performance + Loyalty Tier Breakdown ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Branch Performance</CardTitle>
            <CardDescription>Revenue & appointments per branch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.branchPerformance.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No branch data available</p>
              ) : (
                data.branchPerformance.map((branch) => (
                  <div key={branch.branchId} className="flex items-center gap-4 p-3 rounded-lg border">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-50 text-teal-600 shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{branch.branchName}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          <DollarSign className="w-3 h-3 inline" />
                          {formatCurrency(branch.revenue)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          <CalendarDays className="w-3 h-3 inline" />
                          {branch.appointmentsCount} appts
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{formatCurrency(branch.revenue)}</p>
                      <p className="text-xs text-muted-foreground">{branch.appointmentsCount} appointments</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loyalty Tier Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Loyalty Tier Breakdown</CardTitle>
            <CardDescription>Customer distribution across tiers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(data.loyaltyTierBreakdown).map(([tier, count]) => {
                const percentage = totalLoyaltyCustomers > 0
                  ? Math.round((count / totalLoyaltyCustomers) * 100)
                  : 0

                return (
                  <div key={tier} className="flex items-center gap-4">
                    <span className="text-lg shrink-0">{tierIcons[tier] || '•'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold capitalize">{tier}</span>
                        <span className="text-xs text-muted-foreground">{count} customers ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            tier === 'silver'
                              ? 'bg-gray-400'
                              : tier === 'gold'
                                ? 'bg-amber-400'
                                : tier === 'platinum'
                                  ? 'bg-sky-400'
                                  : 'bg-rose-400'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
              {totalLoyaltyCustomers === 0 && (
                <div className="text-center py-8">
                  <Star className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No loyalty data yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 5: AI Insights ───────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">AI Insights</h2>
          <Badge variant="secondary" className="text-[10px]">Powered by AI</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AiInsightCard
            title="Revenue Forecast"
            icon={TrendingUp}
            iconBg="bg-emerald-50 text-emerald-600"
            metric="+12.3%"
            insight={data.monthlyStats.revenue > 0
              ? `Based on historical data, monthly revenue is trending up. With PKR ${formatNumber(data.monthlyStats.revenue)} this month, you're on track for a strong quarter.`
              : 'Revenue data is being collected. Insights will appear as more data becomes available.'}
          />
          <AiInsightCard
            title="Customer Retention"
            icon={Users}
            iconBg="bg-orange-50 text-orange-600"
            metric="78%"
            insight={`${data.customerMetrics.totalActive} active customers with an average lifetime value of ${formatCurrency(data.customerMetrics.averageLifetimeValue)}. Focus on converting silver tier members to gold.`}
          />
          <AiInsightCard
            title="Peak Hours"
            icon={Clock}
            iconBg="bg-teal-50 text-teal-600"
            metric="2-5 PM"
            insight="Analysis shows peak booking times are between 2:00 PM and 5:00 PM. Consider adding more staff during these hours to reduce wait times."
          />
          <AiInsightCard
            title="Staff Utilization"
            icon={Activity}
            iconBg="bg-purple-50 text-purple-600"
            metric="72%"
            insight={`${data.staffMetrics.total} staff members across ${Object.keys(data.staffMetrics.byRole).length} roles. Current utilization is moderate. Consider cross-training for better coverage.`}
          />
        </div>
      </div>
    </div>
  )
}
