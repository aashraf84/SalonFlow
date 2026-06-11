'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  CreditCard,
  Search,
  Plus,
  X,
  Eye,
  CalendarDays,
  Receipt,
  Wallet,
  Banknote,
  User,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
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
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

const formatCurrency = (amount: number) => `PKR ${amount.toLocaleString()}`

// Types
interface InvoiceItem {
  id: string
  itemType: string
  itemId: string | null
  name: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
  staffId: string | null
}

interface Invoice {
  id: string
  branchId: string
  customerId: string | null
  invoiceNumber: string
  type: string
  subtotal: number
  tax: number
  discount: number
  totalAmount: number
  paymentMethod: string
  paymentStatus: string
  notes: string | null
  createdAt: string
  customer: {
    id: string
    firstName: string
    lastName: string
    phone: string
    email: string | null
    loyaltyTier: string
  } | null
  branch: {
    id: string
    name: string
    branchCode: string
  } | null
  items: InvoiceItem[]
}

interface ServiceCategory {
  id: string
  name: string
  description: string | null
  icon: string | null
  services: {
    id: string
    name: string
    description: string | null
    duration: number
    price: number
    isActive: boolean
    isPackage: boolean
  }[]
}

interface Customer {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  loyaltyTier: string
}

interface CartItem {
  id: string
  itemType: string
  name: string
  unitPrice: number
  quantity: number
}

// Payment method badge styles
const paymentMethodBadge: Record<string, { style: string; icon: React.ReactNode }> = {
  cash: { style: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: <Banknote className="h-3 w-3" /> },
  card: { style: 'bg-blue-100 text-blue-700 border-blue-300', icon: <CreditCard className="h-3 w-3" /> },
  wallet: { style: 'bg-purple-100 text-purple-700 border-purple-300', icon: <Wallet className="h-3 w-3" /> },
  split: { style: 'bg-gray-100 text-gray-700 border-gray-300', icon: <Receipt className="h-3 w-3" /> },
}

// Payment status badge styles
const paymentStatusBadge: Record<string, { style: string; icon: React.ReactNode }> = {
  paid: { style: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: <CheckCircle2 className="h-3 w-3" /> },
  pending: { style: 'bg-amber-100 text-amber-700 border-amber-300', icon: <Clock className="h-3 w-3" /> },
  partial: { style: 'bg-orange-100 text-orange-700 border-orange-300', icon: <AlertCircle className="h-3 w-3" /> },
  refunded: { style: 'bg-gray-100 text-gray-600 border-gray-300', icon: <Receipt className="h-3 w-3" /> },
}

