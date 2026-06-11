'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import {
  BarChart3,
  CalendarDays,
  DollarSign,
  Users,
  UserCheck,
  Package,
  FileText,
  Award,
  Download,
  FileSpreadsheet,
  FileDown,
  ArrowLeft,
  Loader2,
  Printer,
  CreditCard,
  Receipt,
  Wallet,
  PieChart as PieChartIcon,
  TrendingUp,
} from 'lucide-react'
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts'

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

interface ReportType {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
}

const reportTypes: ReportType[] = [
  { id: 'revenue', title: 'Revenue Report', description: 'Income analysis, payment methods, daily trends', icon: <DollarSign className="h-6 w-6" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950' },
  { id: 'appointments', title: 'Appointment Report', description: 'Booking trends, status breakdown, peak hours', icon: <CalendarDays className="h-6 w-6" />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950' },
  { id: 'staff', title: 'Staff Performance', description: 'Productivity, commissions, client satisfaction', icon: <UserCheck className="h-6 w-6" />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950' },
  { id: 'customers', title: 'Customer Report', description: 'Demographics, retention, lifetime value', icon: <Users className="h-6 w-6" />, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950' },
  { id: 'inventory', title: 'Inventory Report', description: 'Stock levels, reorder alerts, valuation', icon: <Package className="h-6 w-6" />, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950' },
  { id: 'financial', title: 'Financial Report (P&L)', description: 'Revenue vs expenses, profit margins', icon: <BarChart3 className="h-6 w-6" />, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950' },
  { id: 'loyalty', title: 'Loyalty Report', description: 'Points activity, tier distribution, rewards', icon: <Award className="h-6 w-6" />, color: 'text-pink-600 bg-pink-50 dark:bg-pink-950' },
  { id: 'membership', title: 'Membership Report', description: 'Active plans, renewals, churn rate', icon: <CreditCard className="h-6 w-6" />, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950' },
  { id: 'payroll', title: 'Payroll Summary', description: 'Payroll costs, staff breakdown, commission ratios', icon: <Wallet className="h-6 w-6" />, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950' },
  { id: 'tax', title: 'Tax Report', description: 'Tax collected, breakdown by category', icon: <Receipt className="h-6 w-6" />, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950' },
]

const revenueChartConfig: ChartConfig = {
  revenue: { label: 'Revenue', color: 'hsl(350, 80%, 55%)' },
  expenses: { label: 'Expenses', color: 'hsl(142, 71%, 45%)' },
  profit: { label: 'Profit', color: 'hsl(38, 92%, 50%)' },
  count: { label: 'Count', color: 'hsl(350, 80%, 55%)' },
  amount: { label: 'Amount', color: 'hsl(350, 80%, 55%)' },
}

export default function ReportsModule() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null)
  const [generating, setGenerating] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const generateReport = async (report?: ReportType) => {
    const r = report || selectedReport
    if (!r) return
    setGenerating(true)
    setReportData(null)
    try {
      const params = new URLSearchParams()
      params.set('type', r.id)
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      const res = await fetch(`/api/reports?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setReportData(json.data)
      } else {
        toast.error(json.error || 'Failed to generate report')
      }
    } catch (err) {
      console.error('Failed to generate report:', err)
      toast.error('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const handleSelectReport = (report: ReportType) => {
    setSelectedReport(report)
    setReportData(null)
  }

  const handleBack = () => {
    setSelectedReport(null)
    setReportData(null)
  }

  // ─── Print ────────────────────────────────────────────────────────
  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) { toast.error('Please allow popups to print'); return }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${selectedReport?.title || 'Report'} — SalonFlow OS</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page { size: A4; margin: 15mm 12mm 20mm 12mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; color: #1a1a2e; font-size: 11px; line-height: 1.5; background: white; }
          .report-page { page-break-after: always; position: relative; min-height: 100vh; }
          .report-page:last-child { page-break-after: auto; }
          .report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e11d48; padding-bottom: 12px; margin-bottom: 20px; }
          .report-header .logo-area { display: flex; align-items: center; gap: 10px; }
          .report-header .logo-icon { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #e11d48, #f43f5e); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 16px; }
          .report-header .company-name { font-size: 16px; font-weight: 700; color: #1a1a2e; }
          .report-header .company-tagline { font-size: 9px; color: #666; letter-spacing: 1px; text-transform: uppercase; }
          .report-header .report-info { text-align: right; }
          .report-header .report-title { font-size: 14px; font-weight: 700; color: #e11d48; }
          .report-header .report-date { font-size: 9px; color: #666; }
          .report-footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #ddd; padding: 8px 12mm; font-size: 8px; color: #999; }
          .report-footer .confidential { font-weight: 600; color: #e11d48; letter-spacing: 1px; }
          .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
          .metric-card { background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 12px; }
          .metric-card .label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
          .metric-card .value { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-top: 4px; }
          .metric-card .value.rose { color: #e11d48; }
          .metric-card .value.green { color: #16a34a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
          thead th { background: #f8f8f8; border-bottom: 2px solid #ddd; padding: 8px 6px; text-align: left; font-weight: 600; color: #555; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
          tbody td { border-bottom: 1px solid #eee; padding: 7px 6px; }
          tbody tr:hover { background: #fafafa; }
          .section-title { font-size: 12px; font-weight: 700; color: #1a1a2e; margin: 20px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #eee; }
          .chart-placeholder { background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 20px; text-align: center; color: #888; margin-bottom: 16px; }
          .page-break { page-break-before: always; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 600; }
          .badge-green { background: #dcfce7; color: #16a34a; }
          .badge-amber { background: #fef3c7; color: #d97706; }
          .badge-red { background: #fee2e2; color: #dc2626; }
          .badge-blue { background: #dbeafe; color: #2563eb; }
          @media print { .no-print { display: none !important; } }
        </style>
      </head>
      <body>
        ${generatePrintHTML()}
        <div class="report-footer">
          <span>SalonFlow OS — ApexFlow Ecosystem</span>
          <span>Page 1 of 1</span>
          <span class="confidential">CONFIDENTIAL</span>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => { printWindow.print() }, 500)
  }

  const generatePrintHTML = () => {
    if (!reportData || !selectedReport) return '<p>No data</p>'
    const now = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    const headerHTML = `
      <div class="report-header">
        <div class="logo-area">
          <div class="logo-icon">SF</div>
          <div>
            <div class="company-name">SalonFlow OS</div>
            <div class="company-tagline">ApexFlow Ecosystem</div>
          </div>
        </div>
        <div class="report-info">
          <div class="report-title">${selectedReport.title}</div>
          <div class="report-date">Period: ${dateFrom} to ${dateTo}</div>
          <div class="report-date">Generated: ${now}</div>
        </div>
      </div>
    `
    return `<div class="report-page">${headerHTML}${renderPrintContent()}</div>`
  }

  const renderPrintContent = () => {
    if (!reportData || !selectedReport) return ''
    const data = reportData as Record<string, unknown>
    const summary = (data.summary || {}) as Record<string, unknown>
    const details = data.details as Record<string, unknown>[] | undefined
    let html = ''

    // Summary metrics
    const summaryEntries = Object.entries(summary).filter(([, v]) => typeof v === 'number' || typeof v === 'string')
    if (summaryEntries.length > 0) {
      html += '<div class="metrics-grid">'
      summaryEntries.slice(0, 8).forEach(([key, value]) => {
        const isCurrency = /revenue|amount|expense|profit|tax|payroll|cost|earning|salary|discount/i.test(key)
        const formatted = typeof value === 'number' ? (isCurrency ? PKR(value) : value.toLocaleString()) : String(value)
        const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
        html += `<div class="metric-card"><div class="label">${label}</div><div class="value">${formatted}</div></div>`
      })
      html += '</div>'
    }

    // Details table
    if (details && details.length > 0) {
      const keys = Object.keys(details[0]).filter(k => typeof details[0][k] !== 'object' || details[0][k] === null)
      html += '<div class="section-title">Detailed Breakdown</div>'
      html += '<table><thead><tr>'
      keys.slice(0, 8).forEach(k => { html += `<th>${k.replace(/([A-Z])/g, ' $1').trim()}</th>` })
      html += '</tr></thead><tbody>'
      details.slice(0, 50).forEach(row => {
        html += '<tr>'
        keys.slice(0, 8).forEach(k => {
          const val = (row as Record<string, unknown>)[k]
          const isCurrency = /amount|price|revenue|cost|salary|earning/i.test(k)
          html += `<td>${val === null || val === undefined ? '—' : (typeof val === 'number' && isCurrency ? PKR(val) : String(val))}</td>`
        })
        html += '</tr>'
      })
      html += '</tbody></table>'
    }

    return html
  }

  // ─── Export CSV / Excel ────────────────────────────────────────────
  const flattenData = (data: Record<string, unknown>[], parentKey = ''): Record<string, unknown>[] => {
    return data.map((item) => {
      const flat: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(item)) {
        const newKey = parentKey ? `${parentKey}_${key}` : key
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(flat, flattenData([value as Record<string, unknown>], newKey)[0])
        } else {
          flat[newKey] = value
        }
      }
      return flat
    })
  }

  const exportCSV = () => {
    if (!reportData || !selectedReport) return
    try {
      const data = reportData as Record<string, unknown>
      const details = data.details as Record<string, unknown>[] | undefined
      const summary = data.summary as Record<string, unknown> | undefined
      let rows: Record<string, unknown>[] = []

      if (details && details.length > 0) {
        rows = flattenData(details)
      } else if (summary) {
        rows = [summary]
      }

      if (rows.length === 0) { toast.error('No data to export'); return }
      const headers = Object.keys(rows[0])
      const csvContent = [
        `SalonFlow OS - ${selectedReport.title}`,
        `Period: ${dateFrom} to ${dateTo}`,
        `Generated: ${new Date().toLocaleString()}`,
        '',
        headers.join(','),
        ...rows.map((row) =>
          headers.map((h) => {
            const val = row[h]
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
      a.download = `${selectedReport.id}-report-${dateFrom}-to-${dateTo}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exported successfully')
    } catch { toast.error('Failed to export') }
  }

  const exportExcel = () => {
    if (!reportData || !selectedReport) return
    try {
      const data = reportData as Record<string, unknown>
      const details = data.details as Record<string, unknown>[] | undefined
      const summary = data.summary as Record<string, unknown> | undefined
      let rows: Record<string, unknown>[] = []

      if (details && details.length > 0) {
        rows = flattenData(details)
      } else if (summary) {
        rows = [summary]
      }

      if (rows.length === 0) { toast.error('No data to export'); return }

      // Generate a simple HTML table that Excel can open
      const headers = Object.keys(rows[0])
      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
        <x:Name>${selectedReport.title}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
        <body>
        <h2 style="font-family:Arial">${selectedReport.title} — ${dateFrom} to ${dateTo}</h2>
        <table border="1" cellpadding="4" cellspacing="0" style="font-family:Arial;font-size:10pt">
        <tr>${headers.map(h => `<th style="background:#f0f0f0;font-weight:bold">${h.replace(/([A-Z])/g, ' $1').trim()}</th>`).join('')}</tr>
        ${rows.map(row => `<tr>${headers.map(h => {
          const val = (row as Record<string, unknown>)[h]
          return `<td>${val === null || val === undefined ? '' : String(val)}</td>`
        }).join('')}</tr>`).join('')}
        </table></body></html>
      `
      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedReport.id}-report-${dateFrom}-to-${dateTo}.xls`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Excel exported successfully')
    } catch { toast.error('Failed to export') }
  }

  // ─── Render Report Content ────────────────────────────────────────
  const renderReportContent = () => {
    if (generating) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <p className="text-sm text-muted-foreground">Generating report...</p>
        </div>
      )
    }

    if (!reportData) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <FileText className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Select a date range and generate the report</p>
        </div>
      )
    }

    const data = reportData as Record<string, unknown>
    const summary = (data.summary || {}) as Record<string, unknown>
    const details = data.details as Record<string, unknown>[] | undefined
    const chartData = data.chartData as Record<string, unknown>[] | undefined

    return (
      <div className="space-y-6" ref={printRef}>
        {/* ─── Summary Metrics ────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(summary)
            .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
            .slice(0, 8)
            .map(([key, value]) => {
              const isCurrency = /revenue|amount|expense|profit|tax|payroll|cost|earning|salary|discount|total/i.test(key)
              const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
              return (
                <Card key={key} className="border-border/50">
                  <CardContent className="p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
                    <p className="text-xl font-bold mt-1 text-foreground">
                      {typeof value === 'number'
                        ? isCurrency ? PKR(value) : value.toLocaleString()
                        : String(value)}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
        </div>

        {/* ─── Charts ─────────────────────────────────────────── */}
        {chartData && chartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue/Trend Chart */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Trend Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={revenueChartConfig} className="h-[260px] w-full">
                  <AreaChart data={chartData} accessibilityLayer>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(350, 80%, 55%)"
                      fill="hsl(350, 80%, 55%)"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="hsl(142, 71%, 45%)"
                      fill="hsl(142, 71%, 45%)"
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Distribution Chart */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={Object.fromEntries(
                    chartData.slice(0, 6).map((_, i) => [
                      `item${i}`,
                      { label: `Item ${i + 1}`, color: CHART_COLORS[i] },
                    ])
                  )}
                  className="h-[260px] w-full"
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {chartData.slice(0, 8).map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── Details Table ──────────────────────────────────── */}
        {details && details.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Detailed Breakdown</CardTitle>
              <CardDescription className="text-xs">
                Showing {Math.min(details.length, 50)} of {details.length} records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(details[0])
                        .filter(k => typeof details[0][k] !== 'object' || details[0][k] === null)
                        .slice(0, 8)
                        .map(key => (
                          <TableHead key={key} className="text-[10px] uppercase tracking-wider font-bold whitespace-nowrap">
                            {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                          </TableHead>
                        ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.slice(0, 50).map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/30">
                        {Object.entries(item)
                          .filter(([, v]) => typeof v !== 'object' || v === null)
                          .slice(0, 8)
                          .map(([key, val]) => {
                            const isCurrency = /amount|price|revenue|cost|salary|earning|pay|discount/i.test(key)
                            return (
                              <TableCell key={key} className="text-xs py-2 whitespace-nowrap">
                                {val === null || val === undefined
                                  ? '—'
                                  : typeof val === 'number'
                                    ? isCurrency ? PKR(val) : val.toLocaleString()
                                    : String(val).length > 40 ? String(val).slice(0, 40) + '...' : String(val)}
                              </TableCell>
                            )
                          })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // ─── Main Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Generate detailed reports with professional print-ready layouts
        </p>
      </div>

      {!selectedReport ? (
        /* ─── Report Type Grid ─────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {reportTypes.map((report) => (
            <Card
              key={report.id}
              className="cursor-pointer hover:shadow-lg transition-all duration-300 group border-border/50 hover:border-rose-200 dark:hover:border-rose-900"
              onClick={() => handleSelectReport(report)}
            >
              <CardHeader className="pb-3">
                <div className={`inline-flex p-3 rounded-xl w-fit ${report.color} transition-transform group-hover:scale-110`}>
                  {report.icon}
                </div>
                <CardTitle className="text-sm mt-3 group-hover:text-rose-600 transition-colors">
                  {report.title}
                </CardTitle>
                <CardDescription className="text-xs">
                  {report.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs group-hover:bg-rose-50 group-hover:text-rose-600 group-hover:border-rose-200 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectReport(report)
                  }}
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Generate
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* ─── Report View ──────────────────────────────────────── */
        <div className="space-y-4">
          {/* Report Header Bar */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className={`p-2.5 rounded-xl ${selectedReport.color}`}>
                    {selectedReport.icon}
                  </div>
                  <div>
                    <h2 className="text-base font-bold">{selectedReport.title}</h2>
                    <p className="text-xs text-muted-foreground">{selectedReport.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[140px] text-xs" />
                  <span className="text-muted-foreground text-xs">to</span>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[140px] text-xs" />
                  <Button
                    size="sm"
                    className="h-9 bg-rose-600 hover:bg-rose-700 text-white"
                    onClick={() => generateReport()}
                    disabled={generating}
                  >
                    {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
                    Generate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons Bar */}
          {reportData && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs gap-1 py-1.5 px-3 border-rose-200 dark:border-rose-900">
                <Download className="h-3 w-3" />
                Export:
              </Badge>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200" onClick={handlePrint}>
                <Printer className="h-3.5 w-3.5" />
                Print / PDF
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200" onClick={exportExcel}>
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Excel
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" onClick={exportCSV}>
                <FileDown className="h-3.5 w-3.5" />
                CSV
              </Button>
              <div className="ml-auto">
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {dateFrom} → {dateTo}
                </Badge>
              </div>
            </div>
          )}

          {/* Report Content */}
          {renderReportContent()}
        </div>
      )}
    </div>
  )
}
