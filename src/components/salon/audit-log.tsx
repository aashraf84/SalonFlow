'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Search, Download, ChevronLeft, ChevronRight,
  FileText, Clock, Filter, Loader2,
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuditLogData {
  id: string
  userId: string | null
  action: string
  entity: string
  entityId: string | null
  details: string | null
  ipAddress: string | null
  createdAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimestamp(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function getActionBadge(action: string) {
  switch (action.toLowerCase()) {
    case 'create':
      return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">Create</Badge>
    case 'update':
      return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20">Update</Badge>
    case 'delete':
      return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20">Delete</Badge>
    case 'login':
      return <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 hover:bg-sky-500/20">Login</Badge>
    case 'logout':
      return <Badge className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/20">Logout</Badge>
    default:
      return <Badge variant="outline" className="capitalize">{action}</Badge>
  }
}

// ─── Entity types for filter ─────────────────────────────────────────────────

const ENTITY_TYPES = [
  'Appointment', 'Customer', 'Staff', 'Service', 'Invoice', 'Payment',
  'Inventory', 'Coupon', 'Membership', 'GiftCard', 'Branch', 'Room',
  'Expense', 'Shift', 'Attendance', 'Tip', 'Feedback', 'MarketingCampaign',
  'PurchaseOrder', 'Supplier',
]

const ACTION_TYPES = ['create', 'update', 'delete', 'login', 'logout']

const PAGE_SIZE = 20

// ─── Main Component ──────────────────────────────────────────────────────────

export function AuditLogModule() {
  const [logs, setLogs] = useState<AuditLogData[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)

  // Filters
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchText, setSearchText] = useState('')

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('take', PAGE_SIZE.toString())
      params.set('skip', (currentPage * PAGE_SIZE).toString())
      if (entityFilter !== 'all') params.set('entity', entityFilter)
      if (actionFilter !== 'all') params.set('action', actionFilter)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const res = await fetch(`/api/audit-logs?${params}`)
      const json = await res.json()
      if (json.success) {
        setLogs(json.data)
        setTotal(json.pagination.total)
      }
    } catch {
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [currentPage, entityFilter, actionFilter, startDate, endDate])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0)
  }, [entityFilter, actionFilter, startDate, endDate])

  const exportCSV = () => {
    try {
      const headers = ['Timestamp', 'User ID', 'Action', 'Entity', 'Entity ID', 'Details', 'IP Address']
      const rows = logs.map((log) => [
        formatTimestamp(log.createdAt),
        log.userId || '',
        log.action,
        log.entity,
        log.entityId || '',
        (log.details || '').replace(/"/g, '""'),
        log.ipAddress || '',
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Audit log exported')
    } catch {
      toast.error('Failed to export audit log')
    }
  }

  // Filter logs by search text (client-side)
  const filteredLogs = searchText
    ? logs.filter((log) =>
        JSON.stringify(log).toLowerCase().includes(searchText.toLowerCase())
      )
    : logs

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Audit Log</h2>
          <p className="text-sm text-muted-foreground">Track all system activities and changes</p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2">
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StaggerItem>
          <AnimatedMetricCard
            title="Total Events"
            value={total.toLocaleString()}
            icon={FileText}
            iconBg="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Current Page"
            value={`${currentPage + 1} of ${totalPages || 1}`}
            icon={Shield}
            iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            accentGradient="from-emerald-500/20 to-green-500/20"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Events Showing"
            value={filteredLogs.length.toString()}
            icon={Filter}
            iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            accentGradient="from-amber-500/20 to-yellow-500/20"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Latest Event"
            value={logs.length > 0 ? new Date(logs[0]?.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
            icon={Clock}
            iconBg="bg-sky-500/10 text-sky-600 dark:text-sky-400"
            accentGradient="from-sky-500/20 to-cyan-500/20"
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Filters */}
      <GlassCard variant="flat" className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {ENTITY_TYPES.map((entity) => (
                <SelectItem key={entity} value={entity.toLowerCase()}>{entity}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {ACTION_TYPES.map((action) => (
                <SelectItem key={action} value={action} className="capitalize">{action}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full sm:w-[140px]" />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full sm:w-[140px]" />
          </div>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard variant="default" className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50">
                <TableHead className="text-xs font-semibold">Timestamp</TableHead>
                <TableHead className="text-xs font-semibold">User ID</TableHead>
                <TableHead className="text-xs font-semibold">Action</TableHead>
                <TableHead className="text-xs font-semibold">Entity</TableHead>
                <TableHead className="text-xs font-semibold">Entity ID</TableHead>
                <TableHead className="text-xs font-semibold">Details</TableHead>
                <TableHead className="text-xs font-semibold">IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Shield className="size-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No audit logs found</p>
                    <p className="text-xs mt-1">System activities will appear here</p>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {filteredLogs.map((log) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="border-b border-border/30 hover:bg-foreground/[0.02] transition-colors"
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs font-mono bg-foreground/5 px-1.5 py-0.5 rounded">
                          {log.userId ? log.userId.substring(0, 8) + '...' : '—'}
                        </code>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        <span className="text-sm font-medium capitalize">{log.entity}</span>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs font-mono bg-foreground/5 px-1.5 py-0.5 rounded">
                          {log.entityId ? log.entityId.substring(0, 8) + '...' : '—'}
                        </code>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-xs text-muted-foreground truncate">{log.details || '—'}</p>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs font-mono bg-foreground/5 px-1.5 py-0.5 rounded">
                          {log.ipAddress || '—'}
                        </code>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i
                } else if (currentPage < 2) {
                  pageNum = i
                } else if (currentPage > totalPages - 3) {
                  pageNum = totalPages - 5 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'w-8 h-8 p-0',
                      currentPage === pageNum && 'bg-gradient-to-r from-rose-500 to-pink-600 text-white'
                    )}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum + 1}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