export function PosModule() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('invoices')

  // POS state
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [discountPercent, setDiscountPercent] = useState<string>('0')
  const [submitting, setSubmitting] = useState(false)
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch('/api/invoices?take=50')
      const json = await res.json()
      if (json.success) {
        setInvoices(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err)
    }
  }, [])

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/services')
      const json = await res.json()
      if (json.success) {
        setCategories(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch services:', err)
    }
  }, [])

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/customers?take=100')
      const json = await res.json()
      if (json.success) {
        setCustomers(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchInvoices(), fetchServices(), fetchCustomers()])
      setLoading(false)
    }
    load()
  }, [fetchInvoices, fetchServices, fetchCustomers])

  // Cart helpers
  const addToCart = (service: { id: string; name: string; price: number }) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === service.id)
      if (existing) {
        return prev.map((item) =>
          item.id === service.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, {
        id: service.id,
        itemType: 'service',
        name: service.name,
        unitPrice: service.price,
        quantity: 1,
      }]
    })
  }

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(id)
      return
    }
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    )
  }

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const taxRate = 0.05
  const tax = subtotal * taxRate
  const discountValue = subtotal * (parseFloat(discountPercent) || 0) / 100
  const grandTotal = subtotal + tax - discountValue

  // Quick stats
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const weekAgo = new Date(today.getTime() - 7 * 86400000).toISOString().split('T')[0]
  const monthAgo = new Date(today.getTime() - 30 * 86400000).toISOString().split('T')[0]

  const todaySales = invoices
    .filter((inv) => inv.createdAt.split('T')[0] === todayStr)
    .reduce((sum, inv) => sum + inv.totalAmount, 0)
  const weekSales = invoices
    .filter((inv) => inv.createdAt >= weekAgo)
    .reduce((sum, inv) => sum + inv.totalAmount, 0)
  const monthSales = invoices
    .filter((inv) => inv.createdAt >= monthAgo)
    .reduce((sum, inv) => sum + inv.totalAmount, 0)
  const avgTransaction = invoices.length > 0
    ? invoices.reduce((sum, inv) => sum + inv.totalAmount, 0) / invoices.length
    : 0

  // Complete sale
  const handleCompleteSale = async () => {
    if (cart.length === 0) return

    // Get first branch as default
    const firstBranch = invoices.find((inv) => inv.branch)?.branchId
    if (!firstBranch) {
      alert('No branch available. Please create a branch first.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: firstBranch,
          customerId: selectedCustomerId || null,
          type: 'service',
          subtotal,
          tax,
          discount: discountValue,
          totalAmount: grandTotal,
          paymentMethod,
          paymentStatus: 'paid',
          items: cart.map((item) => ({
            itemType: item.itemType,
            itemId: item.id,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: 0,
            total: item.unitPrice * item.quantity,
          })),
        }),
      })
      const json = await res.json()
      if (json.success) {
        setCart([])
        setDiscountPercent('0')
        setSelectedCustomerId('')
        setPaymentMethod('cash')
        fetchInvoices()
        setActiveTab('invoices')
      }
    } catch (err) {
      console.error('Failed to create invoice:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // Filter services for POS
  const allServices = categories.flatMap((cat) =>
    cat.services.map((svc) => ({ ...svc, categoryName: cat.name, categoryId: cat.id }))
  )
  const filteredServices = allServices.filter((svc) => {
    const matchesSearch = !searchQuery ||
      svc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      svc.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || svc.categoryId === selectedCategory
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 text-green-600">
          <ShoppingCart className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Point of Sale</h2>
          <p className="text-sm text-muted-foreground">Billing, invoicing & payments</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Math.round(todaySales))}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Math.round(weekSales))}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            <CalendarDays className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Math.round(monthSales))}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Transaction</CardTitle>
            <CreditCard className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Math.round(avgTransaction))}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoices">Recent Invoices</TabsTrigger>
          <TabsTrigger value="create">Create Invoice</TabsTrigger>
        </TabsList>

        {/* Recent Invoices Tab */}
        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>
                {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-center">Items</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => {
                        const pmBadge = paymentMethodBadge[invoice.paymentMethod] || paymentMethodBadge.cash
                        const psBadge = paymentStatusBadge[invoice.paymentStatus] || paymentStatusBadge.pending

                        return (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-mono text-sm font-medium">
                              {invoice.invoiceNumber}
                            </TableCell>
                            <TableCell>
                              {invoice.customer ? (
                                <span className="text-sm">
                                  {invoice.customer.firstName} {invoice.customer.lastName}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">Walk-in</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {invoice.items.length}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatCurrency(Math.round(invoice.subtotal))}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatCurrency(Math.round(invoice.tax))}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {invoice.discount > 0 ? formatCurrency(Math.round(invoice.discount)) : '—'}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-sm">
                              {formatCurrency(Math.round(invoice.totalAmount))}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`${pmBadge.style} gap-1 capitalize`}>
                                {pmBadge.icon}
                                {invoice.paymentMethod}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`${psBadge.style} gap-1 capitalize`}>
                                {psBadge.icon}
                                {invoice.paymentStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {new Date(invoice.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => setViewInvoice(invoice)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted/50 mb-3">
                    <Receipt className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold">No invoices yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create your first invoice to get started.
                  </p>
                  <Button size="sm" className="mt-4" onClick={() => setActiveTab('create')}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Create Invoice
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Invoice Tab - POS Style */}
        <TabsContent value="create" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Panel - Service Selector */}
            <div className="lg:col-span-3 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Services & Products</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search services..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Category Filters */}
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      variant={selectedCategory === 'all' ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSelectedCategory('all')}
                    >
                      All
                    </Button>
                    {categories.map((cat) => (
                      <Button
                        key={cat.id}
                        variant={selectedCategory === cat.id ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setSelectedCategory(cat.id)}
                      >
                        {cat.name}
                      </Button>
                    ))}
                  </div>

                  <Separator />

                  {/* Service Grid */}
                  <ScrollArea className="max-h-[450px]">
                    {filteredServices.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredServices.map((svc) => {
                          const inCart = cart.find((item) => item.id === svc.id)
                          return (
                            <button
                              key={svc.id}
                              onClick={() => addToCart(svc)}
                              className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${
                                inCart ? 'border-primary bg-primary/5' : 'border-border'
                              }`}
                            >
                              <div className={`flex items-center justify-center h-9 w-9 rounded-lg shrink-0 ${
                                svc.isPackage ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'
                              }`}>
                                {svc.isPackage ? <Package className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium truncate">{svc.name}</span>
                                  {inCart && (
                                    <Badge className="h-4 w-4 p-0 text-[10px] flex items-center justify-center rounded-full">
                                      {inCart.quantity}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-muted-foreground">{svc.duration} min</span>
                                  <span className="text-xs font-semibold">{formatCurrency(svc.price)}</span>
                                </div>
                              </div>
                              <Plus className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8">
                        <Search className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No services found</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Cart & Checkout */}
            <div className="lg:col-span-2">
              <Card className="sticky top-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Cart
                    {cart.length > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cart Items */}
                  {cart.length > 0 ? (
                    <ScrollArea className="max-h-[200px]">
                      <div className="space-y-2">
                        {cart.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 rounded-lg border p-2.5"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(item.unitPrice)} each
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              >
                                -
                              </Button>
                              <span className="text-sm font-medium w-6 text-center">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                +
                              </Button>
                            </div>
                            <span className="text-sm font-semibold w-20 text-right">
                              {formatCurrency(item.unitPrice * item.quantity)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                      <ShoppingCart className="h-8 w-8 mb-2" />
                      <p className="text-sm">Cart is empty</p>
                      <p className="text-xs">Click a service to add it</p>
                    </div>
                  )}

                  <Separator />

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatCurrency(Math.round(subtotal))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax (5%)</span>
                      <span className="font-medium">{formatCurrency(Math.round(tax))}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Discount</span>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={discountPercent}
                          onChange={(e) => setDiscountPercent(e.target.value)}
                          className="h-6 w-14 text-xs text-center p-0"
                          disabled={cart.length === 0}
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                      <span className="font-medium text-red-600">
                        {discountValue > 0 ? `-${formatCurrency(Math.round(discountValue))}` : '—'}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Grand Total</span>
                      <span className="text-xl font-bold">{formatCurrency(Math.round(grandTotal))}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Customer Selector */}
                  <div className="space-y-2">
                    <Label className="text-sm">Customer</Label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select customer (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              {customer.firstName} {customer.lastName} — {customer.phone}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <Label className="text-sm">Payment Method</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'cash', label: 'Cash', icon: <Banknote className="h-4 w-4" /> },
                        { value: 'card', label: 'Card', icon: <CreditCard className="h-4 w-4" /> },
                        { value: 'wallet', label: 'Wallet', icon: <Wallet className="h-4 w-4" /> },
                      ].map((method) => (
                        <Button
                          key={method.value}
                          variant={paymentMethod === method.value ? 'default' : 'outline'}
                          size="sm"
                          className="h-9 gap-1.5"
                          onClick={() => setPaymentMethod(method.value)}
                        >
                          {method.icon}
                          {method.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Complete Sale */}
                  <Button
                    className="w-full h-11"
                    size="lg"
                    disabled={cart.length === 0 || submitting}
                    onClick={handleCompleteSale}
                  >
                    {submitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Complete Sale — {formatCurrency(Math.round(grandTotal))}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={(open) => !open && setViewInvoice(null)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Invoice {viewInvoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              {/* Invoice Header */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">
                    {viewInvoice.customer
                      ? `${viewInvoice.customer.firstName} ${viewInvoice.customer.lastName}`
                      : 'Walk-in Customer'}
                  </p>
                  {viewInvoice.customer && (
                    <p className="text-xs text-muted-foreground">{viewInvoice.customer.phone}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {new Date(viewInvoice.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Items */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">Items</p>
                {viewInvoice.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground ml-1">x{item.quantity}</span>
                    </div>
                    <span>{formatCurrency(Math.round(item.total))}</span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(Math.round(viewInvoice.subtotal))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(Math.round(viewInvoice.tax))}</span>
                </div>
                {viewInvoice.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-red-600">-{formatCurrency(Math.round(viewInvoice.discount))}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(Math.round(viewInvoice.totalAmount))}</span>
                </div>
              </div>

              <Separator />

              {/* Payment Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Payment:</span>
                  <Badge variant="outline" className={`${paymentMethodBadge[viewInvoice.paymentMethod]?.style || ''} gap-1 capitalize`}>
                    {paymentMethodBadge[viewInvoice.paymentMethod]?.icon}
                    {viewInvoice.paymentMethod}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant="outline" className={`${paymentStatusBadge[viewInvoice.paymentStatus]?.style || ''} gap-1 capitalize`}>
                    {paymentStatusBadge[viewInvoice.paymentStatus]?.icon}
                    {viewInvoice.paymentStatus}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
