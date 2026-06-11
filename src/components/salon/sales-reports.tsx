'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  BarChart3,
  CalendarDays,
  DollarSign,
  Users,
  Package,
  FileText,
  Download,
  Loader2,
  Printer,
  TrendingUp,
  ShoppingBag,
  Tag,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Scissors,
  UserCheck,
  Award,
  FileDown,
  Target,
  LayoutGrid,
  Layers,
  PieChart as PieChartIcon,
  Activity,
  Crown,
  Gem,
  Briefcase,
  Building2,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
  PieChart, Pie, Cell,
  AreaChart, Area,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  GlassCard,
  AnimatedMetricCard,
  StaggerContainer,
  StaggerItem,
} from '@/components/salon/glass-card'

// ─── Constants ────────────────────────────────────────────────────────────────

const PKR = (amount: number) => `PKR ${Math.round(amount).toLocaleString()}`

const CHART_COLORS = [
  'hsl(350, 80%, 55%)', // rose
  'hsl(142, 71%, 45%)', // green
  'hsl(38, 92%, 50%)',  // amber
  'hsl(199, 89%, 48%)', // cyan
  'hsl(271, 81%, 56%)', // purple
  'hsl(15, 90%, 55%)',  // orange
  'hsl(168, 74%, 44%)', // teal
  'hsl(328, 85%, 54%)', // pink
]

const TAB_CONFIG = [
  { value: 'overview', label: 'Overview', type: 'sales-summary', icon: LayoutGrid },
  { value: 'item-wise', label: 'Item-wise', type: 'sales-item', icon: Tag },
  { value: 'category', label: 'Category', type: 'sales-category', icon: Layers },
  { value: 'gross-profit', label: 'Gross Profit', type: 'sales-gross-profit', icon: TrendingUp },
  { value: 'cost-analysis', label: 'Cost Analysis', type: 'sales-cost', icon: Percent },
  { value: 'retail', label: 'Retail', type: 'sales-retail', icon: ShoppingBag },
  { value: 'salesperson', label: 'Salesperson', type: 'sales-salesperson', icon: UserCheck },
] as const

type TabValue = (typeof TAB_CONFIG)[number]['value']

// ─── Chart Configs ────────────────────────────────────────────────────────────

const overviewChartConfig: ChartConfig = {
  sales: { label: 'Sales', color: 'hsl(350, 80%, 55%)' },
  invoices: { label: 'Invoices', color: 'hsl(142, 71%, 45%)' },
  revenue: { label: 'Revenue', color: 'hsl(350, 80%, 55%)' },
  count: { label: 'Count', color: 'hsl(142, 71%, 45%)' },
}

const itemChartConfig: ChartConfig = {
  revenue: { label: 'Revenue', color: 'hsl(350, 80%, 55%)' },
  qty: { label: 'Qty Sold', color: 'hsl(142, 71%, 45%)' },
}

const categoryChartConfig: ChartConfig = {
  serviceRevenue: { label: 'Service Revenue', color: 'hsl(350, 80%, 55%)' },
  productRevenue: { label: 'Product Revenue', color: 'hsl(199, 89%, 48%)' },
  totalRevenue: { label: 'Total Revenue', color: 'hsl(38, 92%, 50%)' },
}

const gpChartConfig: ChartConfig = {
  revenue: { label: 'Revenue', color: 'hsl(350, 80%, 55%)' },
  cogs: { label: 'COGS', color: 'hsl(38, 92%, 50%)' },
  grossProfit: { label: 'Gross Profit', color: 'hsl(142, 71%, 45%)' },
  margin: { label: 'Margin %', color: 'hsl(271, 81%, 56%)' },
}

const costChartConfig: ChartConfig = {
  totalCost: { label: 'Total Cost', color: 'hsl(38, 92%, 50%)' },
  totalRevenue: { label: 'Total Revenue', color: 'hsl(142, 71%, 45%)' },
  cost: { label: 'Cost', color: 'hsl(38, 92%, 50%)' },
  revenue: { label: 'Revenue', color: 'hsl(350, 80%, 55%)' },
}

const retailChartConfig: ChartConfig = {
  retailRevenue: { label: 'Retail Revenue', color: 'hsl(350, 80%, 55%)' },
  serviceRevenue: { label: 'Service Revenue', color: 'hsl(142, 71%, 45%)' },
  retailQty: { label: 'Retail Qty', color: 'hsl(199, 89%, 48%)' },
}

