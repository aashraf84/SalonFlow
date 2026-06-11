'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Truck,
  FileText,
  Plus,
  Search,
  Star,
  Pencil,
  Trash2,
  Eye,
  PackageCheck,
  X,
  ChevronDown,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileBadge,
  StickyNote,
  ArrowRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { GlassCard, AnimatedMetricCard } from '@/components/salon/glass-card'

// ─── Constants ──────────────────────────────────────────────────────────────

const formatCurrency = (amount: number) => `PKR ${amount.toLocaleString()}`

const PAYMENT_TERMS = [
  { value: 'net_15', label: 'Net 15' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_60', label: 'Net 60' },
  { value: 'cod', label: 'COD' },
]

const PO_STATUSES: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  sent: { label: 'Sent', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300' },
  confirmed: { label: 'Confirmed', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  partially_received: { label: 'Partial', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  received: { label: 'Received', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface Supplier {
  id: string
  name: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  country: string
  taxId: string | null
  paymentTerms: string
  rating: number
  notes: string | null
  status: string
  createdAt: string
  updatedAt: string
  _count?: { purchaseOrders: number }
}

interface Product {
  id: string
  name: string
  sku: string
  unit: string
  costPrice: number
  isActive: boolean
}

interface Branch {
  id: string
  name: string
  branchCode: string
}

interface PurchaseOrderItem {
  id: string
  purchaseOrderId: string
  productId: string
  quantity: number
  receivedQty: number
  unitCost: number
  total: number
  product: { id: string; name: string; sku: string; unit: string }
}

interface PurchaseOrder {
  id: string
  poNumber: string
  supplierId: string
  branchId: string
  orderDate: string
  expectedDate: string | null
  receivedDate: string | null
  status: string
  subtotal: number
  taxAmount: number
  shippingCost: number
  totalAmount: number
  notes: string | null
  createdAt: string
  updatedAt: string
  supplier: { id: string; name: string; contactPerson?: string | null; status?: string }
  branch: { id: string; name: string; branchCode: string }
  items?: PurchaseOrderItem[]
  _count?: { items: number }
}

// ─── Star Rating Component ──────────────────────────────────────────────────

function StarRating({ rating, interactive = false, onChange }: { rating: number; interactive?: boolean; onChange?: (r: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
        >
          <Star
            className={`size-3.5 ${
              star <= rating
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-gray-300 dark:text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

// ─── Status Badge ───────────────────────────────────────────────────────────

function SupplierStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' },
    inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    blacklisted: { label: 'Blacklisted', color: 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300' },
  }
  const c = config[status] || config.inactive
  return <Badge variant="secondary" className={`text-[10px] font-semibold px-2 py-0.5 ${c.color}`}>{c.label}</Badge>
}

// ─── PO Status Badge ────────────────────────────────────────────────────────

function POStatusBadge({ status }: { status: string }) {
  const c = PO_STATUSES[status] || PO_STATUSES.draft
  return <Badge variant="secondary" className={`text-[10px] font-semibold px-2 py-0.5 ${c.color}`}>{c.label}</Badge>
}

// ─── Empty Supplier Form ────────────────────────────────────────────────────

const emptySupplierForm = {
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: 'Pakistan',
  taxId: '',
  paymentTerms: 'net_30',
  rating: 5,
  notes: '',
  status: 'active',
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function SuppliersModule() {
  // State
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [poSearchQuery, setPoSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Supplier dialog
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm)
  const [submitting, setSubmitting] = useState(false)

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // PO dialog
  const [poDialogOpen, setPoDialogOpen] = useState(false)
  const [poForm, setPoForm] = useState({
    supplierId: '',
    branchId: '',
    expectedDate: '',
    notes: '',
    taxAmount: 0,
    shippingCost: 0,
    items: [] as { productId: string; quantity: number; unitCost: number }[],
  })

  // PO Detail dialog
  const [poDetailOpen, setPoDetailOpen] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)

  // Receive PO dialog
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false)
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null)
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({})

  // ─── Fetch Data ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const [supRes, poRes, prodRes, brRes] = await Promise.all([
        fetch('/api/suppliers'),
        fetch('/api/purchase-orders'),
        fetch('/api/inventory').then(() => fetch('/api/services')).catch(() => null),
        fetch('/api/branches'),
      ])

      const supData = await supRes.json()
      const poData = await poRes.json()
      const brData = await brRes.json()

      if (supData.success) setSuppliers(supData.data)
      if (poData.success) setPurchaseOrders(poData.data)
      if (brData.success) setBranches(brData.data)

      // Fetch products separately
      try {
        const prodRes2 = await fetch('/api/inventory')
        const prodData2 = await prodRes2.json()
        if (prodData2.success && Array.isArray(prodData2.data)) {
          // Extract unique products from inventory items
          const prodMap = new Map<string, Product>()
          prodData2.data.forEach((item: { product: Product; productId: string }) => {
            if (!prodMap.has(item.productId)) {
              prodMap.set(item.productId, item.product)
            }
          })
          setProducts(Array.from(prodMap.values()))
        }
      } catch {
        // Products fetch is optional
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await fetchData()
      setLoading(false)
    }
    load()
  }, [fetchData])

  // ─── Supplier Handlers ─────────────────────────────────────────────────

  const openAddSupplier = () => {
    setEditingSupplier(null)
    setSupplierForm(emptySupplierForm)
    setSupplierDialogOpen(true)
  }

  const openEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setSupplierForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      country: supplier.country,
      taxId: supplier.taxId || '',
      paymentTerms: supplier.paymentTerms,
      rating: supplier.rating,
      notes: supplier.notes || '',
      status: supplier.status,
    })
    setSupplierDialogOpen(true)
  }

  const handleSaveSupplier = async () => {
    if (!supplierForm.name.trim()) {
      toast.error('Supplier name is required')
      return
    }
    setSubmitting(true)
    try {
      const url = editingSupplier ? `/api/suppliers/${editingSupplier.id}` : '/api/suppliers'
      const method = editingSupplier ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierForm),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(editingSupplier ? 'Supplier updated' : 'Supplier created')
        setSupplierDialogOpen(false)
        await fetchData()
      } else {
        toast.error(data.error || 'Failed to save supplier')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSupplier = async () => {
    if (!deletingId) return
    try {
      const res = await fetch(`/api/suppliers/${deletingId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Supplier deleted')
        setDeleteDialogOpen(false)
        setDeletingId(null)
        await fetchData()
      } else {
        toast.error(data.error || 'Failed to delete supplier')
      }
    } catch {
      toast.error('Network error')
    }
  }

  // ─── Purchase Order Handlers ───────────────────────────────────────────

  const openCreatePO = () => {
    setPoForm({
      supplierId: '',
      branchId: '',
      expectedDate: '',
      notes: '',
      taxAmount: 0,
      shippingCost: 0,
      items: [],
    })
    setPoDialogOpen(true)
  }

  const addPOItem = () => {
    setPoForm(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1, unitCost: 0 }],
    }))
  }

  const removePOItem = (index: number) => {
    setPoForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const updatePOItem = (index: number, field: string, value: string | number) => {
    setPoForm(prev => {
      const items = [...prev.items]
      items[index] = { ...items[index], [field]: value }
      // Auto-fill unitCost when product is selected
      if (field === 'productId') {
        const product = products.find(p => p.id === value)
        if (product) {
          items[index].unitCost = product.costPrice
        }
      }
      return { ...prev, items }
    })
  }

  const poSubtotal = poForm.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
  const poTotal = poSubtotal + poForm.taxAmount + poForm.shippingCost

  const handleCreatePO = async () => {
    if (!poForm.supplierId || !poForm.branchId || poForm.items.length === 0) {
      toast.error('Please select a supplier, branch, and add at least one item')
      return
    }
    if (poForm.items.some(item => !item.productId)) {
      toast.error('Please select a product for all line items')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: poForm.supplierId,
          branchId: poForm.branchId,
          expectedDate: poForm.expectedDate || null,
          notes: poForm.notes || null,
          taxAmount: poForm.taxAmount,
          shippingCost: poForm.shippingCost,
          items: poForm.items,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Purchase order created')
        setPoDialogOpen(false)
        await fetchData()
      } else {
        toast.error(data.error || 'Failed to create purchase order')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdatePOStatus = async (poId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/purchase-orders/${poId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`PO status updated to ${newStatus.replace('_', ' ')}`)
        await fetchData()
      } else {
        toast.error(data.error || 'Failed to update status')
      }
    } catch {
      toast.error('Network error')
    }
  }

  // ─── View PO Detail ────────────────────────────────────────────────────

  const openPODetail = async (po: PurchaseOrder) => {
    try {
      const res = await fetch(`/api/purchase-orders/${po.id}`)
      const data = await res.json()
      if (data.success) {
        setSelectedPO(data.data)
        setPoDetailOpen(true)
      }
    } catch {
      toast.error('Failed to load purchase order details')
    }
  }

  // ─── Receive PO ────────────────────────────────────────────────────────

  const openReceivePO = async (po: PurchaseOrder) => {
    try {
      const res = await fetch(`/api/purchase-orders/${po.id}`)
      const data = await res.json()
      if (data.success && data.data.items) {
        setReceivingPO(data.data)
        const initQty: Record<string, number> = {}
        data.data.items.forEach((item: PurchaseOrderItem) => {
          initQty[item.id] = 0
        })
        setReceiveQuantities(initQty)
        setReceiveDialogOpen(true)
      }
    } catch {
      toast.error('Failed to load purchase order')
    }
  }

  const handleReceivePO = async () => {
    if (!receivingPO) return
    const receivedItems = Object.entries(receiveQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([id, receivedQty]) => ({ id, receivedQty }))

    if (receivedItems.length === 0) {
      toast.error('Please enter received quantities')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/purchase-orders/${receivingPO.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receivedItems }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Items received and inventory updated')
        setReceiveDialogOpen(false)
        setReceivingPO(null)
        await fetchData()
      } else {
        toast.error(data.error || 'Failed to receive items')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Filtering ─────────────────────────────────────────────────────────

  const filteredSuppliers = suppliers.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      (s.contactPerson?.toLowerCase() || '').includes(q) ||
      (s.email?.toLowerCase() || '').includes(q) ||
      (s.phone || '').includes(q) ||
      (s.city?.toLowerCase() || '').includes(q)
    )
  })

  const filteredPOs = purchaseOrders.filter(po => {
    if (!poSearchQuery) return true
    const q = poSearchQuery.toLowerCase()
    return (
      po.poNumber.toLowerCase().includes(q) ||
      po.supplier.name.toLowerCase().includes(q) ||
      po.status.toLowerCase().includes(q)
    )
  })

  // ─── Stats ─────────────────────────────────────────────────────────────

  const activeSuppliers = suppliers.filter(s => s.status === 'active').length
  const totalPOValue = purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0)
  const pendingPOs = purchaseOrders.filter(po => ['draft', 'sent', 'confirmed'].includes(po.status)).length

  // ─── Next Status for PO ────────────────────────────────────────────────

  const getNextStatus = (status: string): string | null => {
    const flow: Record<string, string> = {
      draft: 'sent',
      sent: 'confirmed',
      confirmed: 'partially_received',
      partially_received: 'received',
    }
    return flow[status] || null
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Suppliers & Procurement</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage vendors, purchase orders, and inventory procurement
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnimatedMetricCard
          title="Active Suppliers"
          value={String(activeSuppliers)}
          subtitle={`${suppliers.length} total`}
          icon={Truck}
          accentGradient="from-rose-500/20 to-pink-500/20"
          iconBg="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          delay={0}
        />
        <AnimatedMetricCard
          title="Total PO Value"
          value={formatCurrency(totalPOValue)}
          subtitle={`${purchaseOrders.length} orders`}
          icon={FileText}
          accentGradient="from-emerald-500/20 to-teal-500/20"
          iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          delay={0.05}
        />
        <AnimatedMetricCard
          title="Pending Orders"
          value={String(pendingPOs)}
          subtitle="Awaiting delivery"
          icon={PackageCheck}
          accentGradient="from-amber-500/20 to-orange-500/20"
          iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          delay={0.1}
        />
        <AnimatedMetricCard
          title="Avg. Rating"
          value={suppliers.length > 0 ? (suppliers.reduce((sum, s) => sum + s.rating, 0) / suppliers.length).toFixed(1) : '—'}
          subtitle="Supplier quality"
          icon={Star}
          accentGradient="from-violet-500/20 to-purple-500/20"
          iconBg="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          delay={0.15}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="suppliers" className="space-y-4">
        <TabsList className="bg-rose-50 dark:bg-rose-950/30">
          <TabsTrigger value="suppliers" className="gap-1.5 data-[state=active]:bg-rose-500 data-[state=active]:text-white">
            <Truck className="size-3.5" />
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="purchase-orders" className="gap-1.5 data-[state=active]:bg-rose-500 data-[state=active]:text-white">
            <FileText className="size-3.5" />
            Purchase Orders
          </TabsTrigger>
        </TabsList>

        {/* ─── Suppliers Tab ────────────────────────────────────────────── */}
        <TabsContent value="suppliers" className="space-y-4">
          {/* Search + Filter Bar */}
          <GlassCard variant="flat" className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search suppliers by name, contact, email, phone, city..."
                  className="pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="blacklisted">Blacklisted</SelectItem>
                </SelectContent>
              </Select>
              <Button className="gap-2 h-9 bg-rose-500 hover:bg-rose-600 text-white" onClick={openAddSupplier}>
                <Plus className="size-4" />
                Add Supplier
              </Button>
            </div>
          </GlassCard>

          {/* Suppliers Table */}
          <GlassCard variant="default" className="overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="p-12 text-center">
                  <Truck className="size-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground font-medium">No suppliers found</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Add your first supplier to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold text-xs">Name</TableHead>
                        <TableHead className="font-semibold text-xs">Contact Person</TableHead>
                        <TableHead className="font-semibold text-xs hidden md:table-cell">Email</TableHead>
                        <TableHead className="font-semibold text-xs hidden sm:table-cell">Phone</TableHead>
                        <TableHead className="font-semibold text-xs hidden lg:table-cell">City</TableHead>
                        <TableHead className="font-semibold text-xs">Rating</TableHead>
                        <TableHead className="font-semibold text-xs">Status</TableHead>
                        <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filteredSuppliers.map((supplier, i) => (
                          <motion.tr
                            key={supplier.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ delay: i * 0.03, duration: 0.2 }}
                            className="group border-b border-border/40 hover:bg-rose-50/30 dark:hover:bg-rose-950/10 transition-colors"
                          >
                            <TableCell className="font-medium text-sm">
                              <div className="flex items-center gap-2">
                                <div className="size-8 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                  {supplier.name.charAt(0)}
                                </div>
                                <div>
                                  <span>{supplier.name}</span>
                                  {supplier._count && (
                                    <span className="text-[10px] text-muted-foreground ml-1.5">({supplier._count.purchaseOrders} POs)</span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {supplier.contactPerson || '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                              {supplier.email || '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                              {supplier.phone || '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                              {supplier.city || '—'}
                            </TableCell>
                            <TableCell>
                              <StarRating rating={supplier.rating} />
                            </TableCell>
                            <TableCell>
                              <SupplierStatusBadge status={supplier.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-rose-100 dark:hover:bg-rose-900/30" onClick={() => openEditSupplier(supplier)}>
                                        <Pencil className="size-3.5 text-rose-600" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-red-100 dark:hover:bg-red-900/30" onClick={() => { setDeletingId(supplier.id); setDeleteDialogOpen(true) }}>
                                        <Trash2 className="size-3.5 text-red-500" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </GlassCard>
        </TabsContent>

        {/* ─── Purchase Orders Tab ──────────────────────────────────────── */}
        <TabsContent value="purchase-orders" className="space-y-4">
          {/* Search + Filter Bar */}
          <GlassCard variant="flat" className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search purchase orders by PO#, supplier, status..."
                  className="pl-9 h-9"
                  value={poSearchQuery}
                  onChange={(e) => setPoSearchQuery(e.target.value)}
                />
              </div>
              <Button className="gap-2 h-9 bg-rose-500 hover:bg-rose-600 text-white" onClick={openCreatePO}>
                <Plus className="size-4" />
                Create PO
              </Button>
            </div>
          </GlassCard>

          {/* POs Table */}
          <GlassCard variant="default" className="overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : filteredPOs.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="size-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground font-medium">No purchase orders found</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Create your first purchase order to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold text-xs">PO Number</TableHead>
                        <TableHead className="font-semibold text-xs">Supplier</TableHead>
                        <TableHead className="font-semibold text-xs hidden sm:table-cell">Order Date</TableHead>
                        <TableHead className="font-semibold text-xs hidden md:table-cell">Expected</TableHead>
                        <TableHead className="font-semibold text-xs">Status</TableHead>
                        <TableHead className="font-semibold text-xs text-right">Total</TableHead>
                        <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filteredPOs.map((po, i) => (
                          <motion.tr
                            key={po.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ delay: i * 0.03, duration: 0.2 }}
                            className="group border-b border-border/40 hover:bg-rose-50/30 dark:hover:bg-rose-950/10 transition-colors"
                          >
                            <TableCell className="font-mono font-semibold text-sm text-rose-600 dark:text-rose-400">
                              {po.poNumber}
                            </TableCell>
                            <TableCell className="text-sm">
                              {po.supplier.name}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                              {new Date(po.orderDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                              {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '—'}
                            </TableCell>
                            <TableCell>
                              <POStatusBadge status={po.status} />
                            </TableCell>
                            <TableCell className="text-sm font-semibold text-right">
                              {formatCurrency(po.totalAmount)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-rose-100 dark:hover:bg-rose-900/30" onClick={() => openPODetail(po)}>
                                        <Eye className="size-3.5 text-rose-600" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                {['draft', 'sent', 'confirmed', 'partially_received'].includes(po.status) && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                                          onClick={() => {
                                            if (po.status === 'confirmed' || po.status === 'partially_received') {
                                              openReceivePO(po)
                                            } else {
                                              const next = getNextStatus(po.status)
                                              if (next) handleUpdatePOStatus(po.id, next)
                                            }
                                          }}
                                        >
                                          {po.status === 'confirmed' || po.status === 'partially_received'
                                            ? <PackageCheck className="size-3.5 text-emerald-600" />
                                            : <ArrowRight className="size-3.5 text-emerald-600" />
                                          }
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {po.status === 'confirmed' || po.status === 'partially_received'
                                          ? 'Receive Items'
                                          : `Advance to ${getNextStatus(po.status)?.replace('_', ' ')}`
                                        }
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {po.status !== 'cancelled' && po.status !== 'received' && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
                                          onClick={() => handleUpdatePOStatus(po.id, 'cancelled')}
                                        >
                                          <X className="size-3.5 text-red-500" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Cancel</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </GlassCard>
        </TabsContent>
      </Tabs>

      {/* ─── Supplier Add/Edit Dialog ──────────────────────────────────── */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                <Truck className="size-4 text-white" />
              </div>
              {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier ? 'Update supplier information' : 'Add a new vendor/supplier to your network'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            {/* Name & Contact Person */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold">
                  <Building2 className="size-3 text-rose-500" /> Name *
                </Label>
                <Input
                  placeholder="Supplier name"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold">
                  <Phone className="size-3 text-rose-500" /> Contact Person
                </Label>
                <Input
                  placeholder="Contact person name"
                  value={supplierForm.contactPerson}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold">
                  <Mail className="size-3 text-rose-500" /> Email
                </Label>
                <Input
                  type="email"
                  placeholder="email@supplier.com"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold">
                  <Phone className="size-3 text-rose-500" /> Phone
                </Label>
                <Input
                  placeholder="+92 300 1234567"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <MapPin className="size-3 text-rose-500" /> Address
              </Label>
              <Input
                placeholder="Street address"
                value={supplierForm.address}
                onChange={(e) => setSupplierForm(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>

            {/* City & Country */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">City</Label>
                <Input
                  placeholder="City"
                  value={supplierForm.city}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Country</Label>
                <Input
                  placeholder="Country"
                  value={supplierForm.country}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, country: e.target.value }))}
                />
              </div>
            </div>

            {/* Tax ID & Payment Terms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold">
                  <FileBadge className="size-3 text-rose-500" /> Tax ID
                </Label>
                <Input
                  placeholder="NTN / Tax ID"
                  value={supplierForm.taxId}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, taxId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Payment Terms</Label>
                <Select value={supplierForm.paymentTerms} onValueChange={(v) => setSupplierForm(prev => ({ ...prev, paymentTerms: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS.map(pt => (
                      <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rating & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold">
                  <Star className="size-3 text-amber-500" /> Rating
                </Label>
                <div className="flex items-center gap-2 h-9">
                  <StarRating rating={supplierForm.rating} interactive onChange={(r) => setSupplierForm(prev => ({ ...prev, rating: r }))} />
                  <span className="text-xs text-muted-foreground font-medium">{supplierForm.rating}/5</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={supplierForm.status} onValueChange={(v) => setSupplierForm(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="blacklisted">Blacklisted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <StickyNote className="size-3 text-rose-500" /> Notes
              </Label>
              <Textarea
                placeholder="Additional notes about this supplier..."
                rows={3}
                value={supplierForm.notes}
                onChange={(e) => setSupplierForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveSupplier}
              disabled={submitting || !supplierForm.name.trim()}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              {submitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Create Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this supplier? This action cannot be undone.
              Suppliers with existing purchase orders cannot be deleted — mark them as inactive instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSupplier} className="bg-red-500 hover:bg-red-600 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Create PO Dialog ──────────────────────────────────────────── */}
      <Dialog open={poDialogOpen} onOpenChange={setPoDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                <FileText className="size-4 text-white" />
              </div>
              Create Purchase Order
            </DialogTitle>
            <DialogDescription>
              Create a new purchase order for inventory procurement
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            {/* Supplier & Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Supplier *</Label>
                <Select value={poForm.supplierId} onValueChange={(v) => setPoForm(prev => ({ ...prev, supplierId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.filter(s => s.status === 'active').map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Branch *</Label>
                <Select value={poForm.branchId} onValueChange={(v) => setPoForm(prev => ({ ...prev, branchId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Expected Date & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Expected Delivery Date</Label>
                <Input
                  type="date"
                  value={poForm.expectedDate}
                  onChange={(e) => setPoForm(prev => ({ ...prev, expectedDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Notes</Label>
                <Input
                  placeholder="PO notes..."
                  value={poForm.notes}
                  onChange={(e) => setPoForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Line Items *</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addPOItem}>
                  <Plus className="size-3" /> Add Item
                </Button>
              </div>

              {poForm.items.length === 0 ? (
                <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center">
                  <PackageCheck className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No items added yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Click &quot;Add Item&quot; to add products to this order</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {poForm.items.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30"
                    >
                      <div className="col-span-12 sm:col-span-4 space-y-1">
                        <Label className="text-[10px] font-semibold text-muted-foreground">Product</Label>
                        <Select value={item.productId} onValueChange={(v) => updatePOItem(index, 'productId', v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-4 sm:col-span-2 space-y-1">
                        <Label className="text-[10px] font-semibold text-muted-foreground">Qty</Label>
                        <Input
                          type="number"
                          min={1}
                          className="h-8 text-xs"
                          value={item.quantity}
                          onChange={(e) => updatePOItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-3 space-y-1">
                        <Label className="text-[10px] font-semibold text-muted-foreground">Unit Cost</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          className="h-8 text-xs"
                          value={item.unitCost}
                          onChange={(e) => updatePOItem(index, 'unitCost', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-2 space-y-1">
                        <Label className="text-[10px] font-semibold text-muted-foreground">Total</Label>
                        <div className="h-8 flex items-center text-xs font-semibold">
                          {formatCurrency(item.quantity * item.unitCost)}
                        </div>
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
                          onClick={() => removePOItem(index)}
                        >
                          <X className="size-3 text-red-500" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Tax & Shipping */}
            {poForm.items.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Tax Amount</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={poForm.taxAmount}
                    onChange={(e) => setPoForm(prev => ({ ...prev, taxAmount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Shipping Cost</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={poForm.shippingCost}
                    onChange={(e) => setPoForm(prev => ({ ...prev, shippingCost: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            )}

            {/* Totals */}
            {poForm.items.length > 0 && (
              <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(poSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">{formatCurrency(poForm.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">{formatCurrency(poForm.shippingCost)}</span>
                </div>
                <div className="border-t border-rose-200 dark:border-rose-800/40 pt-2 flex justify-between text-sm">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(poTotal)}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPoDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreatePO}
              disabled={submitting || !poForm.supplierId || !poForm.branchId || poForm.items.length === 0}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              {submitting ? 'Creating...' : 'Create Purchase Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── PO Detail Dialog ──────────────────────────────────────────── */}
      <Dialog open={poDetailOpen} onOpenChange={setPoDetailOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedPO && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                    <FileText className="size-4 text-white" />
                  </div>
                  {selectedPO.poNumber}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  <span>Supplier: {selectedPO.supplier.name}</span>
                  <span>•</span>
                  <POStatusBadge status={selectedPO.status} />
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* PO Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Branch</p>
                    <p className="text-sm font-medium mt-1">{selectedPO.branch.name}</p>
                  </div>
                  <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Order Date</p>
                    <p className="text-sm font-medium mt-1">{new Date(selectedPO.orderDate).toLocaleDateString()}</p>
                  </div>
                  <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Expected</p>
                    <p className="text-sm font-medium mt-1">{selectedPO.expectedDate ? new Date(selectedPO.expectedDate).toLocaleDateString() : '—'}</p>
                  </div>
                  <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Received</p>
                    <p className="text-sm font-medium mt-1">{selectedPO.receivedDate ? new Date(selectedPO.receivedDate).toLocaleDateString() : '—'}</p>
                  </div>
                </div>

                {/* Line Items */}
                {selectedPO.items && selectedPO.items.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs font-semibold">Product</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Ordered</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Received</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Unit Cost</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPO.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-sm">
                              <div>
                                <span className="font-medium">{item.product.name}</span>
                                <span className="text-muted-foreground text-xs ml-1">({item.product.sku})</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-right">{item.quantity}</TableCell>
                            <TableCell className="text-sm text-right">
                              <span className={item.receivedQty >= item.quantity ? 'text-emerald-600 font-medium' : item.receivedQty > 0 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                                {item.receivedQty}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-right">{formatCurrency(item.unitCost)}</TableCell>
                            <TableCell className="text-sm font-medium text-right">{formatCurrency(item.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Totals */}
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(selectedPO.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(selectedPO.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{formatCurrency(selectedPO.shippingCost)}</span>
                  </div>
                  <div className="border-t border-rose-200 dark:border-rose-800/40 pt-2 flex justify-between">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(selectedPO.totalAmount)}</span>
                  </div>
                </div>

                {selectedPO.notes && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{selectedPO.notes}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                {['draft', 'sent', 'confirmed', 'partially_received'].includes(selectedPO.status) && (
                  <>
                    {(selectedPO.status === 'confirmed' || selectedPO.status === 'partially_received') && (
                      <Button
                        variant="outline"
                        className="gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
                        onClick={() => {
                          setPoDetailOpen(false)
                          openReceivePO(selectedPO)
                        }}
                      >
                        <PackageCheck className="size-4" />
                        Receive Items
                      </Button>
                    )}
                    {getNextStatus(selectedPO.status) && selectedPO.status !== 'confirmed' && selectedPO.status !== 'partially_received' && (
                      <Button
                        variant="outline"
                        className="gap-1"
                        onClick={() => {
                          const next = getNextStatus(selectedPO.status)
                          if (next) {
                            handleUpdatePOStatus(selectedPO.id, next)
                            setPoDetailOpen(false)
                          }
                        }}
                      >
                        <ArrowRight className="size-4" />
                        Mark as {getNextStatus(selectedPO.status)?.replace('_', ' ')}
                      </Button>
                    )}
                  </>
                )}
                <Button variant="outline" onClick={() => setPoDetailOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Receive PO Dialog ─────────────────────────────────────────── */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {receivingPO && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                    <PackageCheck className="size-4 text-white" />
                  </div>
                  Receive Items — {receivingPO.poNumber}
                </DialogTitle>
                <DialogDescription>
                  Enter the quantities received for each item. Inventory will be updated automatically.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {receivingPO.items && receivingPO.items.length > 0 ? (
                  <div className="space-y-3">
                    {receivingPO.items.map((item) => {
                      const remaining = item.quantity - item.receivedQty
                      return (
                        <div
                          key={item.id}
                          className="rounded-lg border p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-sm">{item.product.name}</span>
                              <span className="text-muted-foreground text-xs ml-1">({item.product.sku})</span>
                            </div>
                            <Badge variant="secondary" className="text-[10px]">
                              {item.receivedQty}/{item.quantity} received
                            </Badge>
                          </div>
                          {remaining > 0 ? (
                            <div className="flex items-center gap-3">
                              <Label className="text-xs text-muted-foreground shrink-0">Receiving now:</Label>
                              <Input
                                type="number"
                                min={0}
                                max={remaining}
                                className="h-8 w-24 text-sm"
                                value={receiveQuantities[item.id] || 0}
                                onChange={(e) =>
                                  setReceiveQuantities(prev => ({
                                    ...prev,
                                    [item.id]: Math.min(parseInt(e.target.value) || 0, remaining),
                                  }))
                                }
                              />
                              <span className="text-xs text-muted-foreground">
                                of {remaining} remaining
                              </span>
                            </div>
                          ) : (
                            <p className="text-xs text-emerald-600 font-medium">✓ Fully received</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No items found</p>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setReceiveDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleReceivePO}
                  disabled={submitting}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
                >
                  <PackageCheck className="size-4" />
                  {submitting ? 'Processing...' : 'Confirm Receipt'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
