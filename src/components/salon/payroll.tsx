'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign, Plus, Users, CheckCircle2, Clock,
  Loader2, AlertTriangle, Wallet, TrendingUp,
  Printer, FileText, CalendarDays,
  BadgeDollarSign, Receipt, Banknote, PenLine,
  Trash2, CheckCheck, BarChart3,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from 'recharts'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

type PeriodStatus = 'open' | 'processing' | 'closed'
type RunStatus = 'pending' | 'approved' | 'paid'

interface StaffOption {
  id: string
  firstName: string
  lastName: string
  role: string
  commissionRate: number
}

interface PayrollPeriodData {
  id: string
  periodStart: string
  periodEnd: string
  payDate: string
  status: PeriodStatus
  createdAt: string
  updatedAt: string
  payrollRuns: PayrollRunData[]
  staffCount: number
  totalNetPay: number
}

interface PayrollRunData {
  id: string
  periodId: string
  staffId: string
  baseSalary: number
  commissionEarned: number
  tipsEarned: number
  overtimePay: number
  bonus: number
  deductions: number
  taxDeduction: number
  netPay: number
  hoursWorked: number
  overtimeHours: number
  status: RunStatus
  paidAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  staff: {
    id: string
    firstName: string
    lastName: string
    role: string
    email?: string
    phone?: string
    commissionRate?: number
  }
  period?: {
    id: string
    periodStart: string
    periodEnd: string
    payDate: string
    status: string
  }
}