const salespersonChartConfig: ChartConfig = {
  totalSales: { label: 'Total Sales', color: 'hsl(350, 80%, 55%)' },
  serviceSales: { label: 'Service Sales', color: 'hsl(142, 71%, 45%)' },
  productSales: { label: 'Product Sales', color: 'hsl(199, 89%, 48%)' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function marginColor(margin: number): string {
  if (margin >= 60) return 'text-emerald-600 dark:text-emerald-400'
  if (margin >= 30) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function marginBg(margin: number): string {
  if (margin >= 60) return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
  if (margin >= 30) return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
  return 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300'
}

function exportCSV(data: Record<string, unknown>[], filename: string) {
  if (!data || data.length === 0) { toast.error('No data to export'); return }
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((h) => {
        const val = (row as Record<string, unknown>)[h]
        const str = val === null || val === undefined ? '' : String(val)
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',')
    ),
  ].join('\n')
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  toast.success('CSV exported successfully')
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SalesReportsModule() {
  const [activeTab, setActiveTab] = useState<TabValue>('overview')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [branchId, setBranchId] = useState<string>('all')
  const [itemType, setItemType] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const currentTab = TAB_CONFIG.find((t) => t.value === activeTab)

  const fetchReport = useCallback(async () => {
    if (!currentTab) return
    setLoading(true)
    setReportData(null)
    try {
      const params = new URLSearchParams()
      params.set('type', currentTab.type)
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      if (itemType && itemType !== 'all') params.set('itemType', itemType)
      if (branchId && branchId !== 'all') params.set('branchId', branchId)
      const res = await fetch(`/api/sales-reports?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setReportData(json.data)
      } else {
        toast.error(json.error || 'Failed to load report')
      }
    } catch (err) {
      console.error('Sales report fetch error:', err)
      toast.error('Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [currentTab, dateFrom, dateTo, itemType, branchId])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const win = window.open('', '_blank')
    if (!win) { toast.error('Please allow popups to print'); return }
    win.document.write(`
      <!DOCTYPE html><html><head>
      <title>Sales Report — SalonFlow OS</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        @page { size: A4; margin: 15mm 12mm 20mm 12mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; color: #1a1a2e; font-size: 11px; line-height: 1.5; background: white; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e11d48; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { font-size: 16px; font-weight: 700; }
        .header .subtitle { font-size: 9px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
        th { background: #f8f8f8; border-bottom: 2px solid #ddd; padding: 8px 6px; text-align: left; font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { border-bottom: 1px solid #eee; padding: 7px 6px; }
        .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .metric { background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 12px; }
        .metric .label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
        .metric .value { font-size: 16px; font-weight: 700; margin-top: 4px; }
        @media print { .no-print { display: none !important; } }
      </style></head><body>
      <div class="header">
        <div><h1>SalonFlow OS — ${currentTab?.label || 'Sales'} Report</h1><div class="subtitle">ApexFlow Ecosystem</div></div>
        <div style="text-align:right"><div class="subtitle">Period: ${dateFrom} to ${dateTo}</div><div class="subtitle">Generated: ${new Date().toLocaleString()}</div></div>
      </div>
      ${content.innerHTML}
      </body></html>
    `)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  const handleExportCSV = () => {
    if (!reportData || !currentTab) return
    const details = reportData.details as Record<string, unknown>
    // Try to find a table-worthy array from details
    const arr = Object.values(details).find((v) => Array.isArray(v) && v.length > 0) as Record<string, unknown>[] | undefined
    if (!arr) { toast.error('No tabular data to export'); return }
    exportCSV(arr, `sales-${currentTab.value}-report-${dateFrom}-to-${dateTo}.csv`)
  }

  // ─── Tab Change Handler ──────────────────────────────────────────────
  const handleTabChange = (val: string) => {
    setActiveTab(val as TabValue)
    setReportData(null)
  }

  // ─── Render Helpers ──────────────────────────────────────────────────

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      <p className="text-sm text-muted-foreground">Loading report data...</p>
    </div>
  )

  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <BarChart3 className="h-12 w-12 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">No data available for the selected period</p>
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════
  // TAB 1: OVERVIEW
  // ═══════════════════════════════════════════════════════════════════════

  const renderOverview = () => {
    if (!reportData) return renderEmpty()
    const s = reportData.summary as Record<string, unknown>
    const c = reportData.charts as Record<string, unknown>

    const dailyTrend = (c.dailyTrend || {}) as Record<string, { sales: number; invoices: number }>
    const dailyChartData = Object.entries(dailyTrend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({ date, sales: Math.round(d.sales), invoices: d.invoices }))

    const salesByType = (c.salesByTypeDistribution || []) as { type: string; revenue: number; count: number; percentage: number }[]
    const paymentMethods = (c.paymentMethodDistribution || []) as { method: string; revenue: number; count: number; percentage: number }[]
    const top10 = (c.top10Items || []) as { name: string; type: string; qty: number; revenue: number }[]

    return (
      <div className="space-y-6" ref={printRef}>
        {/* Metrics */}
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <StaggerItem><AnimatedMetricCard title="Total Sales" value={PKR(s.totalSales as number || 0)} icon={DollarSign} accentGradient="from-rose-500/20 to-pink-500/20" iconBg="bg-rose-500/10 text-rose-600" delay={0} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Net Sales" value={PKR(s.netSales as number || 0)} icon={TrendingUp} accentGradient="from-emerald-500/20 to-green-500/20" iconBg="bg-emerald-500/10 text-emerald-600" delay={0.05} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Gross Profit" value={PKR(s.grossProfit as number || 0)} icon={ArrowUpRight} accentGradient="from-teal-500/20 to-cyan-500/20" iconBg="bg-teal-500/10 text-teal-600" delay={0.1} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="GP Margin" value={`${(s.grossProfitMargin as number || 0).toFixed(1)}%`} icon={Percent} accentGradient="from-purple-500/20 to-violet-500/20" iconBg="bg-purple-500/10 text-purple-600" delay={0.15} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Avg Order" value={PKR(s.avgOrderValue as number || 0)} icon={Target} accentGradient="from-amber-500/20 to-orange-500/20" iconBg="bg-amber-500/10 text-amber-600" delay={0.2} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Items Sold" value={(s.totalItemsSold as number || 0).toLocaleString()} icon={Package} accentGradient="from-cyan-500/20 to-sky-500/20" iconBg="bg-cyan-500/10 text-cyan-600" delay={0.25} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Invoices" value={(s.totalInvoices as number || 0).toLocaleString()} icon={FileText} accentGradient="from-pink-500/20 to-rose-500/20" iconBg="bg-pink-500/10 text-pink-600" delay={0.3} /></StaggerItem>
        </StaggerContainer>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily Sales Trend */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Daily Sales Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {dailyChartData.length > 0 ? (
                  <ChartContainer config={overviewChartConfig} className="h-[280px] w-full">
                    <AreaChart data={dailyChartData} accessibilityLayer>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="sales" stroke="hsl(350, 80%, 55%)" fill="hsl(350, 80%, 55%)" fillOpacity={0.15} strokeWidth={2} />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No trend data</div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Sales by Type */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Sales by Type</CardTitle>
              </CardHeader>
              <CardContent>
                {salesByType.length > 0 ? (
                  <ChartContainer config={overviewChartConfig} className="h-[280px] w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie data={salesByType} dataKey="revenue" nameKey="type" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}>
                        {salesByType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No type data</div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Payment Method Breakdown */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Payment Method Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentMethods.length > 0 ? (
                  <ChartContainer config={overviewChartConfig} className="h-[280px] w-full">
                    <BarChart data={paymentMethods} accessibilityLayer>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="method" tickLine={false} axisLine={false} fontSize={10} />
                      <YAxis tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="hsl(350, 80%, 55%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No payment data</div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Top 10 Items */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Top 10 Selling Items</CardTitle>
              </CardHeader>
              <CardContent>
                {top10.length > 0 ? (
                  <ChartContainer config={itemChartConfig} className="h-[280px] w-full">
                    <BarChart data={top10} layout="vertical" accessibilityLayer>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={9} width={100} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="hsl(350, 80%, 55%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No item data</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Table */}
        {top10.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Top Selling Items</CardTitle>
                <CardDescription className="text-xs">Top 10 items by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">#</TableHead>
                        <TableHead className="text-[10px]">Item Name</TableHead>
                        <TableHead className="text-[10px]">Type</TableHead>
                        <TableHead className="text-[10px] text-right">Qty Sold</TableHead>
                        <TableHead className="text-[10px] text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {top10.map((item, idx) => (
                        <TableRow key={idx} className={idx < 3 ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''}>
                          <TableCell className="text-xs py-2 font-mono">
                            {idx < 3 ? (
                              <Badge className="h-5 w-5 p-0 text-[10px] justify-center bg-gradient-to-r from-rose-500 to-pink-600 text-white border-0">{idx + 1}</Badge>
                            ) : idx + 1}
                          </TableCell>
                          <TableCell className="text-xs py-2 font-medium">{item.name}</TableCell>
                          <TableCell className="text-xs py-2">
                            <Badge variant="outline" className={item.type === 'service' ? 'border-rose-200 text-rose-600 dark:border-rose-800' : 'border-cyan-200 text-cyan-600 dark:border-cyan-800'}>
                              {item.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs py-2 text-right">{item.qty}</TableCell>
                          <TableCell className="text-xs py-2 text-right font-semibold">{PKR(item.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TAB 2: ITEM-WISE
  // ═══════════════════════════════════════════════════════════════════════

  const renderItemWise = () => {
    if (!reportData) return renderEmpty()
    const s = reportData.summary as Record<string, unknown>
    const c = reportData.charts as Record<string, unknown>
    const d = reportData.details as Record<string, unknown>

    const items = (d.items || []) as { name: string; type: string; category: string; qtySold: number; unitPrice: number; totalRevenue: number; percentageOfTotal: number; avgDiscount: number }[]
    const top20 = (c.top20Items || []) as { name: string; revenue: number; qty: number; type: string }[]
    const revenueByType = (c.revenueByType || []) as { type: string; revenue: number }[]

    return (
      <div className="space-y-6" ref={printRef}>
        {/* Item Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Filter:</span>
          <Select value={itemType} onValueChange={setItemType}>
            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="service">Services</SelectItem>
              <SelectItem value="product">Products</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Metrics */}
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StaggerItem><AnimatedMetricCard title="Total Items" value={(s.totalItems as number || 0).toLocaleString()} icon={Tag} iconBg="bg-rose-500/10 text-rose-600" delay={0} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Total Revenue" value={PKR(s.totalRevenue as number || 0)} icon={DollarSign} iconBg="bg-emerald-500/10 text-emerald-600" delay={0.05} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Avg Unit Price" value={PKR(s.avgItemRevenue as number || 0)} icon={Target} iconBg="bg-amber-500/10 text-amber-600" delay={0.1} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Top Revenue" value={items.length > 0 ? PKR(items[0].totalRevenue) : 'N/A'} icon={Crown} iconBg="bg-purple-500/10 text-purple-600" delay={0.15} /></StaggerItem>
        </StaggerContainer>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top 20 Items by Revenue</CardTitle></CardHeader>
              <CardContent>
                {top20.length > 0 ? (
                  <ChartContainer config={itemChartConfig} className="h-[320px] w-full">
                    <BarChart data={top20} layout="vertical" accessibilityLayer>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={9} width={110} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="hsl(350, 80%, 55%)" radius={[0, 4, 4, 0]}>
                        {top20.map((_, i) => <Cell key={i} fill={i < 3 ? 'hsl(350, 80%, 55%)' : CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : <div className="flex items-center justify-center h-[320px] text-muted-foreground text-sm">No data</div>}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Service vs Product Revenue</CardTitle></CardHeader>
              <CardContent>
                {revenueByType.length > 0 ? (
                  <ChartContainer config={{
                    service: { label: 'Service', color: 'hsl(350, 80%, 55%)' },
                    product: { label: 'Product', color: 'hsl(199, 89%, 48%)' },
                  }} className="h-[320px] w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie data={revenueByType} dataKey="revenue" nameKey="type" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                        {revenueByType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ChartContainer>
                ) : <div className="flex items-center justify-center h-[320px] text-muted-foreground text-sm">No data</div>}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Table */}
        {items.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Item-wise Sales Breakdown</CardTitle>
                <CardDescription className="text-xs">{items.length} items sorted by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">#</TableHead>
                        <TableHead className="text-[10px]">Item Name</TableHead>
                        <TableHead className="text-[10px]">Type</TableHead>
                        <TableHead className="text-[10px]">Category</TableHead>
                        <TableHead className="text-[10px] text-right">Qty Sold</TableHead>
                        <TableHead className="text-[10px] text-right">Unit Price</TableHead>
                        <TableHead className="text-[10px] text-right">Total Revenue</TableHead>
                        <TableHead className="text-[10px] text-right">% of Sales</TableHead>
                        <TableHead className="text-[10px] text-right">Avg Discount</TableHead>
                        <TableHead className="text-[10px]">Label</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow key={idx} className={idx < 3 ? 'bg-rose-50/50 dark:bg-rose-950/20' : idx >= items.length - 3 ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}>
                          <TableCell className="text-xs py-2 font-mono">
                            {idx < 3 ? <Badge className="h-5 w-5 p-0 text-[10px] justify-center bg-gradient-to-r from-rose-500 to-pink-600 text-white border-0">{idx + 1}</Badge> : idx + 1}
                          </TableCell>
                          <TableCell className="text-xs py-2 font-medium max-w-[180px] truncate">{item.name}</TableCell>
                          <TableCell className="text-xs py-2">
                            <Badge variant="outline" className={item.type === 'service' ? 'border-rose-200 text-rose-600 dark:border-rose-800' : 'border-cyan-200 text-cyan-600 dark:border-cyan-800'}>
                              {item.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs py-2 text-muted-foreground">{item.category}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{item.qtySold}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{PKR(item.unitPrice)}</TableCell>
                          <TableCell className="text-xs py-2 text-right font-semibold">{PKR(item.totalRevenue)}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{item.percentageOfTotal.toFixed(1)}%</TableCell>
                          <TableCell className="text-xs py-2 text-right">{PKR(item.avgDiscount)}</TableCell>
                          <TableCell className="text-xs py-2">
                            {idx === 0 && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-0 text-[9px]">Top Performer</Badge>}
                            {idx === items.length - 1 && items.length > 3 && <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-0 text-[9px]">Bottom Performer</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TAB 3: CATEGORY
  // ═══════════════════════════════════════════════════════════════════════

  const renderCategory = () => {
    if (!reportData) return renderEmpty()
    const s = reportData.summary as Record<string, unknown>
    const c = reportData.charts as Record<string, unknown>
    const d = reportData.details as Record<string, unknown>

    const serviceCats = (d.serviceCategories || []) as { categoryName: string; totalSold: number; revenue: number; avgPrice: number; percentageOfServiceRevenue: number }[]
    const productCats = (d.productCategories || []) as { categoryName: string; totalSold: number; revenue: number; avgPrice: number; percentageOfProductRevenue: number; avgMargin: number }[]
    const combined = (c.combinedComparison || []) as { name: string; serviceRevenue: number; productRevenue: number; totalRevenue: number }[]
    const svcDist = (c.serviceCategoryDistribution || []) as { name: string; value: number; percentage: number }[]
    const prodDist = (c.productCategoryDistribution || []) as { name: string; value: number; percentage: number }[]

    return (
      <div className="space-y-6" ref={printRef}>
        {/* Metrics */}
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StaggerItem><AnimatedMetricCard title="Total Categories" value={(serviceCats.length + productCats.length).toString()} icon={Layers} iconBg="bg-rose-500/10 text-rose-600" delay={0} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Service Categories" value={serviceCats.length.toString()} icon={Scissors} iconBg="bg-purple-500/10 text-purple-600" delay={0.05} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Product Categories" value={productCats.length.toString()} icon={Package} iconBg="bg-cyan-500/10 text-cyan-600" delay={0.1} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Avg Category Revenue" value={PKR(s.combinedRevenue as number && (serviceCats.length + productCats.length) > 0 ? (s.combinedRevenue as number) / (serviceCats.length + productCats.length) : 0)} icon={Activity} iconBg="bg-amber-500/10 text-amber-600" delay={0.15} /></StaggerItem>
        </StaggerContainer>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-border/50 h-full">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Service Category Revenue</CardTitle></CardHeader>
              <CardContent>
                {svcDist.length > 0 ? (
                  <ChartContainer config={{ value: { label: 'Revenue', color: 'hsl(350, 80%, 55%)' } }} className="h-[260px] w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie data={svcDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={2}>
                        {svcDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ChartContainer>
                ) : <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">No service categories</div>}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-border/50 h-full">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Product Category Revenue</CardTitle></CardHeader>
              <CardContent>
                {prodDist.length > 0 ? (
                  <ChartContainer config={{ value: { label: 'Revenue', color: 'hsl(199, 89%, 48%)' } }} className="h-[260px] w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie data={prodDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={2}>
                        {prodDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />)}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ChartContainer>
                ) : <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">No product categories</div>}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-border/50 h-full">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Category Comparison</CardTitle></CardHeader>
              <CardContent>
                {combined.length > 0 ? (
                  <ChartContainer config={categoryChartConfig} className="h-[260px] w-full">
                    <BarChart data={combined} layout="vertical" accessibilityLayer>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={9} width={100} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="serviceRevenue" stackId="a" fill="hsl(350, 80%, 55%)" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="productRevenue" stackId="a" fill="hsl(199, 89%, 48%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">No comparison data</div>}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Service Categories Table */}
        {serviceCats.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><Scissors className="h-4 w-4 text-rose-500" />Service Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Category Name</TableHead>
                        <TableHead className="text-[10px] text-right">Items Sold</TableHead>
                        <TableHead className="text-[10px] text-right">Revenue</TableHead>
                        <TableHead className="text-[10px] text-right">Avg Price</TableHead>
                        <TableHead className="text-[10px] text-right">% of Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceCats.map((cat, idx) => (
                        <TableRow key={idx} className={idx === 0 ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''}>
                          <TableCell className="text-xs py-2 font-medium">{cat.categoryName}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{cat.totalSold}</TableCell>
                          <TableCell className="text-xs py-2 text-right font-semibold">{PKR(cat.revenue)}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{PKR(cat.avgPrice)}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{cat.percentageOfServiceRevenue.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Product Categories Table */}
        {productCats.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><Package className="h-4 w-4 text-cyan-500" />Product Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Category Name</TableHead>
                        <TableHead className="text-[10px] text-right">Items Sold</TableHead>
                        <TableHead className="text-[10px] text-right">Revenue</TableHead>
                        <TableHead className="text-[10px] text-right">Avg Price</TableHead>
                        <TableHead className="text-[10px] text-right">% of Revenue</TableHead>
                        <TableHead className="text-[10px] text-right">Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productCats.map((cat, idx) => (
                        <TableRow key={idx} className={idx === 0 ? 'bg-cyan-50/50 dark:bg-cyan-950/20' : ''}>
                          <TableCell className="text-xs py-2 font-medium">{cat.categoryName}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{cat.totalSold}</TableCell>
                          <TableCell className="text-xs py-2 text-right font-semibold">{PKR(cat.revenue)}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{PKR(cat.avgPrice)}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{cat.percentageOfProductRevenue.toFixed(1)}%</TableCell>
                          <TableCell className="text-xs py-2 text-right">
                            <Badge className={`${marginBg(cat.avgMargin)} border-0 text-[10px]`}>{cat.avgMargin.toFixed(1)}%</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TAB 4: GROSS PROFIT
  // ═══════════════════════════════════════════════════════════════════════

  const renderGrossProfit = () => {
    if (!reportData) return renderEmpty()
    const s = reportData.summary as Record<string, unknown>
    const c = reportData.charts as Record<string, unknown>
    const d = reportData.details as Record<string, unknown>

    const monthlyGP = (c.monthlyGPTrend || []) as { month: string; revenue: number; cogs: number; grossProfit: number; margin: number }[]
    const revenueByType = (c.revenueByType || []) as { type: string; revenue: number; gp: number; margin: number }[]
    const productGP = (d.productGPBreakdown || []) as { name: string; revenue: number; cost: number; grossProfit: number; margin: number }[]
    const serviceGP = (d.serviceGPBreakdown || []) as { name: string; revenue: number; grossProfit: number; margin: number; qty: number }[]

    return (
      <div className="space-y-6" ref={printRef}>
        {/* Metrics */}
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StaggerItem><AnimatedMetricCard title="Total Revenue" value={PKR(s.totalRevenue as number || 0)} icon={DollarSign} iconBg="bg-rose-500/10 text-rose-600" delay={0} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Total COGS" value={PKR(s.totalCOGS as number || 0)} icon={ArrowDownRight} accentGradient="from-amber-500/20 to-orange-500/20" iconBg="bg-amber-500/10 text-amber-600" delay={0.05} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Gross Profit" value={PKR(s.totalGP as number || 0)} icon={TrendingUp} iconBg="bg-emerald-500/10 text-emerald-600" delay={0.1} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="GP Margin" value={`${(s.totalGPMargin as number || 0).toFixed(1)}%`} icon={Percent} iconBg="bg-purple-500/10 text-purple-600" delay={0.15} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Service Revenue" value={PKR(s.serviceRevenue as number || 0)} icon={Scissors} iconBg="bg-rose-500/10 text-rose-500" delay={0.2} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Product Revenue" value={PKR(s.productRevenue as number || 0)} icon={Package} iconBg="bg-cyan-500/10 text-cyan-600" delay={0.25} /></StaggerItem>
        </StaggerContainer>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Monthly Gross Profit Trend</CardTitle></CardHeader>
              <CardContent>
                {monthlyGP.length > 0 ? (
                  <ChartContainer config={gpChartConfig} className="h-[300px] w-full">
                    <AreaChart data={monthlyGP} accessibilityLayer>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={10} />
                      <YAxis tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(350, 80%, 55%)" fill="hsl(350, 80%, 55%)" fillOpacity={0.1} strokeWidth={2} />
                      <Area type="monotone" dataKey="cogs" stroke="hsl(38, 92%, 50%)" fill="hsl(38, 92%, 50%)" fillOpacity={0.1} strokeWidth={2} />
                      <Area type="monotone" dataKey="grossProfit" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.1} strokeWidth={2} />
                      <Legend />
                    </AreaChart>
                  </ChartContainer>
                ) : <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">No trend data</div>}
              </CardContent>
            </Card>
          </motion.div>

          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Revenue by Type</CardTitle></CardHeader>
                <CardContent>
                  {revenueByType.length > 0 ? (
                    <ChartContainer config={gpChartConfig} className="h-[130px] w-full">
                      <BarChart data={revenueByType} accessibilityLayer>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="type" tickLine={false} axisLine={false} fontSize={10} />
                        <YAxis tickLine={false} axisLine={false} fontSize={9} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="revenue" fill="hsl(350, 80%, 55%)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="gp" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  ) : <div className="flex items-center justify-center h-[130px] text-muted-foreground text-sm">No data</div>}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">GP Margin by Type</CardTitle></CardHeader>
                <CardContent>
                  {revenueByType.length > 0 ? (
                    <ChartContainer config={{ margin: { label: 'Margin %', color: 'hsl(271, 81%, 56%)' } }} className="h-[130px] w-full">
                      <BarChart data={revenueByType} layout="vertical" accessibilityLayer>
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                        <XAxis type="number" tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${v}%`} />
                        <YAxis type="category" dataKey="type" tickLine={false} axisLine={false} fontSize={10} width={80} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="margin" radius={[0, 4, 4, 0]}>
                          {revenueByType.map((entry, i) => <Cell key={i} fill={entry.margin >= 60 ? 'hsl(142, 71%, 45%)' : entry.margin >= 30 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 84%, 60%)'} />)}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  ) : <div className="flex items-center justify-center h-[130px] text-muted-foreground text-sm">No data</div>}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Product GP Table */}
        {productGP.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><Package className="h-4 w-4 text-cyan-500" />Product Gross Profit Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Product Name</TableHead>
                        <TableHead className="text-[10px] text-right">Revenue</TableHead>
                        <TableHead className="text-[10px] text-right">Cost</TableHead>
                        <TableHead className="text-[10px] text-right">Gross Profit</TableHead>
                        <TableHead className="text-[10px] text-right">Margin %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productGP.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs py-2 font-medium max-w-[200px] truncate">{item.name}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{PKR(item.revenue)}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{PKR(item.cost)}</TableCell>
                          <TableCell className="text-xs py-2 text-right font-semibold">{PKR(item.grossProfit)}</TableCell>
                          <TableCell className="text-xs py-2 text-right">
                            <Badge className={`${marginBg(item.margin)} border-0 text-[10px]`}>{item.margin.toFixed(1)}%</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Service GP Table */}
        {serviceGP.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><Scissors className="h-4 w-4 text-rose-500" />Service Contribution (Pure Margin)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Service Name</TableHead>
                        <TableHead className="text-[10px] text-right">Revenue</TableHead>
                        <TableHead className="text-[10px] text-right">% of Service Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceGP.map((item, idx) => {
                        const totalSvcRev = serviceGP.reduce((sum, s) => sum + s.revenue, 0)
                        const pct = totalSvcRev > 0 ? (item.revenue / totalSvcRev) * 100 : 0
                        return (
                          <TableRow key={idx} className={idx < 3 ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}>
                            <TableCell className="text-xs py-2 font-medium max-w-[200px] truncate">{item.name}</TableCell>
                            <TableCell className="text-xs py-2 text-right font-semibold">{PKR(item.revenue)}</TableCell>
                            <TableCell className="text-xs py-2 text-right">{pct.toFixed(1)}%</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TAB 5: COST ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════

  const renderCostAnalysis = () => {
    if (!reportData) return renderEmpty()
    const s = reportData.summary as Record<string, unknown>
    const c = reportData.charts as Record<string, unknown>
    const d = reportData.details as Record<string, unknown>

    const cogsByCategory = (c.cogsByCategory || []) as { categoryName: string; totalCost: number; totalRevenue: number; qty: number; markup: number }[]
    const monthlyCost = (c.monthlyCostTrend || []) as { month: string; cost: number; revenue: number }[]
    const costVsPrice = (d.costVsPrice || []) as { name: string; sku: string; brand: string | null; categoryName: string; qty: number; totalCost: number; totalRevenue: number; grossProfit: number; margin: number; markup: number }[]

    const totalSellingValue = costVsPrice.reduce((sum, p) => sum + p.totalRevenue, 0)
    const avgMarkup = costVsPrice.length > 0 ? costVsPrice.reduce((sum, p) => sum + p.markup, 0) / costVsPrice.length : 0
    const avgMargin = costVsPrice.length > 0 ? costVsPrice.reduce((sum, p) => sum + p.margin, 0) / costVsPrice.length : 0

    return (
      <div className="space-y-6" ref={printRef}>
        {/* Metrics */}
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StaggerItem><AnimatedMetricCard title="Total COGS" value={PKR(s.totalCOGS as number || 0)} icon={ArrowDownRight} accentGradient="from-amber-500/20 to-orange-500/20" iconBg="bg-amber-500/10 text-amber-600" delay={0} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Total Selling Value" value={PKR(totalSellingValue)} icon={DollarSign} iconBg="bg-emerald-500/10 text-emerald-600" delay={0.05} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Avg Markup" value={`${avgMarkup.toFixed(1)}%`} icon={TrendingUp} iconBg="bg-cyan-500/10 text-cyan-600" delay={0.1} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Avg Margin" value={`${avgMargin.toFixed(1)}%`} icon={Percent} iconBg="bg-purple-500/10 text-purple-600" delay={0.15} /></StaggerItem>
        </StaggerContainer>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* COGS by Category */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">COGS by Category</CardTitle></CardHeader>
              <CardContent>
                {cogsByCategory.length > 0 ? (
                  <ChartContainer config={costChartConfig} className="h-[280px] w-full">
                    <BarChart data={cogsByCategory} accessibilityLayer>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="categoryName" tickLine={false} axisLine={false} fontSize={9} />
                      <YAxis tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="totalCost" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} name="Total Cost" />
                    </BarChart>
                  </ChartContainer>
                ) : <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No data</div>}
              </CardContent>
            </Card>
          </motion.div>

          {/* Cost vs Selling Price */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Cost vs Selling Price (Top Items)</CardTitle></CardHeader>
              <CardContent>
                {costVsPrice.length > 0 ? (
                  <ChartContainer config={costChartConfig} className="h-[280px] w-full">
                    <BarChart data={costVsPrice.slice(0, 10)} accessibilityLayer>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={8} tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + '…' : v} />
                      <YAxis tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="totalCost" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} name="Total Cost" />
                      <Bar dataKey="totalRevenue" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Total Revenue" />
                      <Legend />
                    </BarChart>
                  </ChartContainer>
                ) : <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No data</div>}
              </CardContent>
            </Card>
          </motion.div>

          {/* Monthly Cost Trend - full width */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Monthly Cost Trend</CardTitle></CardHeader>
              <CardContent>
                {monthlyCost.length > 0 ? (
                  <ChartContainer config={costChartConfig} className="h-[260px] w-full">
                    <LineChart data={monthlyCost} accessibilityLayer>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={10} />
                      <YAxis tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="cost" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 3 }} name="Cost" />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 3 }} name="Revenue" />
                      <Legend />
                    </LineChart>
                  </ChartContainer>
                ) : <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">No trend data</div>}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Cost Analysis Table */}
        {costVsPrice.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Product Cost Analysis</CardTitle>
                <CardDescription className="text-xs">{costVsPrice.length} products analyzed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Product Name</TableHead>
                        <TableHead className="text-[10px]">Category</TableHead>
                        <TableHead className="text-[10px] text-right">Cost Price</TableHead>
                        <TableHead className="text-[10px] text-right">Selling Price</TableHead>
                        <TableHead className="text-[10px] text-right">Markup %</TableHead>
                        <TableHead className="text-[10px] text-right">Margin %</TableHead>
                        <TableHead className="text-[10px] text-right">Qty Sold</TableHead>
                        <TableHead className="text-[10px] text-right">Total Cost</TableHead>
                        <TableHead className="text-[10px] text-right">Total Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costVsPrice.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs py-2 font-medium max-w-[160px] truncate">{item.name}</TableCell>
                          <TableCell className="text-xs py-2 text-muted-foreground">{item.categoryName}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{PKR(item.totalCost / Math.max(item.qty, 1))}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{PKR(item.totalRevenue / Math.max(item.qty, 1))}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{item.markup.toFixed(1)}%</TableCell>
                          <TableCell className="text-xs py-2 text-right">
                            <Badge className={`${marginBg(item.margin)} border-0 text-[10px]`}>{item.margin.toFixed(1)}%</Badge>
                          </TableCell>
                          <TableCell className="text-xs py-2 text-right">{item.qty}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{PKR(item.totalCost)}</TableCell>
                          <TableCell className="text-xs py-2 text-right font-semibold">{PKR(item.totalRevenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TAB 6: RETAIL
  // ═══════════════════════════════════════════════════════════════════════

  const renderRetail = () => {
    if (!reportData) return renderEmpty()
    const s = reportData.summary as Record<string, unknown>
    const c = reportData.charts as Record<string, unknown>
    const d = reportData.details as Record<string, unknown>

    const salesByBrand = (c.salesByBrand || []) as { brand: string; qtySold: number; revenue: number }[]
    const salesByCat = (c.salesByCategory || []) as { category: string; qtySold: number; revenue: number }[]
    const monthlyRetail = (c.monthlyRetailTrend || []) as { month: string; retailRevenue: number; retailQty: number; serviceRevenue: number }[]
    const retailVsService = (c.retailVsService || []) as { type: string; revenue: number }[]
    const products = (d.products || []) as { name: string; sku: string; brand: string; category: string; qtySold: number; totalRevenue: number; totalCost: number; grossMargin: number; marginPercent: number }[]
    const topPerformers = (d.topPerformers || []) as typeof products
    const slowMoving = (d.slowMoving || []) as typeof products

    const retailCOGS = products.reduce((sum, p) => sum + p.totalCost, 0)
    const retailGP = products.reduce((sum, p) => sum + p.grossMargin, 0)
    const retailGPMargin = products.reduce((sum, p) => sum + p.totalRevenue, 0) > 0 ? (retailGP / products.reduce((sum, p) => sum + p.totalRevenue, 0)) * 100 : 0
    const avgRetailPrice = products.length > 0 ? products.reduce((sum, p) => sum + p.totalRevenue, 0) / products.reduce((sum, p) => sum + p.qtySold, 0) : 0

    return (
      <div className="space-y-6" ref={printRef}>
        {/* Metrics */}
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StaggerItem><AnimatedMetricCard title="Retail Revenue" value={PKR(s.totalRetailRevenue as number || 0)} icon={ShoppingBag} iconBg="bg-rose-500/10 text-rose-600" delay={0} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Retail COGS" value={PKR(retailCOGS)} icon={ArrowDownRight} accentGradient="from-amber-500/20 to-orange-500/20" iconBg="bg-amber-500/10 text-amber-600" delay={0.05} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Retail GP" value={PKR(retailGP)} icon={TrendingUp} iconBg="bg-emerald-500/10 text-emerald-600" delay={0.1} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="GP Margin" value={`${retailGPMargin.toFixed(1)}%`} icon={Percent} iconBg="bg-purple-500/10 text-purple-600" delay={0.15} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Items Sold" value={(s.totalProductsSold as number || 0).toLocaleString()} icon={Package} iconBg="bg-cyan-500/10 text-cyan-600" delay={0.2} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Avg Price" value={PKR(avgRetailPrice)} icon={Gem} iconBg="bg-pink-500/10 text-pink-600" delay={0.25} /></StaggerItem>
        </StaggerContainer>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sales by Brand */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Sales by Brand</CardTitle></CardHeader>
              <CardContent>
                {salesByBrand.length > 0 ? (
                  <ChartContainer config={{ revenue: { label: 'Revenue', color: 'hsl(350, 80%, 55%)' } }} className="h-[260px] w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie data={salesByBrand} dataKey="revenue" nameKey="brand" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                        {salesByBrand.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ChartContainer>
                ) : <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">No brand data</div>}
              </CardContent>
            </Card>
          </motion.div>

          {/* Sales by Category */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Sales by Category</CardTitle></CardHeader>
              <CardContent>
                {salesByCat.length > 0 ? (
                  <ChartContainer config={retailChartConfig} className="h-[260px] w-full">
                    <BarChart data={salesByCat} accessibilityLayer>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="category" tickLine={false} axisLine={false} fontSize={9} />
                      <YAxis tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="hsl(350, 80%, 55%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">No category data</div>}
              </CardContent>
            </Card>
          </motion.div>

          {/* Monthly Retail Trend */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Monthly Retail Trend</CardTitle></CardHeader>
              <CardContent>
                {monthlyRetail.length > 0 ? (
                  <ChartContainer config={retailChartConfig} className="h-[260px] w-full">
                    <AreaChart data={monthlyRetail} accessibilityLayer>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={10} />
                      <YAxis tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="retailRevenue" stroke="hsl(350, 80%, 55%)" fill="hsl(350, 80%, 55%)" fillOpacity={0.15} strokeWidth={2} />
                      <Area type="monotone" dataKey="serviceRevenue" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.1} strokeWidth={2} />
                      <Legend />
                    </AreaChart>
                  </ChartContainer>
                ) : <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">No trend data</div>}
              </CardContent>
            </Card>
          </motion.div>

          {/* Retail vs Service */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Retail vs Service Comparison</CardTitle></CardHeader>
              <CardContent>
                {retailVsService.length > 0 ? (
                  <ChartContainer config={{
                    Retail: { label: 'Retail', color: 'hsl(350, 80%, 55%)' },
                    Service: { label: 'Service', color: 'hsl(142, 71%, 45%)' },
                  }} className="h-[260px] w-full">
                    <BarChart data={retailVsService} accessibilityLayer>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="type" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                        {retailVsService.map((entry, i) => <Cell key={i} fill={entry.type === 'Retail' ? 'hsl(350, 80%, 55%)' : 'hsl(142, 71%, 45%)'} />)}
                      </Bar>
                      <Legend />
                    </BarChart>
                  </ChartContainer>
                ) : <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">No comparison data</div>}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-border/50 border-l-4 border-l-emerald-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><Crown className="h-4 w-4 text-emerald-500" />Top Performing Retail Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Product Name</TableHead>
                        <TableHead className="text-[10px]">SKU</TableHead>
                        <TableHead className="text-[10px]">Brand</TableHead>
                        <TableHead className="text-[10px]">Category</TableHead>
                        <TableHead className="text-[10px] text-right">Qty</TableHead>
                        <TableHead className="text-[10px] text-right">Revenue</TableHead>
                        <TableHead className="text-[10px] text-right">Cost</TableHead>
                        <TableHead className="text-[10px] text-right">GP</TableHead>
                        <TableHead className="text-[10px] text-right">Margin %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPerformers.slice(0, 10).map((item, idx) => (
                        <TableRow key={idx} className="bg-emerald-50/30 dark:bg-emerald-950/10">
                          <TableCell className="text-xs py-2 font-medium">{item.name}</TableCell>
                          <TableCell className="text-xs py-2 font-mono text-muted-foreground">{item.sku}</TableCell>
                          <TableCell className="text-xs py-2">{item.brand || '—'}</TableCell>
                          <TableCell className="text-xs py-2">{item.category}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{item.qtySold}</TableCell>
                          <TableCell className="text-xs py-2 text-right font-semibold">{PKR(item.totalRevenue)}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{PKR(item.totalCost)}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{PKR(item.grossMargin)}</TableCell>
                          <TableCell className="text-xs py-2 text-right">
                            <Badge className={`${marginBg(item.marginPercent)} border-0 text-[10px]`}>{item.marginPercent.toFixed(1)}%</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Slow Movers */}
        {slowMoving.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="border-border/50 border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-amber-500" />Slow Moving Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Product Name</TableHead>
                        <TableHead className="text-[10px]">Category</TableHead>
                        <TableHead className="text-[10px] text-right">Qty Sold</TableHead>
                        <TableHead className="text-[10px] text-right">Revenue</TableHead>
                        <TableHead className="text-[10px] text-right">Margin %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slowMoving.slice(0, 10).map((item, idx) => (
                        <TableRow key={idx} className="bg-amber-50/20 dark:bg-amber-950/10">
                          <TableCell className="text-xs py-2 font-medium">{item.name}</TableCell>
                          <TableCell className="text-xs py-2">{item.category}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{item.qtySold}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{PKR(item.totalRevenue)}</TableCell>
                          <TableCell className="text-xs py-2 text-right">
                            <Badge className={`${marginBg(item.marginPercent)} border-0 text-[10px]`}>{item.marginPercent.toFixed(1)}%</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TAB 7: SALESPERSON
  // ═══════════════════════════════════════════════════════════════════════

  const renderSalesperson = () => {
    if (!reportData) return renderEmpty()
    const s = reportData.summary as Record<string, unknown>
    const c = reportData.charts as Record<string, unknown>
    const d = reportData.details as Record<string, unknown>

    const topPerformersChart = (c.topPerformersChart || []) as { name: string; totalSales: number; serviceSales: number; productSales: number }[]
    const monthlyTrend = (c.monthlySalesTrend || []) as Record<string, unknown>[]
    const salesTypeDist = (c.salesTypeDistribution || []) as { name: string; service: number; product: number; membership: number; package: number }[]
    const salespeople = (d.salespeople || []) as {
      staffId: string; name: string; email: string; role: string; specialization: string | null;
      totalSales: number; totalItemsSold: number; avgSaleValue: number; uniqueCustomers: number;
      serviceSales: number; productSales: number; membershipSales: number; packageSales: number;
      commissionRate: number; commissionEligible: number; branchName: string; branchesWorked: number
    }[]

    const topName = salespeople.length > 0 ? salespeople[0].name : 'N/A'

    return (
      <div className="space-y-6" ref={printRef}>
        {/* Metrics */}
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StaggerItem><AnimatedMetricCard title="Sales Staff" value={(s.totalSalespeople as number || 0).toString()} icon={Users} iconBg="bg-rose-500/10 text-rose-600" delay={0} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Attributed Sales" value={PKR(s.totalAttributedSales as number || 0)} icon={DollarSign} iconBg="bg-emerald-500/10 text-emerald-600" delay={0.05} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Avg Sales/Person" value={PKR(s.avgSalesPerPerson as number || 0)} icon={Target} iconBg="bg-amber-500/10 text-amber-600" delay={0.1} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Top Salesperson" value={topName} icon={Crown} iconBg="bg-purple-500/10 text-purple-600" delay={0.15} /></StaggerItem>
          <StaggerItem><AnimatedMetricCard title="Commission Eligible" value={PKR(s.totalCommissionEligible as number || 0)} icon={Award} iconBg="bg-cyan-500/10 text-cyan-600" delay={0.2} /></StaggerItem>
        </StaggerContainer>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sales by Salesperson */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Sales by Salesperson</CardTitle></CardHeader>
              <CardContent>
                {topPerformersChart.length > 0 ? (
                  <ChartContainer config={salespersonChartConfig} className="h-[300px] w-full">
                    <BarChart data={topPerformersChart} layout="vertical" accessibilityLayer>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={9} width={100} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="totalSales" fill="hsl(350, 80%, 55%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">No data</div>}
              </CardContent>
            </Card>
          </motion.div>

          {/* Service vs Product per Salesperson (Stacked) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Service vs Product per Salesperson</CardTitle></CardHeader>
              <CardContent>
                {salesTypeDist.length > 0 ? (
                  <ChartContainer config={salespersonChartConfig} className="h-[300px] w-full">
                    <BarChart data={salesTypeDist.slice(0, 10)} layout="vertical" accessibilityLayer>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={9} width={100} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="service" stackId="a" fill="hsl(350, 80%, 55%)" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="product" stackId="a" fill="hsl(199, 89%, 48%)" radius={[0, 4, 4, 0]} />
                      <Legend />
                    </BarChart>
                  </ChartContainer>
                ) : <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">No data</div>}
              </CardContent>
            </Card>
          </motion.div>

          {/* Top 5 Monthly Trend */}
          {monthlyTrend.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
              <Card className="border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top 5 Salesperson Monthly Trend</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={
                    Object.fromEntries(
                      topPerformersChart.slice(0, 5).map((s, i) => [
                        s.name.replace(/\s/g, '_'),
                        { label: s.name, color: CHART_COLORS[i % CHART_COLORS.length] },
                      ])
                    )
                  } className="h-[260px] w-full">
                    <LineChart data={monthlyTrend} accessibilityLayer>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={10} />
                      <YAxis tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      {topPerformersChart.slice(0, 5).map((sp, i) => (
                        <Line key={sp.name} type="monotone" dataKey={sp.name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                      ))}
                      <Legend />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Salesperson Table */}
        {salespeople.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Salesperson Breakdown</CardTitle>
                <CardDescription className="text-xs">{salespeople.length} salespeople ranked by total sales</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Rank</TableHead>
                        <TableHead className="text-[10px]">Name</TableHead>
                        <TableHead className="text-[10px]">Role</TableHead>
                        <TableHead className="text-[10px] text-right">Total Sales</TableHead>
                        <TableHead className="text-[10px] text-right">Items Sold</TableHead>
                        <TableHead className="text-[10px] text-right">Avg Sale</TableHead>
                        <TableHead className="text-[10px] text-right">Customers</TableHead>
                        <TableHead className="text-[10px] text-right">Service Sales</TableHead>
                        <TableHead className="text-[10px] text-right">Product Sales</TableHead>
                        <TableHead className="text-[10px] text-right">Comm. Rate</TableHead>
                        <TableHead className="text-[10px] text-right">Comm. Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salespeople.map((sp, idx) => (
                        <TableRow key={sp.staffId} className={idx < 3 ? 'bg-gradient-to-r from-rose-50/50 to-pink-50/30 dark:from-rose-950/20 dark:to-pink-950/10' : ''}>
                          <TableCell className="text-xs py-2">
                            {idx === 0 && <span className="text-lg" title="1st Place">🥇</span>}
                            {idx === 1 && <span className="text-lg" title="2nd Place">🥈</span>}
                            {idx === 2 && <span className="text-lg" title="3rd Place">🥉</span>}
                            {idx > 2 && <span className="text-xs font-mono text-muted-foreground">{idx + 1}</span>}
                          </TableCell>
                          <TableCell className="text-xs py-2 font-medium">
                            <div className="flex items-center gap-2">
                              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${idx < 3 ? 'bg-gradient-to-r from-rose-500 to-pink-600' : 'bg-muted text-muted-foreground'}`}>
                                {sp.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-semibold">{sp.name}</div>
                                <div className="text-[10px] text-muted-foreground">{sp.branchName}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-2">
                            <Badge variant="outline" className="text-[9px]">{sp.role}</Badge>
                          </TableCell>
                          <TableCell className="text-xs py-2 text-right font-bold">{PKR(sp.totalSales)}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{sp.totalItemsSold}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{PKR(sp.avgSaleValue)}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{sp.uniqueCustomers}</TableCell>
                          <TableCell className="text-xs py-2 text-right text-rose-600 dark:text-rose-400">{PKR(sp.serviceSales)}</TableCell>
                          <TableCell className="text-xs py-2 text-right text-cyan-600 dark:text-cyan-400">{PKR(sp.productSales)}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{(sp.commissionRate * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">{PKR(sp.commissionEligible)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    )
  }

  // ─── Tab Content Renderer ──────────────────────────────────────────

  const renderTabContent = () => {
    if (loading) return renderLoading()

    switch (activeTab) {
      case 'overview': return renderOverview()
      case 'item-wise': return renderItemWise()
      case 'category': return renderCategory()
      case 'gross-profit': return renderGrossProfit()
      case 'cost-analysis': return renderCostAnalysis()
      case 'retail': return renderRetail()
      case 'salesperson': return renderSalesperson()
      default: return renderEmpty()
    }
  }

  // ─── Main Render ──────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 shadow-lg shadow-rose-500/20">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              Sales Reports
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Comprehensive sales analytics with drill-down insights</p>
          </div>
        </div>
      </motion.div>

      {/* Filter Bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[140px] text-xs" />
                <span className="text-muted-foreground text-xs">to</span>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[140px] text-xs" />
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue placeholder="All Branches" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200" onClick={handlePrint} disabled={loading || !reportData}>
                  <Printer className="h-3.5 w-3.5" /> Print
                </Button>
                <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200" onClick={handleExportCSV} disabled={loading || !reportData}>
                  <FileDown className="h-3.5 w-3.5" /> Export CSV
                </Button>
                <Button size="sm" className="h-9 bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/20 hover:shadow-lg hover:shadow-rose-500/30" onClick={fetchReport} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <BarChart3 className="h-4 w-4 mr-1" />}
                  Generate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="h-auto flex-wrap bg-muted/50 p-1 gap-0.5">
            {TAB_CONFIG.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs gap-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-rose-500/20 px-3 py-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {/* Content Area */}
          <div className="mt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </Tabs>
      </motion.div>
    </div>
  )
}

export default SalesReportsModule
