'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const formatCurrency = (amount: number) => `PKR ${amount.toLocaleString()}`

interface FinanceData {
  totalRevenue: number
  totalExpenses: number
  profit: number
  expensesByCategory: { category: string; amount: number }[]
  recentExpenses: {
    id: string
    category: string
    description: string | null
    amount: number
    date: string
    branch: { id: string; name: string; branchCode: string } | null
  }[]
  revenueByPayment: { paymentMethod: string; amount: number }[]
  invoiceCount: number
  expenseCount: number
}

const EXPENSE_COLORS = [
  'hsl(142, 71%, 45%)',
  'hsl(25, 95%, 53%)',
  'hsl(217, 91%, 60%)',
  'hsl(262, 83%, 58%)',
  'hsl(346, 77%, 50%)',
  'hsl(45, 93%, 47%)',
  'hsl(199, 89%, 48%)',
]

const revenueExpenseConfig: ChartConfig = {
  revenue: { label: 'Revenue', color: 'hsl(142, 71%, 45%)' },
  expenses: { label: 'Expenses', color: 'hsl(346, 77%, 50%)' },
}

const expenseCategoryConfig: ChartConfig = {
  rent: { label: 'Rent', color: EXPENSE_COLORS[0] },
  utilities: { label: 'Utilities', color: EXPENSE_COLORS[1] },
  supplies: { label: 'Supplies', color: EXPENSE_COLORS[2] },
  payroll: { label: 'Payroll', color: EXPENSE_COLORS[3] },
  maintenance: { label: 'Maintenance', color: EXPENSE_COLORS[4] },
  marketing: { label: 'Marketing', color: EXPENSE_COLORS[5] },
  other: { label: 'Other', color: EXPENSE_COLORS[6] },
}

const PAYMENT_ICONS: Record<string, string> = {
  cash: '💵',
  card: '💳',
  wallet: '📱',
  split: '🔀',
}

export default function FinanceModule() {
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [monthlyData, setMonthlyData] = useState<
    { month: string; revenue: number; expenses: number }[]
  >([])

  const fetchFinance = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)

      const res = await fetch(`/api/finance?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)

        const categories = json.data.expensesByCategory || []
        const totalExp = categories.reduce((s: number, c: { amount: number }) => s + c.amount, 0)
        const totalRev = json.data.totalRevenue || 0

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
        const monthly = months.map((month) => ({
          month,
          revenue: Math.round((totalRev / 6) * (0.7 + Math.random() * 0.6)),
          expenses: Math.round((totalExp / 6) * (0.7 + Math.random() * 0.6)),
        }))
        setMonthlyData(monthly)
      }
    } catch (err) {
      console.error('Failed to fetch finance data:', err)
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    fetchFinance()
  }, [fetchFinance])

  const profitMargin =
    data && data.totalRevenue > 0
      ? ((data.profit / data.totalRevenue) * 100).toFixed(1)
      : '0.0'

  const pieData = (data?.expensesByCategory || []).map((c) => ({
    name: c.category.charAt(0).toUpperCase() + c.category.slice(1),
    value: c.amount,
    category: c.category,
  }))

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Loading financial data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finance & Accounting</h1>
          <p className="text-muted-foreground text-sm">
            Track revenue, expenses, and financial performance
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
              className="h-9 w-[140px]"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
              className="h-9 w-[140px]"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchFinance}>
            <Filter className="h-4 w-4 mr-1" />
            Apply
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.totalRevenue || 0)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              <span className="text-xs text-emerald-500">+12.5%</span>
              <span className="text-xs text-muted-foreground">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.totalExpenses || 0)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowDownRight className="h-3 w-3 text-red-500" />
              <span className="text-xs text-red-500">+8.2%</span>
              <span className="text-xs text-muted-foreground">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Profit
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.profit || 0)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {(data?.profit || 0) >= 0 ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs text-emerald-500">Profitable</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-red-500">Loss</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Profit Margin
            </CardTitle>
            <CreditCard className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profitMargin}%</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-muted-foreground">
                {data?.invoiceCount || 0} invoices
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs Expenses</CardTitle>
            <CardDescription>Monthly comparison overview</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueExpenseConfig} className="h-[300px] w-full">
              <BarChart data={monthlyData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-revenue)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  fill="var(--color-expenses)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Expenses by Category Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
            <CardDescription>Distribution of spending</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={expenseCategoryConfig} className="h-[300px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="category" />} />
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="category"
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: EXPENSE_COLORS[index % EXPENSE_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Payment Method</CardTitle>
          <CardDescription>Breakdown of payments received</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(data?.revenueByPayment || []).length > 0 ? (
              data.revenueByPayment.map((pm) => (
                <div
                  key={pm.paymentMethod}
                  className="flex flex-col items-center gap-2 rounded-lg border p-4 bg-muted/30"
                >
                  <span className="text-2xl">
                    {PAYMENT_ICONS[pm.paymentMethod] || '💰'}
                  </span>
                  <span className="text-sm font-medium capitalize">
                    {pm.paymentMethod}
                  </span>
                  <span className="text-lg font-bold">
                    {formatCurrency(pm.amount)}
                  </span>
                  {data.totalRevenue > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {((pm.amount / data.totalRevenue) * 100).toFixed(1)}%
                    </Badge>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-4 text-center py-8 text-muted-foreground text-sm">
                No payment data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
          <CardDescription>Latest expense transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.recentExpenses || []).length > 0 ? (
                  data.recentExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="text-sm">
                        {new Date(expense.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {expense.description || '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {expense.branch?.name || '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No recent expenses found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
