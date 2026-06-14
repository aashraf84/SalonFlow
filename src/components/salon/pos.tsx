'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/salon/glass-card'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  ShoppingCart, DollarSign, CreditCard, Search, Plus, Minus, X, Eye,
  Receipt, Wallet, Banknote, User, CheckCircle2, Clock, AlertCircle,
  ScanBarcode, Tag, Percent, Gift, Star, Printer, ChevronRight,
  Trash2, Loader2, Scissors, Package, ArrowRight, Sparkles, Hash,
  ShoppingBag, Zap, TrendingUp, ArrowUpDown,
  Timer, Users, HandCoins, CircleDot, Flame, Gem
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────
interface ServiceType {
  id: string; name: string; description?: string; duration: number; price: number; isActive: boolean; isPackage: boolean
  taxRate: number; taxType: string
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
  duration?: number; staffId?: string; staffName?: string; discount: number; notes?: string
  category?: string
  taxRate: number; taxType: string
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


  // POS Tax Mode State
  const [posTaxMode, setPosTaxMode] = useState<'included' | 'excluded' | 'none'>('included')

  // Keyboard Navigation State
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const serviceListRef = useRef<HTMLDivElement>(null)
  const completeSaleRef = useRef<() => void>(() => {})

  // Staff Picker State
  const [staffList, setStaffList] = useState<{id: string; firstName: string; lastName: string; role: string; specialization?: string; avatar?: string}[]>([])
  const [showStaffPicker, setShowStaffPicker] = useState(false)
  const [pendingService, setPendingService] = useState<ServiceType & {categoryName?: string; categoryId?: string} | null>(null)

