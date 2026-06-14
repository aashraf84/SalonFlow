'use client'

import { useState, useRef, useCallback } from 'react'
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
  Clock,
  XCircle,
  Sparkles,
  Tag,
  ShoppingBag,
  Gift,
  HeartHandshake,
  HandCoins,
  Percent,
  Scissors,
  LayoutGrid,
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
import { Separator } from '@/components/ui/separator'
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts'

const PKR = (amount: number) => `PKR ${Math.round(amount).toLocaleString()}`

const CHART_COLORS = [
  'hsl(350, 80%, 55%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(199, 89%, 48%)',
  'hsl(271, 81%, 56%)',
  'hsl(15, 90%, 55%)',
  'hsl(168, 74%, 44%)',
  'hsl(328, 85%, 54%)',
]

// ─── Report Types with Categories ────────────────────────────────

interface ReportType {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  category: string
  hasApi: boolean
}

const CATEGORIES = [
  { id: 'sales', label: 'Sales & Revenue', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  { id: 'appointments', label: 'Appointments & Services', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  { id: 'people', label: 'People', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  { id: 'financial', label: 'Financial', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
  { id: 'loyalty', label: 'Loyalty & Members', color: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' },
  { id: 'operations', label: 'Operations', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
]

const reportTypes: ReportType[] = [
  // Sales & Revenue
  { id: 'revenue', title: 'Revenue Report', description: 'Income analysis, payment methods, daily trends', icon: <DollarSign className="h-5 w-5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950', category: 'sales', hasApi: true },
  { id: 'daily_closeout', title: 'Daily Closeout', description: 'End-of-day cash position & transaction summary', icon: <Clock className="h-5 w-5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950', category: 'sales', hasApi: true },
  { id: 'hourly_sales', title: 'Hourly Sales', description: 'Revenue breakdown by hour, peak time analysis', icon: <Clock className="h-5 w-5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950', category: 'sales', hasApi: true },
  { id: 'sales_item', title: 'Item-wise Sales', description: 'Sales breakdown by item, quantity, revenue & discounts', icon: <Tag className="h-5 w-5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950', category: 'sales', hasApi: true },
  { id: 'sales_category', title: 'Category Sales', description: 'Revenue by service & product category, margins', icon: <LayoutGrid className="h-5 w-5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950', category: 'sales', hasApi: true },
  { id: 'gross_profit', title: 'Gross Profit', description: 'Revenue vs COGS, margin analysis by category', icon: <TrendingUp className="h-5 w-5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950', category: 'sales', hasApi: true },
  { id: 'cost_analysis', title: 'Cost Analysis', description: 'COGS breakdown, cost vs selling price, markup', icon: <Percent className="h-5 w-5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950', category: 'sales', hasApi: true },
  { id: 'product_sales', title: 'Retail Product Sales', description: 'Product performance, brand analysis, margins', icon: <ShoppingBag className="h-5 w-5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950', category: 'sales', hasApi: true },
  { id: 'salesperson', title: 'Salesperson Report', description: 'Staff sales attribution, commissions, type split', icon: <UserCheck className="h-5 w-5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950', category: 'sales', hasApi: true },
  { id: 'discount', title: 'Discount Analysis', description: 'Discount impact, staff discount patterns, revenue loss', icon: <Tag className="h-5 w-5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950', category: 'sales', hasApi: true },

  // Appointments & Services
  { id: 'appointments', title: 'Appointment Report', description: 'Booking trends, status breakdown, peak hours', icon: <CalendarDays className="h-5 w-5" />, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950', category: 'appointments', hasApi: true },
  { id: 'service_popularity', title: 'Service Popularity', description: 'Most booked services by revenue and volume', icon: <Sparkles className="h-5 w-5" />, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950', category: 'appointments', hasApi: true },
  { id: 'noshow', title: 'No-Show & Cancellation', description: 'No-show rates, repeat offenders, revenue lost', icon: <XCircle className="h-5 w-5" />, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950', category: 'appointments', hasApi: true },

  // People
  { id: 'staff', title: 'Staff Performance', description: 'Productivity, commissions, client satisfaction', icon: <UserCheck className="h-5 w-5" />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950', category: 'people', hasApi: true },
  { id: 'customers', title: 'Customer Report', description: 'Demographics, retention, lifetime value', icon: <Users className="h-5 w-5" />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950', category: 'people', hasApi: true },
  { id: 'client_retention', title: 'Client Retention', description: 'Cohort analysis, churn prediction, reactivation', icon: <HeartHandshake className="h-5 w-5" />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950', category: 'people', hasApi: false },
  { id: 'tips', title: 'Tips & Gratuity', description: 'Tips by staff, payment method, daily trends', icon: <HandCoins className="h-5 w-5" />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950', category: 'people', hasApi: false },
  { id: 'commission', title: 'Commission Report', description: 'Commission breakdown by staff and type', icon: <Percent className="h-5 w-5" />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950', category: 'people', hasApi: false },

  // Financial
  { id: 'financial', title: 'Financial Report (P&L)', description: 'Revenue vs expenses, profit margins', icon: <BarChart3 className="h-5 w-5" />, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950', category: 'financial', hasApi: true },
  { id: 'tax', title: 'Tax Report', description: 'Tax collected, breakdown by category', icon: <Receipt className="h-5 w-5" />, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950', category: 'financial', hasApi: true },
  { id: 'payroll', title: 'Payroll Summary', description: 'Payroll costs, staff breakdown, commission ratios', icon: <Wallet className="h-5 w-5" />, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950', category: 'financial', hasApi: true },

  // Loyalty & Members
  { id: 'loyalty', title: 'Loyalty Report', description: 'Points activity, tier distribution, rewards', icon: <Award className="h-5 w-5" />, color: 'text-pink-600 bg-pink-50 dark:bg-pink-950', category: 'loyalty', hasApi: true },
  { id: 'membership', title: 'Membership Report', description: 'Active plans, renewals, churn rate', icon: <CreditCard className="h-5 w-5" />, color: 'text-pink-600 bg-pink-50 dark:bg-pink-950', category: 'loyalty', hasApi: true },
  { id: 'gift_card', title: 'Gift Card Report', description: 'Outstanding balances, redemption trends, revenue', icon: <Gift className="h-5 w-5" />, color: 'text-pink-600 bg-pink-50 dark:bg-pink-950', category: 'loyalty', hasApi: false },

  // Operations
  { id: 'inventory', title: 'Inventory Report', description: 'Stock levels, reorder alerts, valuation', icon: <Package className="h-5 w-5" />, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950', category: 'operations', hasApi: true },
]

const revenueChartConfig: ChartConfig = {
  revenue: { label: 'Revenue', color: 'hsl(350, 80%, 55%)' },
  expenses: { label: 'Expenses', color: 'hsl(142, 71%, 45%)' },
  profit: { label: 'Profit', color: 'hsl(38, 92%, 50%)' },
  count: { label: 'Count', color: 'hsl(350, 80%, 55%)' },
  amount: { label: 'Amount', color: 'hsl(350, 80%, 55%)' },
  bookings: { label: 'Bookings', color: 'hsl(199, 89%, 48%)' },
  transactions: { label: 'Transactions', color: 'hsl(271, 81%, 56%)' },
  noShows: { label: 'No-Shows', color: 'hsl(350, 80%, 55%)' },
  cancelled: { label: 'Cancelled', color: 'hsl(38, 92%, 50%)' },
  discount: { label: 'Discount', color: 'hsl(15, 90%, 55%)' },
  avgTransaction: { label: 'Avg Transaction', color: 'hsl(168, 74%, 44%)' },
}

// ─── Main Component ──────────────────────────────────────────────

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
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const generateReport = useCallback(async (report?: ReportType) => {
    const r = report || selectedReport
    if (!r) return
    if (!r.hasApi) {
      toast.info(`${r.title} is coming soon! The API endpoint is being developed.`)
      return
    }
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
  }, [selectedReport, dateFrom, dateTo])

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
    const now = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${selectedReport?.title || 'Report'} — SalonFlow OS</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page { size: letter; margin: 0.6in 0.75in 0.8in 0.75in; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; color: #1a1a2e; font-size: 11px; line-height: 1.5; background: white; }
          .report-page { position: relative; min-height: 100vh; padding: 0 0 40px 0; }
          .report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #e11d48; padding-bottom: 14px; margin-bottom: 24px; }
          .report-header .logo-area { display: flex; align-items: center; gap: 12px; }
          .report-header .logo-icon { width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, #e11d48, #f43f5e); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 17px; }
          .report-header .company-name { font-size: 18px; font-weight: 700; color: #1a1a2e; }
          .report-header .company-tagline { font-size: 9px; color: #888; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 2px; }
          .report-header .report-info { text-align: right; }
          .report-header .report-title { font-size: 16px; font-weight: 700; color: #e11d48; }
          .report-header .report-date { font-size: 10px; color: #666; margin-top: 2px; }
          .report-footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #ddd; padding: 8px 0.75in; font-size: 8px; color: #999; background: white; }
          .report-footer .confidential { font-weight: 600; color: #e11d48; letter-spacing: 1px; }
          .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
          .metric-card { background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 14px; }
          .metric-card .label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
          .metric-card .value { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-top: 4px; }
          .metric-card .value.rose { color: #e11d48; }
          .metric-card .value.green { color: #16a34a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
          thead th { background: #f8f8f8; border-bottom: 2px solid #ddd; padding: 8px 6px; text-align: left; font-weight: 600; color: #555; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
          tbody td { border-bottom: 1px solid #eee; padding: 7px 6px; }
          tbody tr:hover { background: #fafafa; }
          .section-title { font-size: 13px; font-weight: 700; color: #1a1a2e; margin: 24px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #eee; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 600; }
          .badge-green { background: #dcfce7; color: #16a34a; }
          .badge-amber { background: #fef3c7; color: #d97706; }
          .badge-red { background: #fee2e2; color: #dc2626; }
          @media print { .no-print { display: none !important; } }
        </style>
      </head>
      <body>
        <div class="report-page">
          <div class="report-header">
            <div class="logo-area">
              <div class="logo-icon">SF</div>
              <div>
                <div class="company-name">SalonFlow OS</div>
                <div class="company-tagline">ApexFlow Ecosystem</div>
              </div>
            </div>
            <div class="report-info">
              <div class="report-title">${selectedReport?.title || 'Report'}</div>
              <div class="report-date">Period: ${dateFrom} to ${dateTo}</div>
              <div class="report-date">Generated: ${now}</div>
            </div>
          </div>
          ${generatePrintContent()}
        </div>
        <div class="report-footer">
          <span>SalonFlow &copy; 2026 ApexFlow Ecosystem. All rights reserved.</span>
          <span>Page 1 of 1</span>
          <span class="confidential">CONFIDENTIAL</span>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => { printWindow.print() }, 500)
  }

  const generatePrintContent = () => {
    if (!reportData || !selectedReport) return '<p style="text-align:center;color:#999;padding:40px;">No data available</p>'
    const data = reportData as Record<string, unknown>
    const summary = (data.summary || {}) as Record<string, unknown>
    const details = data.details as Record<string, unknown> | undefined
    let html = ''

    // Summary metrics
    const summaryEntries = Object.entries(summary).filter(([, v]) => typeof v === 'number' || typeof v === 'string')
    if (summaryEntries.length > 0) {
      html += '<div class="metrics-grid">'
      summaryEntries.slice(0, 8).forEach(([key, value]) => {
        const isCurrency = /revenue|amount|expense|profit|tax|payroll|cost|earning|salary|discount|total|balance|position|lost|impact|value/i.test(key)
        const formatted = typeof value === 'number' ? (isCurrency ? PKR(value) : value.toLocaleString()) : String(value)
        const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
        html += `<div class="metric-card"><div class="label">${label}</div><div class="value">${formatted}</div></div>`
      })
      html += '</div>'
    }

    // Details sections
    if (details) {
      Object.entries(details).forEach(([sectionKey, sectionData]) => {
        if (Array.isArray(sectionData) && sectionData.length > 0) {
          const sectionLabel = sectionKey.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
          html += `<div class="section-title">${sectionLabel}</div>`
          const keys = Object.keys(sectionData[0] as Record<string, unknown>).filter(k => {
            const v = (sectionData[0] as Record<string, unknown>)[k]
            return typeof v !== 'object' || v === null
          })
          html += '<table><thead><tr>'
          keys.slice(0, 8).forEach(k => { html += `<th>${k.replace(/([A-Z])/g, ' $1').trim()}</th>` })
          html += '</tr></thead><tbody>'
          sectionData.slice(0, 30).forEach((row: unknown) => {
            const r = row as Record<string, unknown>
            html += '<tr>'
            keys.slice(0, 8).forEach(k => {
              const val = r[k]
              const isCurrency = /amount|price|revenue|cost|salary|earning|pay|discount|balance|value|tip/i.test(k)
              html += `<td>${val === null || val === undefined ? '—' : (typeof val === 'number' && isCurrency ? PKR(val) : String(val))}</td>`
            })
            html += '</tr>'
          })
          html += '</tbody></table>'
        }
      })
    }

    return html || '<p style="text-align:center;color:#999;padding:40px;">No detailed data available for this period</p>'
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

  const getAllExportRows = () => {
    if (!reportData || !selectedReport) return []
    const data = reportData as Record<string, unknown>
    const details = data.details as Record<string, unknown> | undefined
    const summary = data.summary as Record<string, unknown> | undefined
    let rows: Record<string, unknown>[] = []
    if (details) {
      Object.values(details).forEach((section) => {
        if (Array.isArray(section) && section.length > 0) {
          rows = rows.concat(flattenData(section as Record<string, unknown>[]))
        }
      })
    }
    if (rows.length === 0 && summary) {
      rows = [summary]
    }
    return rows
  }

  const exportCSV = () => {
    if (!reportData || !selectedReport) return
    try {
      const rows = getAllExportRows()
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
      const rows = getAllExportRows()
      if (rows.length === 0) { toast.error('No data to export'); return }
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

  // ─── Chart rendering helper ─────────────────────────────────────────
  const renderChart = (chartKey: string, chartData: Record<string, unknown>[]) => {
    if (!chartData || chartData.length === 0) return null

    // Determine the best chart type based on keys
    const sampleKeys = Object.keys(chartData[0])
    const hasNameKey = sampleKeys.includes('name') || sampleKeys.includes('date') || sampleKeys.includes('month') || sampleKeys.includes('hour') || sampleKeys.includes('day')
    const numericKeys = sampleKeys.filter(k => typeof chartData[0][k] === 'number')

    const label = chartKey.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
    const chartLabel = label.charAt(0).toUpperCase() + label.slice(1)

    // For pie chart (distribution data with name + count or type/plan/category + amount)
    const isPieData = (sampleKeys.includes('method') || sampleKeys.includes('type') || sampleKeys.includes('status') || sampleKeys.includes('tier') || sampleKeys.includes('plan') || sampleKeys.includes('category') || sampleKeys.includes('component') || sampleKeys.includes('gender'))
      && numericKeys.length <= 2

    if (isPieData) {
      const pieNameKey = sampleKeys.find(k => k === 'method' || k === 'type' || k === 'status' || k === 'tier' || k === 'plan' || k === 'category' || k === 'component' || k === 'gender' || k === 'range') || 'name'
      const pieValKey = numericKeys[0] || 'count'
      const pieConfig: ChartConfig = {}
      chartData.slice(0, 8).forEach((_, i) => {
        pieConfig[`item${i}`] = { label: `Item ${i + 1}`, color: CHART_COLORS[i % CHART_COLORS.length] }
      })
      return (
        <Card key={chartKey} className="border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{chartLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={pieConfig} className="h-[220px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={chartData} dataKey={pieValKey} nameKey={pieNameKey} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {chartData.slice(0, 8).map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )
    }

    // Bar chart for categorical data
    if (hasNameKey && numericKeys.length <= 3) {
      const xKey = sampleKeys.find(k => k === 'name' || k === 'hour' || k === 'date' || k === 'month' || k === 'day') || sampleKeys[0]
      const barConfig: ChartConfig = {}
      numericKeys.forEach((k, i) => {
        barConfig[k] = { label: k.replace(/([A-Z])/g, ' $1').trim(), color: CHART_COLORS[i % CHART_COLORS.length] }
      })
      return (
        <Card key={chartKey} className="border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{chartLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barConfig} className="h-[220px] w-full">
              <BarChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey={xKey} tickLine={false} axisLine={false} fontSize={10} />
                <YAxis tickLine={false} axisLine={false} fontSize={10} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {numericKeys.map((k, i) => (
                  <Bar key={k} dataKey={k} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )
    }

    // Area/Line chart for time series
    const xKey = sampleKeys.find(k => k === 'date' || k === 'month' || k === 'hour' || k === 'day') || sampleKeys[0]
    const lineConfig: ChartConfig = {}
    numericKeys.forEach((k, i) => {
      lineConfig[k] = { label: k.replace(/([A-Z])/g, ' $1').trim(), color: CHART_COLORS[i % CHART_COLORS.length] }
    })
    return (
      <Card key={chartKey} className="border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{chartLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={lineConfig} className="h-[220px] w-full">
            <AreaChart data={chartData} accessibilityLayer>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey={xKey} tickLine={false} axisLine={false} fontSize={10} />
              <YAxis tickLine={false} axisLine={false} fontSize={10} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {numericKeys.map((k, i) => (
                <Area key={k} type="monotone" dataKey={k} stroke={CHART_COLORS[i % CHART_COLORS.length]} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.12} strokeWidth={2} />
              ))}
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    )
  }

  // ─── Render Report Content ────────────────────────────────────────
  const renderReportContent = () => {
    if (generating) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <p className="text-sm text-muted-foreground">Generating report...</p>
        </div>
      )
    }

    if (!reportData) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <FileText className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Select a date range and generate the report</p>
        </div>
      )
    }

    const data = reportData as Record<string, unknown>
    const summary = (data.summary || {}) as Record<string, unknown>
    const details = data.details as Record<string, unknown> | undefined
    const charts = data.charts as Record<string, unknown> | undefined

    const now = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

    return (
      <div className="bg-muted/40 rounded-lg p-4 md:p-8 print:p-0 print:bg-white">
        {/* Letter-size document page */}
        <div
          ref={printRef}
          className="bg-white shadow-xl rounded-sm mx-auto max-w-[816px] min-h-[1056px] border border-border/20"
          style={{ aspectRatio: '8.5 / 11' }}
        >
          {/* ─── Professional Header ─────────────────────────────── */}
          <div className="px-8 md:px-12 pt-8 md:pt-10">
            <div className="flex items-start justify-between pb-4 border-b-2 border-rose-500">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                  SF
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground leading-tight">SalonFlow OS</h3>
                  <p className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground">ApexFlow Ecosystem</p>
                </div>
              </div>
              <div className="text-right">
                <h4 className="text-base font-bold text-rose-600 leading-tight">{selectedReport?.title}</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">Period: {dateFrom} to {dateTo}</p>
                <p className="text-[10px] text-muted-foreground">Generated: {now}</p>
              </div>
            </div>
          </div>

          {/* ─── Summary Metrics ────────────────────────────────── */}
          <div className="px-8 md:px-12 pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(summary)
                .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
                .slice(0, 8)
                .map(([key, value]) => {
                  const isCurrency = /revenue|amount|expense|profit|tax|payroll|cost|earning|salary|discount|total|balance|position|lost|impact|value/i.test(key)
                  const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
                  const displayLabel = label.charAt(0).toUpperCase() + label.slice(1)
                  return (
                    <div key={key} className="bg-muted/40 rounded-lg p-3 border border-border/30">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">{displayLabel}</p>
                      <p className="text-lg font-bold text-foreground mt-0.5">
                        {typeof value === 'number'
                          ? isCurrency ? PKR(value) : value.toLocaleString()
                          : String(value)}
                      </p>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* ─── Charts ─────────────────────────────────────────── */}
          {charts && Object.keys(charts).length > 0 && (
            <div className="px-8 md:px-12 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(charts).map(([key, value]) => {
                  if (Array.isArray(value) && value.length > 0) {
                    return renderChart(key, value as Record<string, unknown>[])
                  }
                  return null
                })}
              </div>
            </div>
          )}

          {/* ─── Details Tables ─────────────────────────────────── */}
          {details && (
            <div className="px-8 md:px-12 pt-6">
              {Object.entries(details).map(([sectionKey, sectionData]) => {
                if (!Array.isArray(sectionData) || sectionData.length === 0) return null
                const items = sectionData as Record<string, unknown>[]
                const sectionLabel = sectionKey.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
                const displayLabel = sectionLabel.charAt(0).toUpperCase() + sectionLabel.slice(1)
                const keys = Object.keys(items[0]).filter(k => typeof items[0][k] !== 'object' || items[0][k] === null)
                return (
                  <div key={sectionKey} className="mb-5">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 pb-1 border-b border-border/40">
                      {displayLabel}
                    </h5>
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {keys.slice(0, 8).map(key => (
                              <TableHead key={key} className="text-[9px] uppercase tracking-wider font-bold whitespace-nowrap py-2">
                                {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.slice(0, 20).map((item, idx) => (
                            <TableRow key={idx} className="hover:bg-muted/20">
                              {keys.slice(0, 8).map(key => {
                                const val = item[key]
                                const isCurrency = /amount|price|revenue|cost|salary|earning|pay|discount|balance|value|tip/i.test(key)
                                return (
                                  <TableCell key={key} className="text-[11px] py-1.5 whitespace-nowrap">
                                    {val === null || val === undefined
                                      ? '—'
                                      : typeof val === 'number'
                                        ? isCurrency ? PKR(val) : val.toLocaleString()
                                        : String(val).length > 35 ? String(val).slice(0, 35) + '...' : String(val)}
                                  </TableCell>
                                )
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ─── Professional Footer ────────────────────────────── */}
          <div className="px-8 md:px-12 mt-8">
            <div className="border-t border-border/40 pt-3 flex items-center justify-between text-[9px] text-muted-foreground">
              <span>SalonFlow &copy; 2026 ApexFlow Ecosystem. All rights reserved.</span>
              <span>Page 1 of 1</span>
              <span className="font-semibold text-rose-500 tracking-wider">CONFIDENTIAL</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Coming Soon View ──────────────────────────────────────────────
  const renderComingSoon = () => (
    <div className="bg-muted/40 rounded-lg p-4 md:p-8">
      <div className="bg-white shadow-xl rounded-sm mx-auto max-w-[816px] min-h-[600px] border border-border/20 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
          <Clock className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-foreground">{selectedReport?.title}</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          This report is currently under development. The data pipeline and analytics engine are being built to provide comprehensive insights.
        </p>
        <Badge variant="secondary" className="text-xs px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          Coming Soon
        </Badge>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</p>
            <p className="text-sm font-semibold text-amber-600">In Development</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Priority</p>
            <p className="text-sm font-semibold text-foreground">High</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ETA</p>
            <p className="text-sm font-semibold text-foreground">Next Update</p>
          </div>
        </div>
        <div className="px-8 md:px-12 mt-6 w-full">
          <div className="border-t border-border/40 pt-3 flex items-center justify-between text-[9px] text-muted-foreground">
            <span>SalonFlow &copy; 2026 ApexFlow Ecosystem. All rights reserved.</span>
            <span className="font-semibold text-rose-500 tracking-wider">CONFIDENTIAL</span>
          </div>
        </div>
      </div>
    </div>
  )

  // ─── Main Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Generate detailed reports with professional letter-size print-ready layouts
        </p>
      </div>

      {!selectedReport ? (
        /* ─── Report Type Grid with Categories ──────────────────── */
        <div className="space-y-8">
          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={activeCategory === null ? 'default' : 'outline'}
              size="sm"
              className={`h-8 text-xs ${activeCategory === null ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''}`}
              onClick={() => setActiveCategory(null)}
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1" />
              All Reports
            </Button>
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                className={`h-8 text-xs ${activeCategory === cat.id ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </Button>
            ))}
          </div>

          {/* Report Cards by Category */}
          {CATEGORIES
            .filter(c => !activeCategory || c.id === activeCategory)
            .map((category) => {
              const reports = reportTypes.filter(r => r.category === category.id)
              if (reports.length === 0) return null
              return (
                <div key={category.id}>
                  <div className="flex items-center gap-3 mb-4">
                    <Badge className={`text-[10px] px-2.5 py-0.5 ${category.color}`}>
                      {category.label}
                    </Badge>
                    <Separator className="flex-1" />
                    <span className="text-[10px] text-muted-foreground">{reports.length} reports</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {reports.map((report) => (
                      <Card
                        key={report.id}
                        className="cursor-pointer hover:shadow-lg transition-all duration-300 group border-border/50 hover:border-rose-200 dark:hover:border-rose-900 relative overflow-hidden"
                        onClick={() => handleSelectReport(report)}
                      >
                        {!report.hasApi && (
                          <div className="absolute top-2 right-2 z-10">
                            <Badge className="text-[8px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-0">
                              Soon
                            </Badge>
                          </div>
                        )}
                        <CardHeader className="pb-2">
                          <div className={`inline-flex p-2.5 rounded-xl w-fit ${report.color} transition-transform group-hover:scale-110`}>
                            {report.icon}
                          </div>
                          <CardTitle className="text-sm mt-2.5 group-hover:text-rose-600 transition-colors">
                            {report.title}
                          </CardTitle>
                          <CardDescription className="text-[11px] leading-tight">
                            {report.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0 pb-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs h-8 group-hover:bg-rose-50 group-hover:text-rose-600 group-hover:border-rose-200 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectReport(report)
                            }}
                          >
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {report.hasApi ? 'Generate' : 'Preview'}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
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
                  {!selectedReport.hasApi && (
                    <Badge className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-0">
                      Coming Soon
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[140px] text-xs" />
                  <span className="text-muted-foreground text-xs">to</span>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[140px] text-xs" />
                  <Button
                    size="sm"
                    className="h-9 bg-rose-600 hover:bg-rose-700 text-white"
                    onClick={() => generateReport()}
                    disabled={generating || !selectedReport.hasApi}
                  >
                    {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
                    Generate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons Bar */}
          {reportData && selectedReport.hasApi && (
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
          {selectedReport.hasApi ? renderReportContent() : renderComingSoon()}
        </div>
      )}
    </div>
  )
}
