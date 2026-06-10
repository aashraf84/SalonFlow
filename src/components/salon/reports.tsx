'use client'

import { useState } from 'react'
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

const formatCurrency = (amount: number) => `PKR ${amount.toLocaleString()}`

interface ReportType {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  apiEndpoint: string
}

const reportTypes: ReportType[] = [
  {
    id: 'appointments',
    title: 'Appointment Reports',
    description: 'Booking trends, status breakdown, peak hours',
    icon: <CalendarDays className="h-6 w-6" />,
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950',
    apiEndpoint: '/api/appointments',
  },
  {
    id: 'revenue',
    title: 'Revenue Reports',
    description: 'Income analysis, payment methods, trends',
    icon: <DollarSign className="h-6 w-6" />,
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950',
    apiEndpoint: '/api/finance',
  },
  {
    id: 'memberships',
    title: 'Membership Reports',
    description: 'Active plans, renewals, revenue from members',
    icon: <Award className="h-6 w-6" />,
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-950',
    apiEndpoint: '/api/memberships',
  },
  {
    id: 'staff',
    title: 'Staff Performance',
    description: 'Productivity, commissions, booking rates',
    icon: <UserCheck className="h-6 w-6" />,
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-950',
    apiEndpoint: '/api/staff',
  },
  {
    id: 'customers',
    title: 'Customer Reports',
    description: 'Demographics, retention, lifetime value',
    icon: <Users className="h-6 w-6" />,
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-950',
    apiEndpoint: '/api/customers',
  },
  {
    id: 'inventory',
    title: 'Inventory Reports',
    description: 'Stock levels, reorder alerts, usage patterns',
    icon: <Package className="h-6 w-6" />,
    color: 'text-orange-500 bg-orange-50 dark:bg-orange-950',
    apiEndpoint: '/api/inventory',
  },
  {
    id: 'financial',
    title: 'Financial Reports',
    description: 'P&L statement, expense analysis, cash flow',
    icon: <BarChart3 className="h-6 w-6" />,
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-950',
    apiEndpoint: '/api/finance',
  },
  {
    id: 'loyalty',
    title: 'Loyalty Reports',
    description: 'Points activity, tier distribution, rewards',
    icon: <Award className="h-6 w-6" />,
    color: 'text-pink-500 bg-pink-50 dark:bg-pink-950',
    apiEndpoint: '/api/loyalty',
  },
]

const revenueChartConfig: ChartConfig = {
  amount: { label: 'Amount', color: 'hsl(142, 71%, 45%)' },
}