  // Tax Settings State
  const [taxSettings, setTaxSettings] = useState<{ taxMode: string; taxRate: string; taxName: string }>({
    taxMode: 'none',
    taxRate: '0',
    taxName: 'Tax',
  })

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

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch('/api/staff')
      const json = await res.json()
      if (json.success) setStaffList(json.data)
    } catch {}
  }, [])

  const fetchTaxSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      const json = await res.json()
      if (json.success) {
        const g = json.data.grouped
        const business = g.business || {}
        setTaxSettings({
          taxMode: business.business_taxMode || 'none',
          taxRate: business.business_taxRate || '0',
          taxName: business.business_taxName || 'Tax',
        })
      }
    } catch {}
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchInvoices(), fetchServices(), fetchCustomers(), fetchStaff(), fetchTaxSettings()])
      setLoading(false)
    }
    load()
  }, [fetchInvoices, fetchServices, fetchCustomers, fetchStaff, fetchTaxSettings])

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

  const handleServiceClick = useCallback((service: ServiceType & { categoryName?: string; categoryId?: string }) => {
    setPendingService(service)
    setShowStaffPicker(true)
  }, [])

  // Keyboard navigation handler
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => Math.min(prev + 1, filteredServices.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && highlightedIndex >= 0 && highlightedIndex < filteredServices.length) {
      e.preventDefault()
      handleServiceClick(filteredServices[highlightedIndex])
    }
  }, [filteredServices, highlightedIndex, handleServiceClick])

  // Reset highlighted index when search or category changes
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [searchQuery, selectedCategory])

  // Auto-scroll to highlighted item
  useEffect(() => {
    if (highlightedIndex >= 0 && serviceListRef.current) {
      const items = serviceListRef.current.querySelectorAll('[data-service-index]')
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [highlightedIndex])

  // ─── Global Keyboard Shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input (except F-keys)
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      const isFKey = e.key.startsWith('F') && e.key.length > 1

      // F1 — Focus search
      if (e.key === 'F1') {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      // F2 — Cash payment
      if (e.key === 'F2') {
        e.preventDefault()
        setPaymentMethod('cash')
        toast.success('Payment: Cash', { duration: 800 })
        return
      }

      // F3 — Card payment
      if (e.key === 'F3') {
        e.preventDefault()
        setPaymentMethod('card')
        toast.success('Payment: Card', { duration: 800 })
        return
      }

      // F4 — Wallet payment
      if (e.key === 'F4') {
        e.preventDefault()
        setPaymentMethod('wallet')
        toast.success('Payment: Wallet', { duration: 800 })
        return
      }

      // F5 — Split payment
      if (e.key === 'F5') {
        e.preventDefault()
        setPaymentMethod('split')
        toast.success('Payment: Split', { duration: 800 })
        return
      }

      // F9 — Clear cart
      if (e.key === 'F9') {
        e.preventDefault()
        if (cart.length > 0) {
          clearCart()
          toast.success('Cart cleared', { duration: 800 })
        }
        return
      }

      // F10 — Post Bill / Checkout
      if (e.key === 'F10') {
        e.preventDefault()
        if (cart.length > 0) {
          setShowCheckout(true)
        } else {
          toast.error('Cart is empty')
        }
        return
      }

      // F12 — Customer picker
      if (e.key === 'F12') {
        e.preventDefault()
        setShowCustomerPicker(true)
        return
      }

      // Escape — close dialogs, clear search, blur input
      if (e.key === 'Escape') {
        if (showStaffPicker) { setShowStaffPicker(false); setPendingService(null); return }
        if (showCustomerPicker) { setShowCustomerPicker(false); return }
        if (showCheckout) { setShowCheckout(false); return }
        if (showReceipt) { setShowReceipt(false); return }
        if (searchQuery) { setSearchQuery(''); searchInputRef.current?.blur(); return }
        if (isInput) { target.blur(); return }
        return
      }

      // Ctrl+Enter — Post Bill (alternative to F10)
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault()
        if (cart.length > 0) {
          setShowCheckout(true)
        }
        return
      }

      // Enter — Confirm sale when checkout dialog is open
      if (e.key === 'Enter' && showCheckout && !submitting) {
        e.preventDefault()
        completeSaleRef.current()
        return
      }

      // / key — Quick focus search (vim-style, only when not in input)
      if (e.key === '/' && !isInput) {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [cart.length, clearCart, searchQuery, showStaffPicker, showCustomerPicker, showCheckout, showReceipt, submitting])

  const handleStaffSelect = useCallback((staffId: string | null, staffName: string | null) => {
    if (!pendingService) return
    setCart(prev => {
      const existing = prev.find(item => item.id === pendingService.id && item.staffId === staffId)
      if (existing) {
        return prev.map(item =>
          item.id === pendingService.id && item.staffId === staffId ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, {
        id: pendingService.id,
        itemType: 'service',
        name: pendingService.name,
        unitPrice: pendingService.price,
        quantity: 1,
        duration: pendingService.duration,
        discount: 0,
        category: pendingService.categoryName,
        staffId: staffId || undefined,
        staffName: staffName || undefined,
        taxRate: pendingService.taxRate || 0,
        taxType: pendingService.taxType || 'none',
      }]
    })
    toast.success(`${pendingService.name} added${staffName ? ` — ${staffName}` : ''}`, { duration: 1200 })
    setShowStaffPicker(false)
    setPendingService(null)
  }, [pendingService])

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

  // Calculate per-item tax
  const totalTax = useMemo(() => {
    return cart.reduce((sum, item) => {
      if (item.taxType === 'none' || !item.taxRate || item.taxRate <= 0) return sum
      const itemSubtotal = (item.unitPrice * item.quantity) - item.discount
      return sum + (itemSubtotal * item.taxRate / 100)
    }, 0)
  }, [cart])

  const discountValue = subtotal * discountPercent / 100
  const grandTotal = useMemo(() => {
    if (posTaxMode === 'included') return subtotal + totalTax - discountValue
    if (posTaxMode === 'excluded') return subtotal - totalTax - discountValue
    return subtotal - discountValue  // 'none'
  }, [subtotal, totalTax, discountValue, posTaxMode])

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
          tax: posTaxMode === 'none' ? 0 : totalTax,
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
            staffId: item.staffId,
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

  // Keep ref updated for keyboard handler
  completeSaleRef.current = handleCompleteSale

  // ─── Print Receipt ──────────────────────────────────────────────────────
  const printReceipt = () => {
    if (!completedInvoice) return
    const c = completedInvoice.customer
    const w = window.open('', '_blank')
    if (!w) return

    // Determine tax line for receipt
    const receiptTaxItems = cart.filter(item => item.taxType !== 'none' && item.taxRate > 0)
    const receiptAvgRate = receiptTaxItems.length > 0 ? receiptTaxItems.reduce((s, i) => s + i.taxRate, 0) / receiptTaxItems.length : 0
    const receiptTaxLine = (posTaxMode === 'none' || totalTax <= 0) ? '' :
      `<tr><td>Sales Tax (${receiptAvgRate.toFixed(1)}% ${posTaxMode === 'included' ? 'incl.' : 'excl.'})</td><td>${formatPKR(totalTax)}</td></tr>`

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
      ${receiptTaxLine}
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

  // ─── Tax display helper ─────────────────────────────────────────────────
  const renderTaxLine = (className?: string) => {
    if (posTaxMode === 'none' || totalTax <= 0) return null
    const taxItems = cart.filter(item => item.taxType !== 'none' && item.taxRate > 0)
    const avgRate = taxItems.length > 0 ? taxItems.reduce((s, i) => s + i.taxRate, 0) / taxItems.length : 0
    return (
      <div className={cn('flex justify-between', className)}>
        <span className="text-muted-foreground">
          Sales Tax ({avgRate.toFixed(1)}% {posTaxMode === 'included' ? 'incl.' : 'excl.'})
        </span>
        <span>{formatPKR(totalTax)}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* ─── Top Bar: Mode Toggle + Shortcut Keys ──────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant={viewMode === 'pos' ? 'default' : 'outline'} className={cn('text-xs rounded-xl gap-1.5', viewMode === 'pos' && 'bg-tahoe-accent text-white')} onClick={() => setViewMode('pos')}>
            <ShoppingCart className="size-3.5" /> Point of Sale
          </Button>
          <Button size="sm" variant={viewMode === 'history' ? 'default' : 'outline'} className={cn('text-xs rounded-xl gap-1.5', viewMode === 'history' && 'bg-tahoe-accent text-white')} onClick={() => setViewMode('history')}>
            <Receipt className="size-3.5" /> History
          </Button>
        </div>
        {/* ─── Shortcut Keys Bar ───────────────────────────────────────────── */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { key: 'F1', label: 'Search', icon: Search, action: () => searchInputRef.current?.focus() },
            { key: 'F2', label: 'Cash', icon: Banknote, action: () => { setPaymentMethod('cash'); toast.success('Payment: Cash', { duration: 800 }) } },
            { key: 'F3', label: 'Card', icon: CreditCard, action: () => { setPaymentMethod('card'); toast.success('Payment: Card', { duration: 800 }) } },
            { key: 'F4', label: 'Wallet', icon: Wallet, action: () => { setPaymentMethod('wallet'); toast.success('Payment: Wallet', { duration: 800 }) } },
            { key: 'F5', label: 'Split', icon: Receipt, action: () => { setPaymentMethod('split'); toast.success('Payment: Split', { duration: 800 }) } },
            { key: 'F9', label: 'Clear', icon: Trash2, action: () => { if (cart.length > 0) { clearCart(); toast.success('Cart cleared', { duration: 800 }) } } },
            { key: 'F10', label: 'Post Bill', icon: Zap, action: () => { if (cart.length > 0) setShowCheckout(true) } },
            { key: 'F12', label: 'Customer', icon: User, action: () => setShowCustomerPicker(true) },
            { key: 'Esc', label: 'Close', icon: X, action: () => { setShowStaffPicker(false); setShowCustomerPicker(false); setShowCheckout(false); setSearchQuery('') } },
          ].map(s => (
            <TooltipProvider key={s.key}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={s.action}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors border border-transparent hover:border-border/50"
                  >
                    <kbd className="px-1 py-0.5 rounded bg-foreground/[0.06] text-[9px] font-mono font-bold tracking-tight">{s.key}</kbd>
                    <span className="hidden lg:inline">{s.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent><p>{s.key} — {s.label}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      {viewMode === 'pos' ? (
        <>
        {/* ═══ POS LAYOUT — SERVICES LEFT, CART RIGHT ═════════════════════ */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* ─── LEFT: Services / Search Area ─────────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl">
            {/* Search Bar — sticky top */}
            <div className="shrink-0 px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search / Scan service... (F1)"
                    className="pl-10 h-10 text-sm rounded-xl bg-foreground/[0.02] border-border/50 focus:border-rose-500/50"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    ref={searchInputRef}
                  />
                  {searchQuery && (
                    <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setSearchQuery('')}>
                      <X className="size-3" />
                    </Button>
                  )}
                </div>
                {/* Category Filter Dropdown */}
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[160px] h-10 text-xs rounded-xl">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {categoryIcons[cat.name] || '✨'} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Service List — SCROLLABLE */}
            <div className="flex-1 overflow-y-auto custom-scrollbar" ref={serviceListRef}>
              {searchQuery || selectedCategory !== 'all' ? (
                <div className="space-y-0.5 p-2">
                  <AnimatePresence>
                    {filteredServices.map((service, idx) => {
                      const inCart = cart.find(i => i.id === service.id)
                      return (
                        <motion.button
                          key={service.id}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleServiceClick(service)}
                          data-service-index={idx}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-left group',
                            highlightedIndex === idx ? 'bg-rose-500/10 ring-1 ring-rose-500/30' :
                            inCart
                              ? 'bg-rose-500/[0.04]'
                              : 'hover:bg-foreground/[0.02]'
                          )}
                        >
                          <div className={cn('flex size-8 items-center justify-center rounded-lg shrink-0 text-xs', inCart ? 'bg-rose-500/10 text-rose-500' : 'bg-foreground/[0.03] text-muted-foreground')}>
                            {categoryIcons[service.categoryName || ''] || '✨'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{service.name}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                              <span className="uppercase tracking-wide">{service.categoryName}</span>
                              <span className="text-border">·</span>
                              <span className="flex items-center gap-0.5"><Timer className="size-2" />{service.duration}m</span>
                              {service.taxRate > 0 && service.taxType !== 'none' && (
                                <>
                                  <span className="text-border">·</span>
                                  <span className="text-emerald-600">{service.taxRate}% tax</span>
                                </>
                              )}
                            </p>
                          </div>
                          {service.isPackage && (
                            <Badge className="h-4 text-[8px] bg-amber-500/10 text-amber-600 border-amber-500/20 border px-1.5 shrink-0">PKG</Badge>
                          )}
                          <span className="text-sm font-bold text-rose-600 dark:text-rose-400 shrink-0">{formatPKR(service.price)}</span>
                          {inCart ? (
                            <Badge className="h-5 text-[10px] bg-rose-500 text-white px-1.5 shrink-0">{inCart.quantity}×</Badge>
                          ) : (
                            <div className="flex size-6 items-center justify-center rounded-md bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <Plus className="size-3" />
                            </div>
                          )}
                        </motion.button>
                      )
                    })}
                  </AnimatePresence>
                  {filteredServices.length === 0 && (
                    <div className="py-16 text-center">
                      <Package className="size-10 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No services found</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty State — no search active */
                <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-foreground/[0.03] text-muted-foreground/30 mb-4">
                    <ScanBarcode className="size-8" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Search to add services</p>
                  <p className="text-xs text-muted-foreground/60">Type a service name or scan barcode · <kbd className="px-1 py-0.5 rounded bg-foreground/5 text-[10px] font-mono">F1</kbd></p>
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground/50">
                    <span>↑↓ Navigate</span>
                    <span>·</span>
                    <span>Enter Add</span>
                    <span>·</span>
                    <span>{allServices.length} services loaded</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── RIGHT: Cart (STATIC / STICKY) ────────────────────────────────── */}
          <div className="w-[460px] shrink-0 flex flex-col overflow-hidden hidden lg:flex">
            <div className="flex flex-col h-full rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl shadow-lg">
              {/* ── Cart Header (static top) ── */}
              <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
                    <ShoppingCart className="size-3.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">Current Sale</span>
                  <Badge variant="outline" className="text-[9px] h-5 px-1.5">{totalItems} items</Badge>
                </div>
                {cart.length > 0 && (
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-500 hover:text-red-600 gap-1" onClick={clearCart}>
                    <Trash2 className="size-3" /> Clear
                  </Button>
                )}
              </div>

              {/* ── Customer Selector (inline) ── */}
              <div className="shrink-0 px-4 py-2 border-b border-border/50 bg-foreground/[0.01]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={cn('flex size-6 items-center justify-center rounded-md shrink-0', selectedCustomer ? 'bg-rose-500/10 text-rose-500' : 'bg-foreground/5 text-muted-foreground')}>
                      <User className="size-3" />
                    </div>
                    {selectedCustomer ? (
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold truncate">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{selectedCustomer.phone}</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">Walk-in Customer</p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="h-6 text-[9px] rounded-md gap-1 shrink-0 px-2" onClick={() => setShowCustomerPicker(true)}>
                    {selectedCustomer ? 'Change' : 'Select'}
                  </Button>
                </div>
              </div>

              {/* ── Cart Items (SCROLLABLE) ── */}
              <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-foreground/[0.03] text-muted-foreground/20 mb-3">
                      <ShoppingBag className="size-7" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">No items in sale</p>
                    <p className="text-[10px] text-muted-foreground/60">Search services to add to the bill</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    <AnimatePresence>
                      {cart.map(item => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -30 }}
                          className="px-4 py-3 hover:bg-foreground/[0.01] transition-colors group"
                        >
                          {/* Item name + delete */}
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{item.name}</p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <span>{item.category}</span>
                                {item.staffName && <><span className="text-border">·</span><span className="text-rose-500">{item.staffName}</span></>}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 shrink-0" onClick={() => removeFromCart(item.id)}>
                              <X className="size-3" />
                            </Button>
                          </div>
                          {/* Unit price + qty + line total */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">{formatPKR(item.unitPrice)} each</span>
                            <div className="flex items-center gap-3">
                              {/* Quantity stepper */}
                              <div className="flex items-center border border-border/50 rounded-md overflow-hidden">
                                <button className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors" onClick={() => updateQuantity(item.id, -1)}>
                                  <Minus className="size-2.5" />
                                </button>
                                <span className="h-5 w-5 flex items-center justify-center text-[10px] font-bold">{item.quantity}</span>
                                <button className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors" onClick={() => updateQuantity(item.id, 1)}>
                                  <Plus className="size-2.5" />
                                </button>
                              </div>
                              <span className="text-xs font-bold min-w-[70px] text-right">{formatPKR(item.unitPrice * item.quantity - item.discount)}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* ── Cart Footer (STATIC bottom) ── */}
              <div className="shrink-0 border-t border-border/50">
                {/* Totals */}
                <div className="px-4 pt-3 pb-2 space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPKR(subtotal)}</span></div>
                  {renderTaxLine()}
                  {discountValue > 0 && (
                    <div className="flex justify-between text-emerald-600"><span>Discount ({discountPercent}%)</span><span>−{formatPKR(discountValue)}</span></div>
                  )}
                </div>

                <div className="px-4 pb-2"><Separator /></div>

                {/* Grand Total */}
                <div className="px-4 pb-2 flex justify-between items-center">
                  <span className="text-sm font-bold">Net Total</span>
                  <motion.span key={grandTotal} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="text-lg font-black text-rose-600 dark:text-rose-400">
                    {formatPKR(grandTotal)}
                  </motion.span>
                </div>

                {/* Discount + Tax Mode Row */}
                <div className="px-4 pb-2 flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-[10px] rounded-md gap-1 flex-1">
                        <Percent className="size-3" /> Discount {discountPercent > 0 ? `(${discountPercent}%)` : ''}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="start">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-semibold">Quick Discount</Label>
                        <div className="flex gap-1">
                          {[0, 5, 10, 15, 20].map(pct => (
                            <Button key={pct} size="sm" variant={discountPercent === pct ? 'default' : 'outline'} className={cn('h-6 text-[10px] px-2 rounded-md', discountPercent === pct && 'bg-tahoe-accent text-white')} onClick={() => { setDiscountPercent(pct); setCustomDiscount('') }}>
                              {pct}%
                            </Button>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn('h-7 text-[10px] rounded-md gap-1 flex-1', posTaxMode !== 'none' && 'border-rose-500/30 text-rose-600')}>
                        {posTaxMode === 'included' ? <Percent className="size-3" /> : posTaxMode === 'excluded' ? <ArrowUpDown className="size-3" /> : <X className="size-3" />}
                        Tax: {posTaxMode === 'included' ? 'Incl.' : posTaxMode === 'excluded' ? 'Excl.' : 'None'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="end">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-semibold">Tax Mode</Label>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { value: 'included', label: 'Included', icon: Percent },
                            { value: 'excluded', label: 'Excluded', icon: ArrowUpDown },
                            { value: 'none', label: 'No Tax', icon: X },
                          ].map(mode => (
                            <button
                              key={mode.value}
                              className={cn(
                                'flex flex-col items-center gap-0.5 p-2 rounded-lg border transition-all text-center',
                                posTaxMode === mode.value ? 'border-rose-500/50 bg-rose-500/5 shadow-sm' : 'border-border/50 hover:border-border'
                              )}
                              onClick={() => setPosTaxMode(mode.value as 'included' | 'excluded' | 'none')}
                            >
                              <mode.icon className={cn('size-3', posTaxMode === mode.value ? 'text-rose-500' : 'text-muted-foreground')} />
                              <span className="text-[9px] font-medium">{mode.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Payment Method */}
                <div className="px-4 pb-2">
                  <div className="grid grid-cols-4 gap-1">
                    {paymentMethods.map((pm, idx) => (
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
                              <kbd className="text-[7px] text-muted-foreground/50 font-mono">F{idx + 2}</kbd>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent><p>{pm.label} Payment (F{idx + 2})</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </div>

                {/* Post Bill Button */}
                <div className="px-4 pb-3">
                  <Button
                    className="w-full h-12 text-sm font-bold rounded-xl gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg shadow-rose-500/20"
                    onClick={() => cart.length > 0 ? setShowCheckout(true) : toast.error('Cart is empty')}
                    disabled={cart.length === 0}
                  >
                    <Zap className="size-4" />
                    Post Bill — {formatPKR(grandTotal)}
                    <span className="ml-auto text-[10px] opacity-70">F10</span>
                  </Button>
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
                  <div className={cn('flex size-7 items-center justify-center rounded-lg shrink-0', selectedCustomer ? 'bg-rose-500/10 text-rose-500' : 'bg-foreground/5 text-muted-foreground')}>
                    <User className="size-3.5" />
                  </div>
                  {selectedCustomer ? (
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{selectedCustomer.phone}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Walk-in Customer</p>
                  )}
                </div>
                <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg gap-1 shrink-0" onClick={() => setShowCustomerPicker(true)}>
                  {selectedCustomer ? 'Change' : 'Select'}
                </Button>
              </div>
            </GlassCard>

            {/* Cart Items */}
            <GlassCard className="p-0 overflow-hidden" hover3d={false} animateOnMount={false}>
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="size-3.5 text-rose-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Current Sale</span>
                  <Badge variant="outline" className="text-[9px] h-5 px-1.5">{totalItems}</Badge>
                </div>
                {cart.length > 0 && (
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-500 hover:text-red-600 gap-1" onClick={clearCart}>
                    <Trash2 className="size-3" /> Clear
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-[280px]">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ShoppingBag className="size-8 text-muted-foreground/15 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No items in sale</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    <AnimatePresence>
                      {cart.map(item => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -30 }}
                          className="px-4 py-2.5 group"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{item.name}</p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <span>{item.category}</span>
                                {item.staffName && <><span>·</span><span className="text-rose-500">{item.staffName}</span></>}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-red-400 hover:text-red-500 shrink-0" onClick={() => removeFromCart(item.id)}>
                              <X className="size-3" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">{formatPKR(item.unitPrice)} each</span>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center border border-border/50 rounded-md overflow-hidden">
                                <button className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors" onClick={() => updateQuantity(item.id, -1)}>
                                  <Minus className="size-2.5" />
                                </button>
                                <span className="h-5 w-5 flex items-center justify-center text-[10px] font-bold">{item.quantity}</span>
                                <button className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors" onClick={() => updateQuantity(item.id, 1)}>
                                  <Plus className="size-2.5" />
                                </button>
                              </div>
                              <span className="text-xs font-bold">{formatPKR(item.unitPrice * item.quantity - item.discount)}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </ScrollArea>
            </GlassCard>

            {/* Cart Summary & Actions */}
            <GlassCard className="p-4" hover3d={false} animateOnMount={false}>
              <div className="space-y-1.5 text-xs mb-3">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPKR(subtotal)}</span></div>
                {renderTaxLine()}
                {discountValue > 0 && (
                  <div className="flex justify-between text-emerald-600"><span>Discount ({discountPercent}%)</span><span>−{formatPKR(discountValue)}</span></div>
                )}
              </div>
              <Separator className="mb-3" />
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold">Net Total</span>
                <motion.span key={grandTotal} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="text-lg font-black text-rose-600 dark:text-rose-400">
                  {formatPKR(grandTotal)}
                </motion.span>
              </div>
              {/* Discount + Tax */}
              <div className="flex items-center gap-2 mb-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] rounded-md gap-1 flex-1">
                      <Percent className="size-3" /> Discount {discountPercent > 0 ? `(${discountPercent}%)` : ''}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-semibold">Quick Discount</Label>
                      <div className="flex gap-1">
                        {[0, 5, 10, 15, 20].map(pct => (
                          <Button key={pct} size="sm" variant={discountPercent === pct ? 'default' : 'outline'} className={cn('h-6 text-[10px] px-2 rounded-md', discountPercent === pct && 'bg-tahoe-accent text-white')} onClick={() => { setDiscountPercent(pct); setCustomDiscount('') }}>
                            {pct}%
                          </Button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn('h-7 text-[10px] rounded-md gap-1 flex-1', posTaxMode !== 'none' && 'border-rose-500/30 text-rose-600')}>
                      {posTaxMode === 'included' ? <Percent className="size-3" /> : posTaxMode === 'excluded' ? <ArrowUpDown className="size-3" /> : <X className="size-3" />}
                      Tax: {posTaxMode === 'included' ? 'Incl.' : posTaxMode === 'excluded' ? 'Excl.' : 'None'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="end">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-semibold">Tax Mode</Label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { value: 'included', label: 'Included', icon: Percent },
                          { value: 'excluded', label: 'Excluded', icon: ArrowUpDown },
                          { value: 'none', label: 'No Tax', icon: X },
                        ].map(mode => (
                          <button
                            key={mode.value}
                            className={cn(
                              'flex flex-col items-center gap-0.5 p-2 rounded-lg border transition-all text-center',
                              posTaxMode === mode.value ? 'border-rose-500/50 bg-rose-500/5 shadow-sm' : 'border-border/50 hover:border-border'
                            )}
                            onClick={() => setPosTaxMode(mode.value as 'included' | 'excluded' | 'none')}
                          >
                            <mode.icon className={cn('size-3', posTaxMode === mode.value ? 'text-rose-500' : 'text-muted-foreground')} />
                            <span className="text-[9px] font-medium">{mode.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              {/* Payment Method */}
              <div className="mb-3">
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
                Post Bill — {formatPKR(grandTotal)}
              </Button>
            </GlassCard>
          </div>
        </div>

        {/* ─── Bottom Stats Bar ─────────────────────────────────────────────── */}
        <div className="shrink-0 mt-3 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl px-4 py-2.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <DollarSign className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Today</p>
                <p className="text-xs font-bold truncate">{formatPKR(todaySales)}</p>
              </div>
              <span className="text-[9px] text-muted-foreground ml-0.5">{todayTransactions} txn</span>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                <ShoppingCart className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Cart</p>
                <p className="text-xs font-bold truncate">{formatPKR(grandTotal)}</p>
              </div>
              <span className="text-[9px] text-muted-foreground ml-0.5">{totalItems} items</span>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                <Clock className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Duration</p>
                <p className="text-xs font-bold truncate">{Math.floor(totalDuration / 60)}h {totalDuration % 60}m</p>
              </div>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <TrendingUp className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Avg</p>
                <p className="text-xs font-bold truncate">{formatPKR(invoices.length > 0 ? invoices.reduce((s, i) => s + i.totalAmount, 0) / invoices.length : 0)}</p>
              </div>
            </div>
          </div>
        </div>
        </>
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
                  <span>{item.name}{item.staffName ? ` (${item.staffName})` : ''} × {item.quantity}</span>
                  <span className="font-semibold">{formatPKR(item.unitPrice * item.quantity - item.discount)}</span>
                </div>
              ))}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPKR(subtotal)}</span></div>
              {posTaxMode !== 'none' && totalTax > 0 && (() => {
                const taxItems = cart.filter(item => item.taxType !== 'none' && item.taxRate > 0)
                const avgRate = taxItems.length > 0 ? taxItems.reduce((s, i) => s + i.taxRate, 0) / taxItems.length : 0
                return (
                  <div className="flex justify-between">
                    <span>Sales Tax ({avgRate.toFixed(1)}% {posTaxMode === 'included' ? 'incl.' : 'excl.'})</span>
                    <span>{formatPKR(totalTax)}</span>
                  </div>
                )
              })()}
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
            <Button variant="outline" className="rounded-xl" onClick={() => setShowCheckout(false)}>
              Cancel <kbd className="ml-1 px-1 py-0.5 rounded bg-foreground/5 text-[9px] font-mono">Esc</kbd>
            </Button>
            <Button className="rounded-xl gap-1.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white" onClick={handleCompleteSale} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Confirm & Charge {formatPKR(grandTotal)}
              <kbd className="ml-1 px-1 py-0.5 rounded bg-white/20 text-[9px] font-mono">Enter</kbd>
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

      {/* ─── Staff Picker ──────────────────────────────────────────────────── */}
      <Dialog open={showStaffPicker} onOpenChange={(open) => { setShowStaffPicker(open); if (!open) setPendingService(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5 text-rose-500" /> Select Staff
            </DialogTitle>
          </DialogHeader>
          {pendingService && (
            <div className="space-y-3 py-2">
              <div className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <p className="text-xs font-semibold">{pendingService.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatPKR(pendingService.price)} · {pendingService.duration}m</p>
              </div>
              <ScrollArea className="max-h-64">
                <div className="space-y-1">
                  <button
                    className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-foreground/[0.02] transition-colors text-left"
                    onClick={() => handleStaffSelect(null, null)}
                  >
                    <div className="flex size-8 items-center justify-center rounded-lg bg-foreground/5 text-muted-foreground">
                      <Plus className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">No Staff (Skip)</p>
                      <p className="text-[10px] text-muted-foreground">Add without assigning staff</p>
                    </div>
                  </button>
                  {staffList.map(staff => (
                    <button
                      key={staff.id}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-foreground/[0.02] transition-colors text-left"
                      onClick={() => handleStaffSelect(staff.id, `${staff.firstName} ${staff.lastName}`)}
                    >
                      <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 text-white text-xs font-bold">
                        {staff.firstName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{staff.firstName} {staff.lastName}</p>
                        <p className="text-[10px] text-muted-foreground">{staff.specialization || staff.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
