'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GlassCard, AnimatedMetricCard } from '@/components/salon/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ShoppingCart, DollarSign, CreditCard, Search, Plus, Minus, X, Eye,
  Receipt, Wallet, Banknote, User, CheckCircle2, Clock, AlertCircle,
  ScanBarcode, Tag, Percent, Gift, Star, Printer, ChevronRight,
  Trash2, Loader2, Scissors, Package, ArrowRight, Sparkles, Hash,
  ShoppingBag, Zap, TrendingUp, LayoutGrid, List, ArrowUpDown,
  Timer, Users, HandCoins, CircleDot, Flame, Gem
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────
interface ServiceType {
  id: string; name: string; description?: string; duration: number; price: number; isActive: boolean; isPackage: boolean
  category?: { id: string; name: string; icon?: string }
}

interface CategoryType {
  id: string; name: string; description?: string; icon?: string; services: ServiceType[]
}

interface CustomerType {
  id: string; firstName: string; lastName: string; phone: string; email?: string; loyaltyTier: string; loyaltyPoints: number
}

interface CartItem {
  id: string; itemType: string; name: string; unitPrice: number; quantity: number
  duration?: number; staffId?: string; discount: number; notes?: string
  category?: string
}

interface InvoiceType {
  id: string; branchId: string; customerId?: string; invoiceNumber: string; type: string
  subtotal: number; tax: number; discount: number; totalAmount: number
  paymentMethod: string; paymentStatus: string; notes?: string; createdAt: string
  customer?: { id: string; firstName: string; lastName: string; phone: string; email?: string; loyaltyTier: string }
  branch?: { id: string; name: string; branchCode: string }
  items: InvoiceItemType[]
}

interface InvoiceItemType {
  id: string; itemType: string; itemId?: string; name: string; quantity: number
  unitPrice: number; discount: number; total: number; staffId?: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatPKR = (amount: number) => `Rs. ${amount.toLocaleString('en-PK')}`
const formatDate = (d: string) => new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const categoryIcons: Record<string, string> = {
  'Hair': '✂️', 'Nails': '💅', 'Skin': '✨', 'Makeup': '💄', 'Spa': '🧖', 'Body': '💆',
  'Bridal': '👰', 'Men': '🧔', 'Packages': '📦', 'Products': '🛍️', 'Other': '✨'
}

const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: Banknote, color: 'bg-emerald-500' },
  { value: 'card', label: 'Card', icon: CreditCard, color: 'bg-blue-500' },
  { value: 'wallet', label: 'Wallet', icon: Wallet, color: 'bg-purple-500' },
  { value: 'split', label: 'Split', icon: Receipt, color: 'bg-amber-500' },
]