interface PayrollRunStats {
  totalNetPay: number
  totalBaseSalary: number
  totalCommission: number
  totalTips: number
  totalOvertime: number
  totalBonus: number
  totalDeductions: number
  totalTax: number
  runCount: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `PKR ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function getPeriodStatusBadge(status: PeriodStatus): { label: string; className: string } {
  switch (status) {
    case 'open':
      return { label: 'Open', className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' }
    case 'processing':
      return { label: 'Processing', className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' }
    case 'closed':
      return { label: 'Closed', className: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/30 dark:text-slate-300 dark:border-slate-700' }
  }
}

function getRunStatusBadge(status: RunStatus): { label: string; className: string } {
  switch (status) {
    case 'pending':
      return { label: 'Pending', className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' }
    case 'approved':
      return { label: 'Approved', className: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800' }
    case 'paid':
      return { label: 'Paid', className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' }
  }
}

// ─── Chart Config ────────────────────────────────────────────────────────────

const chartConfig: ChartConfig = {
  baseSalary: { label: 'Base Salary', color: '#f43f5e' },
  commission: { label: 'Commission', color: '#ec4899' },
  tips: { label: 'Tips', color: '#f97316' },
  overtime: { label: 'Overtime', color: '#a855f7' },
  bonus: { label: 'Bonus', color: '#06b6d4' },
  deductions: { label: 'Deductions', color: '#64748b' },
  tax: { label: 'Tax', color: '#374151' },
}

// ─── Payroll Period Form ────────────────────────────────────────────────────

interface PeriodFormData {
  periodStart: string
  periodEnd: string
  payDate: string
}

function getDefaultPeriodForm(): PeriodFormData {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const payDay = new Date(now.getFullYear(), now.getMonth() + 1, 5)
  return {
    periodStart: firstDay.toISOString().split('T')[0],
    periodEnd: lastDay.toISOString().split('T')[0],
    payDate: payDay.toISOString().split('T')[0],
  }
}

function PeriodFormDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: PeriodFormData) => void
  loading: boolean
}) {
  const [form, setForm] = useState<PeriodFormData>(getDefaultPeriodForm)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-rose-500" />
            Create Payroll Period
          </DialogTitle>
          <DialogDescription>Define the payroll cycle dates and when staff will be paid.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="periodStart">Period Start</Label>
            <Input
              id="periodStart"
              type="date"
              value={form.periodStart}
              onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="periodEnd">Period End</Label>
            <Input
              id="periodEnd"
              type="date"
              value={form.periodEnd}
              onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payDate">Pay Date</Label>
            <Input
              id="payDate"
              type="date"
              value={form.payDate}
              onChange={(e) => setForm((f) => ({ ...f, payDate: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => onSubmit(form)}
            disabled={loading || !form.periodStart || !form.periodEnd || !form.payDate}
            className="bg-rose-500 hover:bg-rose-600 text-white"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Period
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Payroll Run Form ───────────────────────────────────────────────────────

interface RunFormData {
  staffId: string
  baseSalary: string
  commissionEarned: string
  tipsEarned: string
  overtimePay: string
  bonus: string
  deductions: string
  taxDeduction: string
  hoursWorked: string
  overtimeHours: string
  notes: string
}

function getRunFormFromEdit(editRun: PayrollRunData | null): RunFormData {
  if (editRun) {
    return {
      staffId: editRun.staffId,
      baseSalary: String(editRun.baseSalary),
      commissionEarned: String(editRun.commissionEarned),
      tipsEarned: String(editRun.tipsEarned),
      overtimePay: String(editRun.overtimePay),
      bonus: String(editRun.bonus),
      deductions: String(editRun.deductions),
      taxDeduction: String(editRun.taxDeduction),
      hoursWorked: String(editRun.hoursWorked),
      overtimeHours: String(editRun.overtimeHours),
      notes: editRun.notes || '',
    }
  }
  return {
    staffId: '', baseSalary: '0', commissionEarned: '0', tipsEarned: '0',
    overtimePay: '0', bonus: '0', deductions: '0', taxDeduction: '0',
    hoursWorked: '0', overtimeHours: '0', notes: '',
  }
}

function RunFormDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
  staffOptions,
  editRun,
  existingRunIds,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: RunFormData) => void
  loading: boolean
  staffOptions: StaffOption[]
  editRun: PayrollRunData | null
  existingRunIds: string[]
}) {
  const [form, setForm] = useState<RunFormData>(() => getRunFormFromEdit(editRun))

  const netPay = useMemo(() => {
    const b = parseFloat(form.baseSalary) || 0
    const c = parseFloat(form.commissionEarned) || 0
    const t = parseFloat(form.tipsEarned) || 0
    const o = parseFloat(form.overtimePay) || 0
    const bn = parseFloat(form.bonus) || 0
    const d = parseFloat(form.deductions) || 0
    const tx = parseFloat(form.taxDeduction) || 0
    return b + c + t + o + bn - d - tx
  }, [form])

  const availableStaff = useMemo(() => {
    if (editRun) return staffOptions
    return staffOptions.filter((s) => !existingRunIds.includes(s.id))
  }, [staffOptions, editRun, existingRunIds])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-500" />
            {editRun ? 'Edit Payroll Run' : 'Add Payroll Run'}
          </DialogTitle>
          <DialogDescription>
            {editRun ? 'Update payroll details for this staff member.' : 'Add a new payroll entry for a staff member.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Staff Selection */}
          <div className="space-y-2">
            <Label>Staff Member</Label>
            {editRun ? (
              <Input
                value={`${editRun.staff.firstName} ${editRun.staff.lastName}`}
                disabled
                className="bg-muted"
              />
            ) : (
              <Select
                value={form.staffId}
                onValueChange={(val) => setForm((f) => ({ ...f, staffId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {availableStaff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Earnings */}
          <div>
            <p className="text-sm font-semibold mb-2 text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Earnings
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Base Salary</Label>
                <Input type="number" min="0" step="0.01" value={form.baseSalary} onChange={(e) => setForm((f) => ({ ...f, baseSalary: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Commission Earned</Label>
                <Input type="number" min="0" step="0.01" value={form.commissionEarned} onChange={(e) => setForm((f) => ({ ...f, commissionEarned: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tips Earned</Label>
                <Input type="number" min="0" step="0.01" value={form.tipsEarned} onChange={(e) => setForm((f) => ({ ...f, tipsEarned: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Overtime Pay</Label>
                <Input type="number" min="0" step="0.01" value={form.overtimePay} onChange={(e) => setForm((f) => ({ ...f, overtimePay: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bonus</Label>
                <Input type="number" min="0" step="0.01" value={form.bonus} onChange={(e) => setForm((f) => ({ ...f, bonus: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <p className="text-sm font-semibold mb-2 text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Deductions
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Deductions</Label>
                <Input type="number" min="0" step="0.01" value={form.deductions} onChange={(e) => setForm((f) => ({ ...f, deductions: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tax Deduction</Label>
                <Input type="number" min="0" step="0.01" value={form.taxDeduction} onChange={(e) => setForm((f) => ({ ...f, taxDeduction: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Hours */}
          <div>
            <p className="text-sm font-semibold mb-2 text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Working Hours
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Hours Worked</Label>
                <Input type="number" min="0" step="0.5" value={form.hoursWorked} onChange={(e) => setForm((f) => ({ ...f, hoursWorked: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Overtime Hours</Label>
                <Input type="number" min="0" step="0.5" value={form.overtimeHours} onChange={(e) => setForm((f) => ({ ...f, overtimeHours: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
          </div>

          {/* Net Pay Preview */}
          <div className="rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 border border-rose-200/50 dark:border-rose-800/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">Net Pay (Auto-Calculated)</span>
              <span className="text-xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(netPay)}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => onSubmit(form)}
            disabled={loading || (!editRun && !form.staffId)}
            className="bg-rose-500 hover:bg-rose-600 text-white"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editRun ? 'Update Run' : 'Add Run'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Payslip Component ──────────────────────────────────────────────────────

function PayslipView({ run, onClose }: { run: PayrollRunData; onClose: () => void }) {
  const period = run.period
  const staffName = `${run.staff.firstName} ${run.staff.lastName}`
  const earnings = run.baseSalary + run.commissionEarned + run.tipsEarned + run.overtimePay + run.bonus
  const totalDeductions = run.deductions + run.taxDeduction

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto print:p-0 print:max-w-none print:max-h-none">
        <div className="print:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-rose-500" />
              Payslip Preview
            </DialogTitle>
            <DialogDescription>Review and print this payslip.</DialogDescription>
          </DialogHeader>
        </div>

        {/* ─── Payslip Content (Print Area) ─── */}
        <div id="payslip-content" className="print-area bg-white dark:bg-white text-black p-8 rounded-xl border print:border-0 print:rounded-0 print:p-10">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-rose-600 pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-rose-700 tracking-tight">SalonFlow OS</h1>
              <p className="text-xs text-gray-500 mt-0.5">Professional Salon & Spa Management</p>
              <p className="text-xs text-gray-400 mt-0.5">123 Beauty Lane, Suite 100, Karachi, Pakistan</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800">PAYSLIP</p>
              <p className="text-xs text-gray-500 mt-1">
                Period: {period ? `${formatDate(period.periodStart)} – ${formatDate(period.periodEnd)}` : 'N/A'}
              </p>
              <p className="text-xs text-gray-500">
                Pay Date: {period ? formatDate(period.payDate) : 'N/A'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Generated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Employee Details */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee Name</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">{staffName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5 capitalize">{run.staff.role}</p>
            </div>
            {run.staff.email && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</p>
                <p className="text-sm text-gray-700 mt-0.5">{run.staff.email}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hours Worked</p>
              <p className="text-sm text-gray-700 mt-0.5">{run.hoursWorked} hrs (OT: {run.overtimeHours} hrs)</p>
            </div>
          </div>

          {/* Earnings & Deductions */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Earnings */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b pb-1">Earnings</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Base Salary</span>
                  <span className="font-medium">{formatCurrency(run.baseSalary)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Commission</span>
                  <span className="font-medium">{formatCurrency(run.commissionEarned)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tips</span>
                  <span className="font-medium">{formatCurrency(run.tipsEarned)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Overtime Pay</span>
                  <span className="font-medium">{formatCurrency(run.overtimePay)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Bonus</span>
                  <span className="font-medium">{formatCurrency(run.bonus)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-1 mt-1 font-bold">
                  <span>Total Earnings</span>
                  <span className="text-rose-700">{formatCurrency(earnings)}</span>
                </div>
              </div>
            </div>
            {/* Deductions */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b pb-1">Deductions</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Deductions</span>
                  <span className="font-medium">{formatCurrency(run.deductions)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">{formatCurrency(run.taxDeduction)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-1 mt-1 font-bold">
                  <span>Total Deductions</span>
                  <span className="text-gray-800">{formatCurrency(totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay */}
          <div className="bg-rose-600 text-white rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider opacity-80">Net Pay</p>
              <p className="text-2xl font-bold">{formatCurrency(run.netPay)}</p>
            </div>
            <div className="text-right">
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Confidential – This document is for the named recipient only</p>
            <p className="text-[10px] text-gray-300 mt-1">SalonFlow OS – Powered by ApexFlow Ecosystem</p>
          </div>
        </div>

        <div className="print:hidden flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handlePrint} className="bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Print Payslip
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function PayrollSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
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
      <GlassCard variant="default" className="p-6" animateOnMount={false}>
        <Skeleton className="h-8 w-40 rounded-lg mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </GlassCard>
    </div>
  )
}

// ─── Main Payroll Module ────────────────────────────────────────────────────

export function PayrollModule() {
  const [periods, setPeriods] = useState<PayrollPeriodData[]>([])
  const [runs, setRuns] = useState<PayrollRunData[]>([])
  const [runStats, setRunStats] = useState<PayrollRunStats | null>(null)
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([])
  const [loading, setLoading] = useState(true)
  const [runLoading, setRunLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [activeTab, setActiveTab] = useState('periods')

  // Dialogs
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false)
  const [runDialogOpen, setRunDialogOpen] = useState(false)
  const [editRun, setEditRun] = useState<PayrollRunData | null>(null)
  const [payslipRun, setPayslipRun] = useState<PayrollRunData | null>(null)
  const [periodFormLoading, setPeriodFormLoading] = useState(false)
  const [runFormLoading, setRunFormLoading] = useState(false)

  // ─── Fetch Data ─────────────────────────────────────────────────────────

  const fetchPeriods = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/payroll')
      const json = await res.json()
      if (json.success) {
        setPeriods(json.data)
        // Auto-select first period if none selected
        if (!selectedPeriodId && json.data.length > 0) {
          setSelectedPeriodId(json.data[0].id)
        }
      }
    } catch {
      toast.error('Failed to load payroll periods')
    } finally {
      setLoading(false)
    }
  }, [selectedPeriodId])

  const fetchRuns = useCallback(async () => {
    if (!selectedPeriodId) return
    try {
      setRunLoading(true)
      const res = await fetch(`/api/payroll-runs?periodId=${selectedPeriodId}`)
      const json = await res.json()
      if (json.success) {
        setRuns(json.data)
        setRunStats(json.stats)
      }
    } catch {
      toast.error('Failed to load payroll runs')
    } finally {
      setRunLoading(false)
    }
  }, [selectedPeriodId])

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch('/api/staff')
      const json = await res.json()
      if (json.success) {
        setStaffOptions(json.data.map((s: { id: string; firstName: string; lastName: string; role: string; commissionRate: number }) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          role: s.role,
          commissionRate: s.commissionRate,
        })))
      }
    } catch {
      // Silently fail
    }
  }, [])

  useEffect(() => {
    fetchPeriods()
    fetchStaff()
  }, [fetchPeriods, fetchStaff])

  useEffect(() => {
    fetchRuns()
  }, [selectedPeriodId, fetchRuns])

  // ─── Period Actions ─────────────────────────────────────────────────────

  const handleCreatePeriod = async (data: PeriodFormData) => {
    try {
      setPeriodFormLoading(true)
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Payroll period created successfully')
        setPeriodDialogOpen(false)
        fetchPeriods()
      } else {
        toast.error(json.error || 'Failed to create period')
      }
    } catch {
      toast.error('Failed to create period')
    } finally {
      setPeriodFormLoading(false)
    }
  }

  const handleClosePeriod = async (periodId: string) => {
    try {
      setActionLoading(periodId)
      const res = await fetch(`/api/payroll/${periodId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Payroll period closed')
        fetchPeriods()
      } else {
        toast.error(json.error || 'Failed to close period')
      }
    } catch {
      toast.error('Failed to close period')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeletePeriod = async (periodId: string) => {
    try {
      setActionLoading(periodId)
      const res = await fetch(`/api/payroll/${periodId}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('Payroll period deleted')
        if (selectedPeriodId === periodId) {
          setSelectedPeriodId('')
        }
        fetchPeriods()
      } else {
        toast.error(json.error || 'Failed to delete period')
      }
    } catch {
      toast.error('Failed to delete period')
    } finally {
      setActionLoading(null)
    }
  }

  // ─── Run Actions ────────────────────────────────────────────────────────

  const handleCreateRun = async (data: RunFormData) => {
    try {
      setRunFormLoading(true)
      const res = await fetch('/api/payroll-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodId: selectedPeriodId,
          staffId: data.staffId,
          baseSalary: data.baseSalary,
          commissionEarned: data.commissionEarned,
          tipsEarned: data.tipsEarned,
          overtimePay: data.overtimePay,
          bonus: data.bonus,
          deductions: data.deductions,
          taxDeduction: data.taxDeduction,
          hoursWorked: data.hoursWorked,
          overtimeHours: data.overtimeHours,
          notes: data.notes,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Payroll run added')
        setRunDialogOpen(false)
        fetchRuns()
        fetchPeriods()
      } else {
        toast.error(json.error || 'Failed to add run')
      }
    } catch {
      toast.error('Failed to add run')
    } finally {
      setRunFormLoading(false)
    }
  }

  const handleEditRun = async (data: RunFormData) => {
    if (!editRun) return
    try {
      setRunFormLoading(true)
      const res = await fetch(`/api/payroll-runs/${editRun.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseSalary: data.baseSalary,
          commissionEarned: data.commissionEarned,
          tipsEarned: data.tipsEarned,
          overtimePay: data.overtimePay,
          bonus: data.bonus,
          deductions: data.deductions,
          taxDeduction: data.taxDeduction,
          hoursWorked: data.hoursWorked,
          overtimeHours: data.overtimeHours,
          notes: data.notes,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Payroll run updated')
        setRunDialogOpen(false)
        setEditRun(null)
        fetchRuns()
        fetchPeriods()
      } else {
        toast.error(json.error || 'Failed to update run')
      }
    } catch {
      toast.error('Failed to update run')
    } finally {
      setRunFormLoading(false)
    }
  }

  const handleApproveRun = async (runId: string) => {
    try {
      setActionLoading(runId)
      const res = await fetch(`/api/payroll-runs/${runId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Payroll run approved')
        fetchRuns()
        fetchPeriods()
      } else {
        toast.error(json.error || 'Failed to approve')
      }
    } catch {
      toast.error('Failed to approve')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePayRun = async (runId: string) => {
    try {
      setActionLoading(runId)
      const res = await fetch(`/api/payroll-runs/${runId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pay' }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Payroll run marked as paid')
        fetchRuns()
        fetchPeriods()
      } else {
        toast.error(json.error || 'Failed to mark as paid')
      }
    } catch {
      toast.error('Failed to mark as paid')
    } finally {
      setActionLoading(null)
    }
  }

  const handleBatchApprove = async () => {
    const pendingRuns = runs.filter((r) => r.status === 'pending')
    if (pendingRuns.length === 0) {
      toast.info('No pending runs to approve')
      return
    }
    try {
      setActionLoading('batch')
      const results = await Promise.allSettled(
        pendingRuns.map((r) =>
          fetch(`/api/payroll-runs/${r.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'approve' }),
          })
        )
      )
      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      toast.success(`${succeeded} of ${pendingRuns.length} runs approved`)
      fetchRuns()
      fetchPeriods()
    } catch {
      toast.error('Batch approval failed')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteRun = async (runId: string) => {
    try {
      setActionLoading(runId)
      const res = await fetch(`/api/payroll-runs/${runId}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('Payroll run deleted')
        fetchRuns()
        fetchPeriods()
      } else {
        toast.error(json.error || 'Failed to delete')
      }
    } catch {
      toast.error('Failed to delete')
    } finally {
      setActionLoading(null)
    }
  }

  // ─── Computed Data ──────────────────────────────────────────────────────

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === selectedPeriodId),
    [periods, selectedPeriodId]
  )

  const chartData = useMemo(() => {
    if (!runStats) return []
    return [
      { category: 'Base Salary', amount: runStats.totalBaseSalary, fill: '#f43f5e' },
      { category: 'Commission', amount: runStats.totalCommission, fill: '#ec4899' },
      { category: 'Tips', amount: runStats.totalTips, fill: '#f97316' },
      { category: 'Overtime', amount: runStats.totalOvertime, fill: '#a855f7' },
      { category: 'Bonus', amount: runStats.totalBonus, fill: '#06b6d4' },
      { category: 'Deductions', amount: runStats.totalDeductions, fill: '#64748b' },
      { category: 'Tax', amount: runStats.totalTax, fill: '#374151' },
    ].filter((d) => d.amount > 0)
  }, [runStats])

  const existingRunIds = useMemo(() => runs.map((r) => r.staffId), [runs])

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) return <PayrollSkeleton />

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Wallet className="w-7 h-7 text-rose-500" />
              Payroll Management
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Manage staff payroll, salary computation, and payslips.</p>
          </div>
          <Button
            onClick={() => setPeriodDialogOpen(true)}
            className="bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Period
          </Button>
        </div>

        {/* Metric Cards */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StaggerItem>
            <AnimatedMetricCard
              title="Total Periods"
              value={String(periods.length)}
              subtitle="All time"
              icon={CalendarDays}
              accentGradient="from-rose-500/20 to-pink-500/20"
              iconBg="bg-rose-500/10 text-rose-600 dark:text-rose-400"
              delay={0}
            />
          </StaggerItem>
          <StaggerItem>
            <AnimatedMetricCard
              title="Open Periods"
              value={String(periods.filter((p) => p.status === 'open' || p.status === 'processing').length)}
              subtitle="Active"
              icon={Clock}
              accentGradient="from-amber-500/20 to-orange-500/20"
              iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
              delay={0.05}
            />
          </StaggerItem>
          <StaggerItem>
            <AnimatedMetricCard
              title="Total Net Pay"
              value={formatCurrency(periods.reduce((sum, p) => sum + p.totalNetPay, 0))}
              subtitle="All periods"
              icon={DollarSign}
              accentGradient="from-emerald-500/20 to-teal-500/20"
              iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              delay={0.1}
            />
          </StaggerItem>
          <StaggerItem>
            <AnimatedMetricCard
              title="Staff in Payroll"
              value={String(runStats?.runCount || 0)}
              subtitle="Current period"
              icon={Users}
              accentGradient="from-violet-500/20 to-purple-500/20"
              iconBg="bg-violet-500/10 text-violet-600 dark:text-violet-400"
              delay={0.15}
            />
          </StaggerItem>
        </StaggerContainer>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="periods" className="data-[state=active]:bg-rose-500 data-[state=active]:text-white">
              <CalendarDays className="w-4 h-4 mr-1.5" />
              Periods
            </TabsTrigger>
            <TabsTrigger value="runs" className="data-[state=active]:bg-rose-500 data-[state=active]:text-white">
              <Receipt className="w-4 h-4 mr-1.5" />
              Payroll Runs
            </TabsTrigger>
            <TabsTrigger value="summary" className="data-[state=active]:bg-rose-500 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-1.5" />
              Summary
            </TabsTrigger>
          </TabsList>

          {/* ─── Periods Tab ──────────────────────────────────────────── */}
          <TabsContent value="periods">
            <GlassCard variant="default" className="p-0 overflow-hidden" animateOnMount={false}>
              <div className="p-4 border-b bg-gradient-to-r from-rose-50/50 to-pink-50/50 dark:from-rose-950/20 dark:to-pink-950/20">
                <h3 className="font-semibold flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-rose-500" />
                  Payroll Periods
                </h3>
              </div>
              {periods.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No payroll periods yet</p>
                  <p className="text-sm mt-1">Create your first payroll period to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period Start</TableHead>
                      <TableHead>Period End</TableHead>
                      <TableHead>Pay Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Staff</TableHead>
                      <TableHead className="text-right">Total Net Pay</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {periods.map((period) => {
                        const badge = getPeriodStatusBadge(period.status)
                        return (
                          <motion.tr
                            key={period.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="group hover:bg-muted/50 transition-colors"
                          >
                            <TableCell className="font-medium">{formatDate(period.periodStart)}</TableCell>
                            <TableCell>{formatDate(period.periodEnd)}</TableCell>
                            <TableCell>{formatDate(period.payDate)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5', badge.className)}>
                                {badge.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">{period.staffCount}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(period.totalNetPay)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedPeriodId(period.id)
                                    setActiveTab('runs')
                                  }}
                                  className="h-7 text-xs"
                                >
                                  View Runs
                                </Button>
                                {period.status !== 'closed' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleClosePeriod(period.id)}
                                    disabled={actionLoading === period.id}
                                    className="h-7 text-xs text-amber-600 hover:text-amber-700"
                                  >
                                    {actionLoading === period.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Close'}
                                  </Button>
                                )}
                                {period.status === 'open' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeletePeriod(period.id)}
                                    disabled={actionLoading === period.id}
                                    className="h-7 text-xs text-red-500 hover:text-red-600"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </motion.tr>
                        )
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              )}
            </GlassCard>
          </TabsContent>

          {/* ─── Payroll Runs Tab ──────────────────────────────────────── */}
          <TabsContent value="runs">
            <div className="space-y-4">
              {/* Period Selector + Actions */}
              <GlassCard variant="default" className="p-4" animateOnMount={false}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Label className="text-sm shrink-0">Period:</Label>
                    <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                      <SelectTrigger className="w-full sm:w-72">
                        <SelectValue placeholder="Select a period" />
                      </SelectTrigger>
                      <SelectContent>
                        {periods.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBatchApprove}
                      disabled={actionLoading === 'batch' || !selectedPeriodId}
                      className="flex items-center gap-1.5"
                    >
                      {actionLoading === 'batch' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                      Batch Approve
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditRun(null)
                        setRunDialogOpen(true)
                      }}
                      disabled={!selectedPeriodId || selectedPeriod?.status === 'closed'}
                      className="bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Run
                    </Button>
                  </div>
                </div>
              </GlassCard>

              {/* Runs Table */}
              {runLoading ? (
                <GlassCard variant="default" className="p-6" animateOnMount={false}>
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                </GlassCard>
              ) : !selectedPeriodId ? (
                <GlassCard variant="default" className="p-12 text-center" animateOnMount={false}>
                  <Receipt className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="font-medium text-muted-foreground">Select a payroll period</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Choose a period above to view payroll runs.</p>
                </GlassCard>
              ) : runs.length === 0 ? (
                <GlassCard variant="default" className="p-12 text-center" animateOnMount={false}>
                  <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="font-medium text-muted-foreground">No payroll runs yet</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Add a payroll run for this period.</p>
                </GlassCard>
              ) : (
                <GlassCard variant="default" className="p-0 overflow-hidden" animateOnMount={false}>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Staff Name</TableHead>
                          <TableHead className="text-right">Base Salary</TableHead>
                          <TableHead className="text-right">Commission</TableHead>
                          <TableHead className="text-right">Tips</TableHead>
                          <TableHead className="text-right">Overtime</TableHead>
                          <TableHead className="text-right">Bonus</TableHead>
                          <TableHead className="text-right">Deductions</TableHead>
                          <TableHead className="text-right">Tax</TableHead>
                          <TableHead className="text-right font-bold">Net Pay</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {runs.map((run) => {
                            const badge = getRunStatusBadge(run.status)
                            const isActioning = actionLoading === run.id
                            return (
                              <motion.tr
                                key={run.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="group hover:bg-muted/50 transition-colors"
                              >
                                <TableCell className="font-medium">
                                  {run.staff.firstName} {run.staff.lastName}
                                </TableCell>
                                <TableCell className="text-right">{formatCurrency(run.baseSalary)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(run.commissionEarned)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(run.tipsEarned)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(run.overtimePay)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(run.bonus)}</TableCell>
                                <TableCell className="text-right text-red-500">-{formatCurrency(run.deductions)}</TableCell>
                                <TableCell className="text-right text-red-500">-{formatCurrency(run.taxDeduction)}</TableCell>
                                <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400">
                                  {formatCurrency(run.netPay)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5', badge.className)}>
                                    {badge.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-0.5">
                                    {run.status === 'pending' && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleApproveRun(run.id)}
                                        disabled={isActioning}
                                        className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-600"
                                        title="Approve"
                                      >
                                        {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                      </Button>
                                    )}
                                    {run.status === 'approved' && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handlePayRun(run.id)}
                                        disabled={isActioning}
                                        className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-600"
                                        title="Mark as Paid"
                                      >
                                        {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Banknote className="w-3.5 h-3.5" />}
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setPayslipRun(run)}
                                      className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600"
                                      title="Print Payslip"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                    </Button>
                                    {run.status === 'pending' && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setEditRun(run)
                                            setRunDialogOpen(true)
                                          }}
                                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                          title="Edit"
                                        >
                                          <PenLine className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleDeleteRun(run.id)}
                                          disabled={isActioning}
                                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </motion.tr>
                            )
                          })}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                  {/* Totals Row */}
                  {runStats && (
                    <div className="border-t bg-gradient-to-r from-rose-50/50 to-pink-50/50 dark:from-rose-950/20 dark:to-pink-950/20 p-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-muted-foreground">Totals ({runStats.runCount} staff)</span>
                      <div className="flex items-center gap-4 text-xs font-medium">
                        <span>Base: {formatCurrency(runStats.totalBaseSalary)}</span>
                        <span>Comm: {formatCurrency(runStats.totalCommission)}</span>
                        <span>Tips: {formatCurrency(runStats.totalTips)}</span>
                        <span className="text-red-500">Ded: {formatCurrency(runStats.totalDeductions + runStats.totalTax)}</span>
                        <span className="text-sm font-bold text-rose-600 dark:text-rose-400">Net: {formatCurrency(runStats.totalNetPay)}</span>
                      </div>
                    </div>
                  )}
                </GlassCard>
              )}
            </div>
          </TabsContent>

          {/* ─── Summary Tab ──────────────────────────────────────────── */}
          <TabsContent value="summary">
            <div className="space-y-4">
              {/* Period Selector */}
              <GlassCard variant="default" className="p-4" animateOnMount={false}>
                <div className="flex items-center gap-2">
                  <Label className="text-sm shrink-0">Period:</Label>
                  <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                    <SelectTrigger className="w-full sm:w-72">
                      <SelectValue placeholder="Select a period" />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </GlassCard>

              {!selectedPeriodId ? (
                <GlassCard variant="default" className="p-12 text-center" animateOnMount={false}>
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="font-medium text-muted-foreground">Select a payroll period</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Choose a period to view the payroll summary.</p>
                </GlassCard>
              ) : (
                <>
                  {/* Summary Cards */}
                  <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StaggerItem>
                      <AnimatedMetricCard
                        title="Total Payroll"
                        value={formatCurrency(runStats?.totalNetPay || 0)}
                        subtitle={`${runStats?.runCount || 0} staff members`}
                        icon={Wallet}
                        accentGradient="from-rose-500/20 to-pink-500/20"
                        iconBg="bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        delay={0}
                      />
                    </StaggerItem>
                    <StaggerItem>
                      <AnimatedMetricCard
                        title="Total Earnings"
                        value={formatCurrency(
                          (runStats?.totalBaseSalary || 0) +
                          (runStats?.totalCommission || 0) +
                          (runStats?.totalTips || 0) +
                          (runStats?.totalOvertime || 0) +
                          (runStats?.totalBonus || 0)
                        )}
                        subtitle="Before deductions"
                        icon={TrendingUp}
                        accentGradient="from-emerald-500/20 to-teal-500/20"
                        iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        delay={0.05}
                      />
                    </StaggerItem>
                    <StaggerItem>
                      <AnimatedMetricCard
                        title="Total Deductions"
                        value={formatCurrency((runStats?.totalDeductions || 0) + (runStats?.totalTax || 0))}
                        subtitle="Deductions + Tax"
                        icon={AlertTriangle}
                        accentGradient="from-amber-500/20 to-orange-500/20"
                        iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        delay={0.1}
                      />
                    </StaggerItem>
                  </StaggerContainer>

                  {/* Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Category Breakdown */}
                    <GlassCard variant="default" className="p-6" animateOnMount={false}>
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <BadgeDollarSign className="w-4 h-4 text-rose-500" />
                        Breakdown by Category
                      </h3>
                      <div className="space-y-3">
                        {[
                          { label: 'Base Salary', value: runStats?.totalBaseSalary || 0, color: 'bg-rose-500' },
                          { label: 'Commission', value: runStats?.totalCommission || 0, color: 'bg-pink-500' },
                          { label: 'Tips', value: runStats?.totalTips || 0, color: 'bg-orange-500' },
                          { label: 'Overtime Pay', value: runStats?.totalOvertime || 0, color: 'bg-violet-500' },
                          { label: 'Bonus', value: runStats?.totalBonus || 0, color: 'bg-cyan-500' },
                          { label: 'Deductions', value: runStats?.totalDeductions || 0, color: 'bg-slate-500' },
                          { label: 'Tax', value: runStats?.totalTax || 0, color: 'bg-gray-700' },
                        ].map((item) => {
                          const maxVal = Math.max(runStats?.totalNetPay || 1, 1)
                          const pct = Math.min((item.value / maxVal) * 100, 100)
                          return (
                            <div key={item.label} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{item.label}</span>
                                <span className="font-semibold">{formatCurrency(item.value)}</span>
                              </div>
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <motion.div
                                  className={cn('h-full rounded-full', item.color)}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </GlassCard>

                    {/* Bar Chart */}
                    <GlassCard variant="default" className="p-6" animateOnMount={false}>
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-rose-500" />
                        Payroll Distribution
                      </h3>
                      {chartData.length > 0 ? (
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                          <RechartsBarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                            <YAxis dataKey="category" type="category" width={80} tick={{ fontSize: 12 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </RechartsBarChart>
                        </ChartContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                          No data for chart
                        </div>
                      )}
                    </GlassCard>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ─── Dialogs ────────────────────────────────────────────────────── */}
      <PeriodFormDialog
        open={periodDialogOpen}
        onOpenChange={setPeriodDialogOpen}
        onSubmit={handleCreatePeriod}
        loading={periodFormLoading}
      />

      <RunFormDialog
        key={editRun ? `edit-${editRun.id}` : 'new'}
        open={runDialogOpen}
        onOpenChange={(open) => {
          setRunDialogOpen(open)
          if (!open) setEditRun(null)
        }}
        onSubmit={editRun ? handleEditRun : handleCreateRun}
        loading={runFormLoading}
        staffOptions={staffOptions}
        editRun={editRun}
        existingRunIds={existingRunIds}
      />

      {/* Payslip */}
      {payslipRun && (
        <PayslipView
          run={payslipRun}
          onClose={() => setPayslipRun(null)}
        />
      )}

      {/* ─── Print Styles ────────────────────────────────────────────────── */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 40px;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:max-w-none {
            max-width: none !important;
          }
          .print\\:max-h-none {
            max-height: none !important;
          }
          .print\\:rounded-0 {
            border-radius: 0 !important;
          }
          .print\\:border-0 {
            border: none !important;
          }
        }
      `}</style>
    </>
  )
}