export default function ReportsModule() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null)
  const [generating, setGenerating] = useState(false)

  const generateReport = async (report: ReportType) => {
    setGenerating(true)
    setReportData(null)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)

      const res = await fetch(`${report.apiEndpoint}?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setReportData(json.data)
      }
    } catch (err) {
      console.error('Failed to generate report:', err)
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

  // Export helpers
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

  const exportReport = (format: 'csv' | 'excel' | 'pdf') => {
    if (!reportData || !selectedReport) return

    try {
      let rows: Record<string, unknown>[] = []
      if (Array.isArray(reportData)) {
        rows = flattenData(reportData)
      } else if (typeof reportData === 'object') {
        // For object data, create a single-row or multi-row summary
        const entries: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(reportData as Record<string, unknown>)) {
          if (typeof value === 'number' || typeof value === 'string' || value === null) {
            entries[key] = value
          } else if (Array.isArray(value) && value.length > 0 && typeof value[0] !== 'object') {
            entries[key] = (value as unknown[]).join(', ')
          }
        }
        rows = [entries]

        // Also export sub-arrays as separate rows
        const subArrays = Object.entries(reportData as Record<string, unknown>)
          .filter(([, v]) => Array.isArray(v) && v.length > 0 && typeof (v as unknown[])[0] === 'object')
        for (const [key, arr] of subArrays) {
          const subRows = flattenData(arr as Record<string, unknown>[], key)
          rows.push(...subRows)
        }
      }

      if (rows.length === 0) {
        toast.error('No data to export')
        return
      }

      const headers = Object.keys(rows[0])

      if (format === 'csv' || format === 'excel') {
        const csvContent = [
          headers.join(','),
          ...rows.map((row) =>
            headers
              .map((h) => {
                const val = row[h]
                const str = val === null || val === undefined ? '' : String(val)
                return str.includes(',') || str.includes('"') || str.includes('\n')
                  ? `"${str.replace(/"/g, '""')}"`
                  : str
              })
              .join(',')
          ),
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedReport.id}-report.${format === 'excel' ? 'csv' : 'csv'}`
        a.click()
        URL.revokeObjectURL(url)
        toast.success(`${format === 'excel' ? 'Excel' : 'CSV'} exported successfully`)
      } else if (format === 'pdf') {
        // PDF - generate a simple text-based downloadable file
        const textContent = [
          `${selectedReport.title}`,
          `Generated: ${new Date().toLocaleString()}`,
          `${'='.repeat(60)}`,
          '',
          ...rows.map((row) =>
            headers.map((h) => `${h}: ${row[h] ?? '—'}`).join(' | ')
          ),
        ].join('\n')

        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedReport.id}-report.txt`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Report exported as text')
      }
    } catch {
      toast.error('Failed to export report')
    }
  }

  // Render report data based on type
  const renderReportContent = () => {
    if (generating) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Generating report...</p>
        </div>
      )
    }

    if (!reportData) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <FileText className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Select a date range and generate the report
          </p>
        </div>
      )
    }

    // Handle array data (appointments, staff, customers, etc.)
    if (Array.isArray(reportData)) {
      const items = reportData.slice(0, 20)
      if (items.length === 0) {
        return (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No data found for the selected period
          </div>
        )
      }
      const keys = Object.keys(items[0]).filter(
        (k) => typeof items[0][k] !== 'object' || items[0][k] === null
      )

      // Generate chart data for numeric fields
      const numericKeys = keys.filter(
        (k) => typeof items[0][k] === 'number' && k !== 'id'
      )

      return (
        <div className="space-y-6">
          {/* Chart if numeric data exists */}
          {numericKeys.length > 0 && (
            <ChartContainer config={revenueChartConfig} className="h-[250px] w-full">
              <BarChart
                data={items.slice(0, 12).map((item, i) => ({
                  name:
                    (item as Record<string, unknown>).name ||
                    (item as Record<string, unknown>).firstName ||
                    (item as Record<string, unknown>).category ||
                    `#${i + 1}`,
                  amount: Number((item as Record<string, unknown>)[numericKeys[0]]) || 0,
                }))}
                accessibilityLayer
              >
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}

          {/* Data Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {keys.slice(0, 6).map((key) => (
                    <TableHead key={key} className="capitalize text-xs">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx}>
                    {keys.slice(0, 6).map((key) => {
                      const val = (item as Record<string, unknown>)[key]
                      return (
                        <TableCell key={key} className="text-sm">
                          {val === null ? (
                            '—'
                          ) : typeof val === 'number' ? (
                            key.toLowerCase().includes('amount') ||
                            key.toLowerCase().includes('price') ||
                            key.toLowerCase().includes('revenue') ||
                            key.toLowerCase().includes('cost') ? (
                              formatCurrency(val)
                            ) : (
                              val.toLocaleString()
                            )
                          ) : typeof val === 'string' && val.length > 30 ? (
                            val.slice(0, 30) + '...'
                          ) : (
                            String(val)
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            Showing {items.length} of {reportData.length} records
          </div>
        </div>
      )
    }

    // Handle object data (finance summary, etc.)
    if (typeof reportData === 'object') {
      const entries = Object.entries(reportData as Record<string, unknown>)
        .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
        .slice(0, 12)

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {entries.map(([key, value]) => (
              <div key={key} className="rounded-lg border p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-lg font-bold mt-1">
                  {typeof value === 'number'
                    ? key.toLowerCase().includes('amount') ||
                      key.toLowerCase().includes('revenue') ||
                      key.toLowerCase().includes('expense') ||
                      key.toLowerCase().includes('profit')
                      ? formatCurrency(value)
                      : value.toLocaleString()
                    : String(value)}
                </p>
              </div>
            ))}
          </div>

          {/* Show sub-arrays if present */}
          {Object.entries(reportData as Record<string, unknown>)
            .filter(([, v]) => Array.isArray(v) && v.length > 0)
            .slice(0, 2)
            .map(([key, arr]) => {
              const items = (arr as Record<string, unknown>[]).slice(0, 5)
              if (items.length === 0) return null
              const subKeys = Object.keys(items[0]).filter(
                (k) => typeof items[0][k] !== 'object' || items[0][k] === null
              )
              return (
                <div key={key}>
                  <h4 className="text-sm font-semibold capitalize mb-2">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {subKeys.slice(0, 5).map((k) => (
                          <TableHead key={k} className="capitalize text-xs">
                            {k.replace(/([A-Z])/g, ' $1').trim()}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow key={idx}>
                          {subKeys.slice(0, 5).map((k) => {
                            const val = item[k]
                            return (
                              <TableCell key={k} className="text-xs">
                                {val === null
                                  ? '—'
                                  : typeof val === 'object'
                                  ? JSON.stringify(val).slice(0, 30)
                                  : String(val)}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            })}
        </div>
      )
    }

    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Unable to render report data
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Generate detailed reports and analyze your business data
        </p>
      </div>

      {!selectedReport ? (
        /* Report Type Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {reportTypes.map((report) => (
            <Card
              key={report.id}
              className="cursor-pointer hover:shadow-md transition-all group"
              onClick={() => handleSelectReport(report)}
            >
              <CardHeader>
                <div className={`inline-flex p-3 rounded-lg w-fit ${report.color}`}>
                  {report.icon}
                </div>
                <CardTitle className="text-sm mt-2 group-hover:text-primary transition-colors">
                  {report.title}
                </CardTitle>
                <CardDescription className="text-xs">
                  {report.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectReport(report)
                  }}
                >
                  Generate
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Report View */
        <div className="space-y-4">
          {/* Report Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className={`p-2 rounded-lg ${selectedReport.color}`}>
                {selectedReport.icon}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{selectedReport.title}</h2>
                <p className="text-xs text-muted-foreground">
                  {selectedReport.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 w-[140px]"
                />
                <span className="text-muted-foreground text-sm">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 w-[140px]"
                />
              </div>
              <Button
                size="sm"
                onClick={() => generateReport(selectedReport)}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <FileText className="h-4 w-4 mr-1" />
                )}
                Generate
              </Button>
            </div>
          </div>

          {/* Export Buttons */}
          {reportData && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs gap-1 py-1">
                <Download className="h-3 w-3" />
                Export as:
              </Badge>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => exportReport('pdf')}>
                <FileText className="h-3 w-3" />
                PDF
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => exportReport('excel')}>
                <FileSpreadsheet className="h-3 w-3" />
                Excel
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => exportReport('csv')}>
                <FileDown className="h-3 w-3" />
                CSV
              </Button>
            </div>
          )}

          {/* Report Content */}
          <Card>
            <CardContent className="pt-6">{renderReportContent()}</CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