// ─── Main POS Component ─────────────────────────────────────────────────────
export function PosModule() {
  // Data
  const [invoices, setInvoices] = useState<InvoiceType[]>([])
  const [categories, setCategories] = useState<CategoryType[]>([])
  const [customers, setCustomers] = useState<CustomerType[]>([])
  const [loading, setLoading] = useState(true)

  // POS State
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerType | null>(null)
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [customDiscount, setCustomDiscount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [completedInvoice, setCompletedInvoice] = useState<InvoiceType | null>(null)
  const [viewMode, setViewMode] = useState<'pos' | 'history'>('pos')
  const [productView, setProductView] = useState<'grid' | 'list'>('grid')

  // ─── Data Fetching ──────────────────────────────────────────────────────
  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch('/api/invoices?take=100')
      const json = await res.json()
      if (json.success) setInvoices(json.data)
    } catch { toast.error('Failed to load invoices') }
  }, [])

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/services')
      const json = await res.json()
      if (json.success) setCategories(json.data)
    } catch { toast.error('Failed to load services') }
  }, [])

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/customers?take=200')
      const json = await res.json()
      if (json.success) setCustomers(json.data)
    } catch { toast.error('Failed to load customers') }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchInvoices(), fetchServices(), fetchCustomers()])
      setLoading(false)
    }
    load()
  }, [fetchInvoices, fetchServices, fetchCustomers])

  // ─── Cart Logic ─────────────────────────────────────────────────────────
  const allServices = useMemo(() =>
    categories.flatMap(cat => cat.services.map(svc => ({ ...svc, categoryName: cat.name, categoryId: cat.id }))),
    [categories]
  )

  const filteredServices = useMemo(() =>
    allServices.filter(svc => {
      const q = searchQuery.toLowerCase()
      const matchesSearch = !q || svc.name.toLowerCase().includes(q) || svc.categoryName.toLowerCase().includes(q)
      const matchesCat = selectedCategory === 'all' || svc.categoryId === selectedCategory
      return matchesSearch && matchesCat && svc.isActive
    }),
    [allServices, searchQuery, selectedCategory]
  )

  const addToCart = useCallback((service: ServiceType & { categoryName?: string; categoryId?: string }) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === service.id)
      if (existing) {
        return prev.map(item =>
          item.id === service.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, {
        id: service.id,
        itemType: 'service',
        name: service.name,
        unitPrice: service.price,
        quantity: 1,
        duration: service.duration,
        discount: 0,
        category: service.categoryName
      }]
    })
    toast.success(`${service.name} added`, { duration: 1200 })
  }, [])

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }, [])

  const updateQuantity = useCallback((id: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.id === id)
      if (!item) return prev
      const newQty = item.quantity + delta
      if (newQty < 1) return prev.filter(i => i.id !== id)
      return prev.map(i => i.id === id ? { ...i, quantity: newQty } : i)
    })
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
    setDiscountPercent(0)
    setCustomDiscount('')
    setSelectedCustomer(null)
  }, [])

  // ─── Calculations ───────────────────────────────────────────────────────
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity) - item.discount, 0), [cart])
  const taxRate = 0.05
  const tax = subtotal * taxRate
  const discountValue = subtotal * discountPercent / 100
  const grandTotal = subtotal + tax - discountValue
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  const totalDuration = cart.reduce((sum, item) => sum + (item.duration || 0) * item.quantity, 0)

  // Quick stats
  const todayStr = new Date().toISOString().split('T')[0]
  const todaySales = invoices.filter(inv => inv.createdAt.split('T')[0] === todayStr && inv.paymentStatus === 'paid').reduce((s, i) => s + i.totalAmount, 0)
  const todayTransactions = invoices.filter(inv => inv.createdAt.split('T')[0] === todayStr && inv.paymentStatus === 'paid').length

  // ─── Complete Sale ──────────────────────────────────────────────────────
  const handleCompleteSale = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return }
    const firstBranch = invoices.find(inv => inv.branch)?.branchId
    if (!firstBranch) { toast.error('No branch found. Create a branch first.'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: firstBranch,
          customerId: selectedCustomer?.id || null,
          type: 'service',
          subtotal,
          tax,
          discount: discountValue,
          totalAmount: grandTotal,
          paymentMethod,
          paymentStatus: 'paid',
          items: cart.map(item => ({
            itemType: item.itemType,
            itemId: item.id,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            total: (item.unitPrice * item.quantity) - item.discount,
          })),
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Sale completed successfully!')
        setCompletedInvoice(json.data)
        setShowCheckout(false)
        setShowReceipt(true)
        fetchInvoices()
      } else {
        toast.error(json.error || 'Failed to complete sale')
      }
    } catch { toast.error('Failed to complete sale') }
    finally { setSubmitting(false) }
  }

  // ─── Print Receipt ──────────────────────────────────────────────────────
  const printReceipt = () => {
    if (!completedInvoice) return
    const c = completedInvoice.customer
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt ${completedInvoice.invoiceNumber}</title>
    <style>
      @page { size: 80mm auto; margin: 0; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Courier New', monospace; font-size: 11px; color: #000; width: 80mm; padding: 5mm; }
      .center { text-align: center; }
      .bold { font-weight: bold; }
      .line { border-top: 1px dashed #000; margin: 5px 0; }
      .double-line { border-top: 2px solid #000; margin: 5px 0; }
      table { width: 100%; }
      td { padding: 1px 0; }
      td:last-child { text-align: right; }
      .logo { font-size: 16px; font-weight: bold; letter-spacing: 1px; }
      h2 { font-size: 13px; letter-spacing: 2px; }
    </style></head><body>
    <div class="center">
      <p class="logo">✂ SALONFLOW OS</p>
      <p>Beauty & Spa Management</p>
      <p>DHA Phase 6, Karachi</p>
      <p>Tel: +92-300-1234567</p>
    </div>
    <div class="double-line"></div>
    <p class="center bold"><h2>RECEIPT</h2></p>
    <p>Invoice: <span class="bold">${completedInvoice.invoiceNumber}</span></p>
    <p>Date: ${new Date(completedInvoice.createdAt).toLocaleString()}</p>
    <p>Cashier: Admin</p>
    ${c ? `<p>Customer: ${c.firstName} ${c.lastName}</p><p>Phone: ${c.phone}</p>` : ''}
    <div class="line"></div>
    <table>
      <tr><td class="bold">Item</td><td class="bold">Amt</td></tr>
      ${(completedInvoice.items || []).map(item => `
        <tr><td>${item.name} x${item.quantity}</td><td>${formatPKR(item.total)}</td></tr>
      `).join('')}
    </table>
    <div class="line"></div>
    <table>
      <tr><td>Subtotal</td><td>${formatPKR(completedInvoice.subtotal)}</td></tr>
      ${completedInvoice.tax > 0 ? `<tr><td>Tax (5%)</td><td>${formatPKR(completedInvoice.tax)}</td></tr>` : ''}
      ${completedInvoice.discount > 0 ? `<tr><td>Discount</td><td>-${formatPKR(completedInvoice.discount)}</td></tr>` : ''}
    </table>
    <div class="double-line"></div>
    <table>
      <tr class="bold" style="font-size:14px"><td>TOTAL</td><td>${formatPKR(completedInvoice.totalAmount)}</td></tr>
    </table>
    <div class="double-line"></div>
    <p>Payment: ${completedInvoice.paymentMethod.toUpperCase()}</p>
    <div class="line"></div>
    <div class="center" style="margin-top:8px;">
      <p>Thank you for your visit!</p>
      <p style="font-size:9px;margin-top:3px;">SalonFlow OS | Powered by ApexFlow</p>
    </div>
    </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 300)
  }

  // ─── Loading State ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
          <Skeleton className="h-[500px] rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 h-full">
      {/* ─── Top Stats Bar ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AnimatedMetricCard title="Today's Sales" value={formatPKR(todaySales)} subtitle={`${todayTransactions} transactions`} icon={DollarSign} accentGradient="from-emerald-500/20 to-teal-500/20" iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" delay={0} />
        <AnimatedMetricCard title="Cart Total" value={formatPKR(grandTotal)} subtitle={`${totalItems} items`} icon={ShoppingCart} accentGradient="from-rose-500/20 to-pink-500/20" iconBg="bg-rose-500/10 text-rose-600 dark:text-rose-400" delay={0.05} />
        <AnimatedMetricCard title="Est. Duration" value={`${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`} subtitle="Total service time" icon={Clock} accentGradient="from-blue-500/20 to-indigo-500/20" iconBg="bg-blue-500/10 text-blue-600 dark:text-blue-400" delay={0.1} />
        <AnimatedMetricCard title="Avg. Transaction" value={formatPKR(invoices.length > 0 ? invoices.reduce((s, i) => s + i.totalAmount, 0) / invoices.length : 0)} subtitle="Per invoice" icon={TrendingUp} accentGradient="from-amber-500/20 to-orange-500/20" iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400" delay={0.15} />
      </div>

      {/* ─── Mode Toggle ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant={viewMode === 'pos' ? 'default' : 'outline'} className={cn('text-xs rounded-xl gap-1.5', viewMode === 'pos' && 'bg-tahoe-accent text-white')} onClick={() => setViewMode('pos')}>
          <ShoppingCart className="size-3.5" /> Point of Sale
        </Button>
        <Button size="sm" variant={viewMode === 'history' ? 'default' : 'outline'} className={cn('text-xs rounded-xl gap-1.5', viewMode === 'history' && 'bg-tahoe-accent text-white')} onClick={() => setViewMode('history')}>
          <Receipt className="size-3.5" /> Transaction History
        </Button>
      </div>

      {viewMode === 'pos' ? (
        /* ═══ POS LAYOUT — CART STICKY, PRODUCTS SCROLL ═════════════════════ */
        <div className="flex gap-4" style={{ height: 'calc(100vh - 340px)', minHeight: '500px' }}>
          {/* ─── LEFT: Product Grid (SCROLLABLE) ─────────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {/* Search & Category Filter — sticky top */}
            <div className="shrink-0 mb-3">
              <GlassCard className="p-3" hover3d={false} animateOnMount={false}>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search services... (try 'haircut' or 'facial')"
                      className="pl-10 h-10 text-sm rounded-xl bg-foreground/[0.02] border-border/50"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setSearchQuery('')}>
                        <X className="size-3" />
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 items-center">
                    <Button size="sm" variant={selectedCategory === 'all' ? 'default' : 'outline'} className={cn('text-[10px] rounded-lg shrink-0 px-3', selectedCategory === 'all' && 'bg-tahoe-accent text-white')} onClick={() => setSelectedCategory('all')}>
                      All
                    </Button>
                    {categories.map(cat => (
                      <Button key={cat.id} size="sm" variant={selectedCategory === cat.id ? 'default' : 'outline'} className={cn('text-[10px] rounded-lg shrink-0 px-3 gap-1', selectedCategory === cat.id && 'bg-tahoe-accent text-white')} onClick={() => setSelectedCategory(cat.id)}>
                        <span>{categoryIcons[cat.name] || '✨'}</span>
                        {cat.name}
                      </Button>
                    ))}
                    {/* View Toggle */}
                    <div className="ml-1 flex border border-border/50 rounded-lg overflow-hidden">
                      <button className={cn('p-1.5 transition-colors', productView === 'grid' ? 'bg-tahoe-accent text-white' : 'text-muted-foreground hover:text-foreground')} onClick={() => setProductView('grid')}>
                        <LayoutGrid className="size-3.5" />
                      </button>
                      <button className={cn('p-1.5 transition-colors', productView === 'list' ? 'bg-tahoe-accent text-white' : 'text-muted-foreground hover:text-foreground')} onClick={() => setProductView('list')}>
                        <List className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Service Grid/List — SCROLLABLE */}
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {productView === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 pb-2">
                  <AnimatePresence>
                    {filteredServices.map(service => {
                      const inCart = cart.find(i => i.id === service.id)
                      return (
                        <motion.button
                          key={service.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          whileHover={{ scale: 1.03, y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => addToCart(service)}
                          className={cn(
                            'relative text-left p-3 rounded-xl border transition-all duration-200 group',
                            inCart
                              ? 'border-rose-500/50 bg-rose-500/5 shadow-md shadow-rose-500/10'
                              : 'border-border/50 bg-card/60 hover:border-rose-500/30 hover:bg-rose-500/[0.03]'
                          )}
                        >
                          {/* Category Badge */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 truncate">{service.categoryName}</span>
                            {service.isPackage && (
                              <Badge className="h-4 text-[8px] bg-amber-500/10 text-amber-600 border-amber-500/20 border px-1.5">PKG</Badge>
                            )}
                          </div>

                          {/* Service Name */}
                          <p className="text-sm font-semibold leading-tight mb-1 line-clamp-2">{service.name}</p>

                          {/* Price & Duration */}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{formatPKR(service.price)}</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Timer className="size-2.5" />{service.duration}m
                            </span>
                          </div>

                          {/* Cart Indicator */}
                          {inCart && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-lg"
                            >
                              {inCart.quantity}
                            </motion.div>
                          )}

                          {/* Hover Add Icon */}
                          {!inCart && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex size-6 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
                                <Plus className="size-3" />
                              </div>
                            </div>
                          )}
                        </motion.button>
                      )
                    })}
                  </AnimatePresence>

                  {filteredServices.length === 0 && (
                    <div className="col-span-full p-12 text-center">
                      <Package className="size-12 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No services found</p>
                    </div>
                  )}
                </div>
              ) : (
                /* List View */
                <div className="space-y-1 pb-2">
                  <AnimatePresence>
                    {filteredServices.map(service => {
                      const inCart = cart.find(i => i.id === service.id)
                      return (
                        <motion.button
                          key={service.id}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => addToCart(service)}
                          className={cn(
                            'w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 text-left group',
                            inCart
                              ? 'border-rose-500/50 bg-rose-500/5 shadow-sm'
                              : 'border-border/30 bg-card/40 hover:border-rose-500/30 hover:bg-rose-500/[0.03]'
                          )}
                        >
                          <div className={cn('flex size-9 items-center justify-center rounded-lg shrink-0 text-sm', inCart ? 'bg-rose-500/10 text-rose-500' : 'bg-foreground/[0.03] text-muted-foreground')}>
                            {categoryIcons[service.categoryName || ''] || '✨'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{service.name}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                              <span>{service.categoryName}</span>
                              <span className="flex items-center gap-0.5"><Timer className="size-2" />{service.duration}m</span>
                            </p>
                          </div>
                          {service.isPackage && (
                            <Badge className="h-4 text-[8px] bg-amber-500/10 text-amber-600 border-amber-500/20 border px-1.5 shrink-0">PKG</Badge>
                          )}
                          <span className="text-sm font-bold text-rose-600 dark:text-rose-400 shrink-0">{formatPKR(service.price)}</span>
                          {inCart ? (
                            <Badge className="h-5 text-[10px] bg-rose-500 text-white px-1.5 shrink-0">{inCart.quantity}×</Badge>
                          ) : (
                            <div className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <Plus className="size-3" />
                            </div>
                          )}
                        </motion.button>
                      )
                    })}
                  </AnimatePresence>
                  {filteredServices.length === 0 && (
                    <div className="p-12 text-center">
                      <Package className="size-12 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No services found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ─── RIGHT: Cart (STATIC / STICKY) ────────────────────────────────── */}
          <div className="w-[380px] shrink-0 flex flex-col overflow-hidden hidden lg:flex">
            <div className="flex flex-col h-full rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl shadow-lg">
              {/* ── Customer Selector (static top) ── */}
              <div className="shrink-0 px-4 py-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={cn('flex size-8 items-center justify-center rounded-lg shrink-0', selectedCustomer ? 'bg-rose-500/10 text-rose-500' : 'bg-foreground/5 text-muted-foreground')}>
                      <User className="size-4" />
                    </div>
                    {selectedCustomer ? (
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{selectedCustomer.phone} · <Star className="size-2.5 inline text-amber-500" /> {selectedCustomer.loyaltyTier}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Walk-in Customer</p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg gap-1 shrink-0" onClick={() => setShowCustomerPicker(true)}>
                    <User className="size-3" /> {selectedCustomer ? 'Change' : 'Select'}
                  </Button>
                </div>
              </div>

              {/* ── Cart Header (static) ── */}
              <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-foreground/[0.01]">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="size-4 text-rose-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Current Order</span>
                  <Badge variant="outline" className="text-[9px] h-5 px-1.5">{totalItems}</Badge>
                </div>
                {cart.length > 0 && (
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-500 hover:text-red-600 gap-1" onClick={clearCart}>
                    <Trash2 className="size-3" /> Clear
                  </Button>
                )}
              </div>

              {/* ── Cart Items (SCROLLABLE within cart) ── */}
              <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                <div className="p-2">
                  <AnimatePresence>
                    {cart.length === 0 ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
                        <ShoppingBag className="size-10 text-muted-foreground/15 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Tap services to add</p>
                      </motion.div>
                    ) : (
                      cart.map(item => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex items-start gap-2 p-2.5 rounded-xl hover:bg-foreground/[0.02] transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                              <span>{item.category}</span>
                              <span className="text-border">·</span>
                              <span className="flex items-center gap-0.5"><Timer className="size-2" />{item.duration || 0}m</span>
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex items-center border border-border/50 rounded-lg overflow-hidden">
                                <button className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors" onClick={() => updateQuantity(item.id, -1)}>
                                  <Minus className="size-3" />
                                </button>
                                <span className="h-6 w-6 flex items-center justify-center text-xs font-semibold">{item.quantity}</span>
                                <button className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors" onClick={() => updateQuantity(item.id, 1)}>
                                  <Plus className="size-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold">{formatPKR(item.unitPrice * item.quantity - item.discount)}</p>
                            {item.quantity > 1 && <p className="text-[10px] text-muted-foreground">{formatPKR(item.unitPrice)} each</p>}
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 shrink-0" onClick={() => removeFromCart(item.id)}>
                            <X className="size-3" />
                          </Button>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ── Cart Footer (STATIC bottom) ── */}
              <div className="shrink-0 border-t border-border/50">
                {/* Discount Row */}
                <div className="px-4 pt-3 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex size-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
                      <Percent className="size-3" />
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-1">Discount</span>
                    <div className="flex gap-0.5">
                      {[0, 5, 10, 15, 20].map(pct => (
                        <Button key={pct} size="sm" variant={discountPercent === pct ? 'default' : 'outline'} className={cn('h-5 text-[9px] px-1.5 rounded-md', discountPercent === pct && 'bg-tahoe-accent text-white')} onClick={() => { setDiscountPercent(pct); setCustomDiscount('') }}>
                          {pct}%
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-2">
                  <Separator />
                </div>

                {/* Totals */}
                <div className="px-4 pb-2 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal ({totalItems} items)</span><span>{formatPKR(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tax (5%)</span><span>{formatPKR(tax)}</span></div>
                  {discountValue > 0 && (
                    <div className="flex justify-between text-emerald-600"><span>Discount ({discountPercent}%)</span><span>-{formatPKR(discountValue)}</span></div>
                  )}
                </div>

                <div className="px-4 pb-2">
                  <Separator />
                </div>

                <div className="px-4 pb-2 flex justify-between items-center">
                  <span className="text-sm font-bold">Grand Total</span>
                  <motion.span key={grandTotal} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="text-xl font-black text-rose-600 dark:text-rose-400">
                    {formatPKR(grandTotal)}
                  </motion.span>
                </div>

                {/* Payment Method */}
                <div className="px-4 pb-2">
                  <Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Payment Method</Label>
                  <div className="grid grid-cols-4 gap-1">
                    {paymentMethods.map(pm => (
                      <TooltipProvider key={pm.value}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className={cn(
                                'flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all text-center',
                                paymentMethod === pm.value ? 'border-rose-500/50 bg-rose-500/5 shadow-sm' : 'border-border/50 hover:border-border'
                              )}
                              onClick={() => setPaymentMethod(pm.value)}
                            >
                              <div className={cn('flex size-5 items-center justify-center rounded-md text-white', pm.color)}>
                                <pm.icon className="size-2.5" />
                              </div>
                              <span className="text-[8px] font-medium">{pm.label}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent><p>Pay with {pm.label}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </div>

                {/* Checkout Button */}
                <div className="px-4 pb-3">
                  <Button
                    className="w-full h-11 text-sm font-bold rounded-xl gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg shadow-rose-500/20"
                    onClick={() => cart.length > 0 ? setShowCheckout(true) : toast.error('Cart is empty')}
                    disabled={cart.length === 0}
                  >
                    <Zap className="size-4" />
                    Complete Sale — {formatPKR(grandTotal)}
                  </Button>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" className="flex-1 h-7 text-[10px] rounded-lg gap-1" onClick={clearCart} disabled={cart.length === 0}>
                      <Trash2 className="size-3" /> Clear
                    </Button>
                    <Button variant="outline" className="flex-1 h-7 text-[10px] rounded-lg gap-1" onClick={() => setViewMode('history')}>
                      <Receipt className="size-3" /> History
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── MOBILE: Cart (non-sticky, below products) ── */}
          <div className="lg:hidden space-y-3">
            {/* Customer Selector */}
            <GlassCard className="p-3" hover3d={false} animateOnMount={false}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={cn('flex size-8 items-center justify-center rounded-lg shrink-0', selectedCustomer ? 'bg-rose-500/10 text-rose-500' : 'bg-foreground/5 text-muted-foreground')}>
                    <User className="size-4" />
                  </div>
                  {selectedCustomer ? (
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{selectedCustomer.phone} · <Star className="size-2.5 inline text-amber-500" /> {selectedCustomer.loyaltyTier}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Walk-in Customer</p>
                  )}
                </div>
                <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg gap-1 shrink-0" onClick={() => setShowCustomerPicker(true)}>
                  <User className="size-3" /> {selectedCustomer ? 'Change' : 'Select'}
                </Button>
              </div>
            </GlassCard>

            {/* Cart Items */}
            <GlassCard className="p-0 overflow-hidden" hover3d={false} animateOnMount={false}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-foreground/[0.01]">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="size-4 text-rose-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Current Order</span>
                  <Badge variant="outline" className="text-[9px] h-5 px-1.5">{totalItems}</Badge>
                </div>
                {cart.length > 0 && (
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-500 hover:text-red-600 gap-1" onClick={clearCart}>
                    <Trash2 className="size-3" /> Clear
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-[280px]">
                <div className="p-2">
                  <AnimatePresence>
                    {cart.length === 0 ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
                        <ShoppingBag className="size-10 text-muted-foreground/15 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Tap services to add</p>
                      </motion.div>
                    ) : (
                      cart.map(item => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex items-start gap-2 p-2.5 rounded-xl hover:bg-foreground/[0.02] transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground">{item.category} · {item.duration || 0}m</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex items-center border border-border/50 rounded-lg overflow-hidden">
                                <button className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors" onClick={() => updateQuantity(item.id, -1)}>
                                  <Minus className="size-3" />
                                </button>
                                <span className="h-6 w-6 flex items-center justify-center text-xs font-semibold">{item.quantity}</span>
                                <button className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors" onClick={() => updateQuantity(item.id, 1)}>
                                  <Plus className="size-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold">{formatPKR(item.unitPrice * item.quantity - item.discount)}</p>
                            {item.quantity > 1 && <p className="text-[10px] text-muted-foreground">{formatPKR(item.unitPrice)} each</p>}
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 shrink-0" onClick={() => removeFromCart(item.id)}>
                            <X className="size-3" />
                          </Button>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </GlassCard>

            {/* Cart Summary & Actions */}
            <GlassCard className="p-4" hover3d={false} animateOnMount={false}>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                  <Percent className="size-3.5" />
                </div>
                <span className="text-xs text-muted-foreground flex-1">Discount</span>
                <div className="flex gap-1">
                  {[0, 5, 10, 15, 20].map(pct => (
                    <Button key={pct} size="sm" variant={discountPercent === pct ? 'default' : 'outline'} className={cn('h-6 text-[10px] px-2 rounded-md', discountPercent === pct && 'bg-tahoe-accent text-white')} onClick={() => { setDiscountPercent(pct); setCustomDiscount('') }}>
                      {pct}%
                    </Button>
                  ))}
                </div>
              </div>
              <Separator className="mb-3" />
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal ({totalItems} items)</span><span>{formatPKR(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax (5%)</span><span>{formatPKR(tax)}</span></div>
                {discountValue > 0 && (
                  <div className="flex justify-between text-emerald-600"><span>Discount ({discountPercent}%)</span><span>-{formatPKR(discountValue)}</span></div>
                )}
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold">Grand Total</span>
                <motion.span key={grandTotal} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="text-xl font-black text-rose-600 dark:text-rose-400">
                  {formatPKR(grandTotal)}
                </motion.span>
              </div>
              <div className="mb-3">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Payment Method</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {paymentMethods.map(pm => (
                    <TooltipProvider key={pm.value}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className={cn(
                              'flex flex-col items-center gap-1 p-2 rounded-xl border transition-all text-center',
                              paymentMethod === pm.value ? 'border-rose-500/50 bg-rose-500/5 shadow-sm' : 'border-border/50 hover:border-border'
                            )}
                            onClick={() => setPaymentMethod(pm.value)}
                          >
                            <div className={cn('flex size-6 items-center justify-center rounded-lg text-white', pm.color)}>
                              <pm.icon className="size-3" />
                            </div>
                            <span className="text-[9px] font-medium">{pm.label}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent><p>Pay with {pm.label}</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>
              <Button
                className="w-full h-12 text-sm font-bold rounded-xl gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg shadow-rose-500/20"
                onClick={() => cart.length > 0 ? setShowCheckout(true) : toast.error('Cart is empty')}
                disabled={cart.length === 0}
              >
                <Zap className="size-4" />
                Complete Sale — {formatPKR(grandTotal)}
              </Button>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" className="flex-1 h-8 text-[10px] rounded-lg gap-1" onClick={clearCart} disabled={cart.length === 0}>
                  <Trash2 className="size-3" /> Clear
                </Button>
                <Button variant="outline" className="flex-1 h-8 text-[10px] rounded-lg gap-1" onClick={() => setViewMode('history')}>
                  <Receipt className="size-3" /> History
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      ) : (
        /* ═══ TRANSACTION HISTORY ═════════════════════════════════════════════ */
        <GlassCard className="overflow-hidden">
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent Transactions</h3>
            <Badge variant="outline" className="text-[10px]">{invoices.length} invoices</Badge>
          </div>
          <ScrollArea className="max-h-[500px]">
            <div className="divide-y divide-border/50">
              {invoices.map(inv => (
                <motion.div
                  key={inv.id}
                  className="flex items-center justify-between p-4 hover:bg-foreground/[0.02] transition-colors cursor-pointer"
                  whileHover={{ x: 2 }}
                  onClick={() => { setCompletedInvoice(inv); setShowReceipt(true) }}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('flex size-9 items-center justify-center rounded-xl text-white text-xs', inv.paymentStatus === 'paid' ? 'bg-emerald-500' : inv.paymentStatus === 'pending' ? 'bg-amber-500' : 'bg-red-500')}>
                      {inv.paymentStatus === 'paid' ? <CheckCircle2 className="size-4" /> : inv.paymentStatus === 'pending' ? <Clock className="size-4" /> : <AlertCircle className="size-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{inv.invoiceNumber}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {inv.customer ? `${inv.customer.firstName} ${inv.customer.lastName}` : 'Walk-in'} · {formatDate(inv.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatPKR(inv.totalAmount)}</p>
                      <div className="flex items-center gap-1 justify-end">
                        {inv.paymentMethod === 'cash' && <Banknote className="size-2.5 text-emerald-500" />}
                        {inv.paymentMethod === 'card' && <CreditCard className="size-2.5 text-blue-500" />}
                        {inv.paymentMethod === 'wallet' && <Wallet className="size-2.5 text-purple-500" />}
                        <span className="text-[10px] text-muted-foreground capitalize">{inv.paymentMethod}</span>
                      </div>
                    </div>
                    <Eye className="size-3.5 text-muted-foreground" />
                  </div>
                </motion.div>
              ))}
              {invoices.length === 0 && (
                <div className="p-12 text-center">
                  <Receipt className="size-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No transactions yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </GlassCard>
      )}

      {/* ═══ DIALOGS ═══════════════════════════════════════════════════════════ */}

      {/* ─── Checkout Confirmation ─────────────────────────────────────────── */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white">
                <ShoppingCart className="size-4" />
              </div>
              Confirm Sale
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Customer */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-foreground/[0.02]">
              <User className="size-4 text-muted-foreground" />
              <span className="text-sm">{selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : 'Walk-in Customer'}</span>
            </div>

            {/* Items Summary */}
            <div className="space-y-1">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between text-xs">
                  <span>{item.name} × {item.quantity}</span>
                  <span className="font-semibold">{formatPKR(item.unitPrice * item.quantity - item.discount)}</span>
                </div>
              ))}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPKR(subtotal)}</span></div>
              <div className="flex justify-between"><span>Tax (5%)</span><span>{formatPKR(tax)}</span></div>
              {discountValue > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatPKR(discountValue)}</span></div>}
              <Separator />
              <div className="flex justify-between text-base font-bold"><span>Total</span><span className="text-rose-600">{formatPKR(grandTotal)}</span></div>
            </div>

            {/* Payment Method */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-foreground/[0.02]">
              {paymentMethod === 'cash' && <Banknote className="size-4 text-emerald-500" />}
              {paymentMethod === 'card' && <CreditCard className="size-4 text-blue-500" />}
              {paymentMethod === 'wallet' && <Wallet className="size-4 text-purple-500" />}
              {paymentMethod === 'split' && <Receipt className="size-4 text-amber-500" />}
              <span className="text-sm font-medium capitalize">{paymentMethod} Payment</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setShowCheckout(false)}>Cancel</Button>
            <Button className="rounded-xl gap-1.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white" onClick={handleCompleteSale} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Confirm & Charge {formatPKR(grandTotal)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Receipt Dialog ────────────────────────────────────────────────── */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5 text-rose-500" /> Sale Complete
            </DialogTitle>
          </DialogHeader>
          {completedInvoice && (
            <div className="space-y-4 py-2">
              {/* Success Animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mx-auto"
              >
                <CheckCircle2 className="size-8" />
              </motion.div>

              <div className="text-center">
                <p className="text-lg font-bold">{formatPKR(completedInvoice.totalAmount)}</p>
                <p className="text-xs text-muted-foreground">{completedInvoice.invoiceNumber}</p>
              </div>

              <div className="p-3 rounded-xl bg-foreground/[0.02] space-y-1.5 text-xs">
                <div className="flex justify-between"><span>Payment</span><span className="capitalize font-semibold">{completedInvoice.paymentMethod}</span></div>
                <div className="flex justify-between"><span>Customer</span><span>{completedInvoice.customer ? `${completedInvoice.customer.firstName} ${completedInvoice.customer.lastName}` : 'Walk-in'}</span></div>
                <div className="flex justify-between"><span>Items</span><span>{completedInvoice.items?.length || 0}</span></div>
              </div>

              {/* Items */}
              <div className="space-y-1">
                {(completedInvoice.items || []).map(item => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <span>{item.name} × {item.quantity}</span>
                    <span className="font-semibold">{formatPKR(item.total)}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-1.5 text-xs rounded-xl" onClick={printReceipt}>
                  <Printer className="size-3.5" /> Print Receipt
                </Button>
                <Button className="flex-1 gap-1.5 text-xs rounded-xl" onClick={() => { setShowReceipt(false); clearCart() }}>
                  <Plus className="size-3.5" /> New Sale
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Customer Picker ───────────────────────────────────────────────── */}
      <Dialog open={showCustomerPicker} onOpenChange={setShowCustomerPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><User className="size-5 text-rose-500" /> Select Customer</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input placeholder="Search by name or phone..." className="pl-9 h-9 text-sm rounded-xl" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} />
            </div>
            <ScrollArea className="max-h-64">
              <div className="space-y-1">
                <button
                  className={cn('flex items-center gap-3 w-full p-2.5 rounded-xl transition-colors text-left', !selectedCustomer ? 'bg-rose-500/5 border border-rose-500/30' : 'hover:bg-foreground/[0.02]')}
                  onClick={() => { setSelectedCustomer(null); setShowCustomerPicker(false) }}
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-foreground/5 text-muted-foreground"><User className="size-4" /></div>
                  <div><p className="text-xs font-semibold">Walk-in Customer</p><p className="text-[10px] text-muted-foreground">No loyalty points</p></div>
                </button>
                {customers
                  .filter(c => !customerSearch || `${c.firstName} ${c.lastName} ${c.phone}`.toLowerCase().includes(customerSearch.toLowerCase()))
                  .map(customer => (
                    <button
                      key={customer.id}
                      className={cn('flex items-center gap-3 w-full p-2.5 rounded-xl transition-colors text-left', selectedCustomer?.id === customer.id ? 'bg-rose-500/5 border border-rose-500/30' : 'hover:bg-foreground/[0.02]')}
                      onClick={() => { setSelectedCustomer(customer); setShowCustomerPicker(false) }}
                    >
                      <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 text-white text-xs font-bold">
                        {customer.firstName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{customer.firstName} {customer.lastName}</p>
                        <p className="text-[10px] text-muted-foreground">{customer.phone} · <Star className="size-2 inline text-amber-500" /> {customer.loyaltyTier} · {customer.loyaltyPoints} pts</p>
                      </div>
                    </button>
                  ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
