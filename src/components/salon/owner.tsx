'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GlassCard, AnimatedMetricCard, StaggerContainer, StaggerItem } from '@/components/salon/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Building2, Users, Key, FileText, CreditCard, BarChart3, Plus, Search, Filter,
  Eye, Edit, Trash2, Printer, Copy, RefreshCw, Check, X, Loader2, Shield,
  Crown, Zap, Package, Calendar, DollarSign, TrendingUp, MoreVertical,
  ArrowRight, ChevronDown, FileSpreadsheet, Download, AlertCircle, Globe,
  MapPin, Phone, Mail, Layers, ToggleLeft, Hash
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────
interface OwnerClientType {
  id: string
  companyName: string
  slug: string
  contactPerson: string
  email: string
  phone: string
  address?: string
  city?: string
  state?: string
  country: string
  postalCode?: string
  website?: string
  industry: string
  businessType?: string
  taxId?: string
  registrationNo?: string
  purchaseType: string
  status: string
  planName?: string
  billingCycle?: string
  currency: string
  tenantDbPath?: string
  tenantDbStatus: string
  onboardedAt: string
  lastActiveAt: string
  createdAt: string
  updatedAt: string
  modules?: { id: string; moduleKey: string; moduleName: string; isActive: boolean }[]
  serialKeys?: SerialKeyType[]
  subscriptions?: SubscriptionType[]
  users?: ClientUserType[]
  invoices?: InvoiceType[]
  quotations?: QuotationType[]
  _count?: { invoices: number; quotations: number; subscriptions: number; serialKeys: number }
}

interface SerialKeyType {
  id: string
  clientId?: string
  key: string
  type: string
  status: string
  maxDevices: number
  activeDevices: number
  validFrom?: string
  validUntil?: string
  activatedAt?: string
  revokedAt?: string
  notes?: string
  createdAt: string
  client?: { id: string; companyName: string; email: string }
}

interface InvoiceType {
  id: string
  clientId: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  subtotal: number
  taxRate: number
  taxAmount: number
  discountRate: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  currency: string
  paymentStatus: string
  paymentMethod?: string
  paymentRef?: string
  paidAt?: string
  notes?: string
  terms?: string
  createdAt: string
  client?: OwnerClientType
  items?: InvoiceItemType[]
}

interface InvoiceItemType {
  id: string
  invoiceId: string
  itemType: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

interface QuotationType {
  id: string
  clientId: string
  quotationNumber: string
  subject?: string
  issueDate: string
  validUntil: string
  subtotal: number
  taxRate: number
  taxAmount: number
  discountRate: number
  discountAmount: number
  totalAmount: number
  currency: string
  status: string
  notes?: string
  terms?: string
  internalNotes?: string
  convertedInvoiceId?: string
  createdAt: string
  client?: OwnerClientType
  items?: QuotationItemType[]
}

interface QuotationItemType {
  id: string
  quotationId: string
  itemType: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

interface SubscriptionType {
  id: string
  clientId: string
  planName: string
  price: number
  billingCycle: string
  startDate: string
  endDate: string
  status: string
  autoRenew: boolean
  nextBillingDate?: string
  cancelledAt?: string
  notes?: string
  createdAt: string
  client?: OwnerClientType
}

interface ClientUserType {
  id: string
  clientId: string
  name: string
  email: string
  phone?: string
  role: string
  status: string
  lastLoginAt?: string
  createdAt: string
  client?: { id: string; companyName: string }
}

// ─── Module Catalog ───────────────────────────────────────────────────────
const MODULE_CATALOG = [
  { key: 'dashboard', name: 'Dashboard', icon: '📊' },
  { key: 'appointments', name: 'Appointments', icon: '📅' },
  { key: 'customers', name: 'Customers', icon: '👥' },
  { key: 'services', name: 'Services', icon: '✂️' },
  { key: 'staff', name: 'Staff', icon: '👩‍💼' },
  { key: 'rooms', name: 'Rooms', icon: '🚪' },
  { key: 'scheduling', name: 'Scheduling', icon: '⏰' },
  { key: 'memberships', name: 'Memberships', icon: '👑' },
  { key: 'loyalty', name: 'Loyalty & Rewards', icon: '⭐' },
  { key: 'gift-cards', name: 'Gift Cards', icon: '🎁' },
  { key: 'pos', name: 'Point of Sale', icon: '🛒' },
  { key: 'inventory', name: 'Inventory', icon: '📦' },
  { key: 'finance', name: 'Finance', icon: '💰' },
  { key: 'commissions', name: 'Commissions', icon: '🪙' },
  { key: 'waitlist', name: 'Waitlist', icon: '⏳' },
  { key: 'marketing', name: 'Marketing', icon: '📢' },
  { key: 'feedback', name: 'Feedback', icon: '💬' },
  { key: 'branches', name: 'Branches', icon: '🏢' },
  { key: 'reports', name: 'Reports', icon: '📈' },
  { key: 'ai-assistant', name: 'AI Assistant', icon: '🤖' },
  { key: 'settings', name: 'Settings', icon: '⚙️' },
  { key: 'notifications', name: 'Notifications', icon: '🔔' },
]

// ─── Helper Functions ─────────────────────────────────────────────────────
const formatPKR = (amount: number) => `Rs. ${amount.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const formatDate = (d: string) => new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  trial: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  suspended: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  available: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  assigned: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  activated: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  expired: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  revoked: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  paid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  unpaid: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  partial: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  overdue: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  draft: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  sent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  viewed: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  accepted: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  converted: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  paused: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  creating: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  error: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  migrating: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
}

const StatusBadge = ({ status }: { status: string }) => (
  <Badge variant="outline" className={cn('text-[10px] font-semibold capitalize border', statusColors[status] || 'bg-slate-500/10 text-slate-500 border-slate-500/20')}>
    {status}
  </Badge>
)

// ─── Main Component ───────────────────────────────────────────────────────
export function OwnerModule() {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  // Data states
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [clients, setClients] = useState<OwnerClientType[]>([])
  const [serialKeys, setSerialKeys] = useState<SerialKeyType[]>([])
  const [invoices, setInvoices] = useState<InvoiceType[]>([])
  const [quotations, setQuotations] = useState<QuotationType[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionType[]>([])
  const [clientUsers, setClientUsers] = useState<ClientUserType[]>([])

  // Search & filter states
  const [clientSearch, setClientSearch] = useState('')
  const [clientStatusFilter, setClientStatusFilter] = useState('all')
  const [keyStatusFilter, setKeyStatusFilter] = useState('all')
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all')
  const [quoteStatusFilter, setQuoteStatusFilter] = useState('all')

  // Dialog states
  const [showClientForm, setShowClientForm] = useState(false)
  const [showClientDetail, setShowClientDetail] = useState(false)
  const [selectedClient, setSelectedClient] = useState<OwnerClientType | null>(null)
  const [showKeyGen, setShowKeyGen] = useState(false)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceType | null>(null)
  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [showQuoteDetail, setShowQuoteDetail] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<QuotationType | null>(null)
  const [showSubForm, setShowSubForm] = useState(false)
  const [showUserForm, setShowUserForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form states for client creation
  const [clientForm, setClientForm] = useState({
    companyName: '', industry: 'Beauty & Salon', businessType: 'salon', website: '',
    taxId: '', registrationNo: '',
    contactPerson: '', email: '', phone: '',
    address: '', city: '', state: '', country: 'Pakistan', postalCode: '',
    purchaseType: 'subscription', planName: 'Professional', billingCycle: 'monthly', currency: 'PKR',
    adminName: '', adminEmail: '', adminPhone: '',
    autoSerialKey: true, serialKeyType: 'subscription',
    validFrom: '', validUntil: '',
    selectedModules: ['dashboard', 'appointments', 'customers', 'services', 'staff'] as string[],
  })

  // Invoice form
  const [invoiceForm, setInvoiceForm] = useState({
    clientId: '', taxRate: 0, discountRate: 0, notes: '', terms: 'Payment due within 30 days of invoice date.',
    items: [{ itemType: 'subscription', description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }] as InvoiceItemType[]
  })

  // Quotation form
  const [quoteForm, setQuoteForm] = useState({
    clientId: '', subject: '', validUntil: '', taxRate: 0, discountRate: 0, notes: '', terms: 'This quotation is valid for 30 days from the issue date.',
    items: [{ itemType: 'subscription', description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }] as QuotationItemType[]
  })

  // Key gen form
  const [keyGenForm, setKeyGenForm] = useState({ count: 1, type: 'subscription', clientId: '' })

  // Subscription form
  const [subForm, setSubForm] = useState({
    clientId: '', planName: 'Professional', price: 0, billingCycle: 'monthly', startDate: '', endDate: '', autoRenew: true, notes: ''
  })

  // User form
  const [userForm, setUserForm] = useState({ clientId: '', name: '', email: '', phone: '', role: 'admin' })

  // ─── Data Fetching ────────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/owner/dashboard')
      const data = await res.json()
      if (data.success) setDashboardData(data.data)
    } catch { toast.error('Failed to load dashboard') }
  }, [])

  const fetchClients = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (clientSearch) params.set('search', clientSearch)
      if (clientStatusFilter !== 'all') params.set('status', clientStatusFilter)
      const res = await fetch(`/api/owner/clients?${params}`)
      const data = await res.json()
      if (data.success) setClients(data.data)
    } catch { toast.error('Failed to load clients') }
  }, [clientSearch, clientStatusFilter])

  const fetchSerialKeys = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (keyStatusFilter !== 'all') params.set('status', keyStatusFilter)
      const res = await fetch(`/api/owner/serial-keys?${params}`)
      const data = await res.json()
      if (data.success) setSerialKeys(data.data)
    } catch { toast.error('Failed to load serial keys') }
  }, [keyStatusFilter])

  const fetchInvoices = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (invoiceStatusFilter !== 'all') params.set('paymentStatus', invoiceStatusFilter)
      const res = await fetch(`/api/owner/invoices?${params}`)
      const data = await res.json()
      if (data.success) setInvoices(data.data)
    } catch { toast.error('Failed to load invoices') }
  }, [invoiceStatusFilter])

  const fetchQuotations = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (quoteStatusFilter !== 'all') params.set('status', quoteStatusFilter)
      const res = await fetch(`/api/owner/quotations?${params}`)
      const data = await res.json()
      if (data.success) setQuotations(data.data)
    } catch { toast.error('Failed to load quotations') }
  }, [quoteStatusFilter])

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await fetch('/api/owner/subscriptions')
      const data = await res.json()
      if (data.success) setSubscriptions(data.data)
    } catch { toast.error('Failed to load subscriptions') }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/owner/users')
      const data = await res.json()
      if (data.success) setClientUsers(data.data)
    } catch { toast.error('Failed to load users') }
  }, [])

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchDashboard(), fetchClients(), fetchSerialKeys(), fetchInvoices(), fetchQuotations(), fetchSubscriptions(), fetchUsers()])
      setLoading(false)
    }
    load()
  }, [])

  // Refresh on filter change
  useEffect(() => { fetchClients() }, [clientSearch, clientStatusFilter, fetchClients])
  useEffect(() => { fetchSerialKeys() }, [keyStatusFilter, fetchSerialKeys])
  useEffect(() => { fetchInvoices() }, [invoiceStatusFilter, fetchInvoices])
  useEffect(() => { fetchQuotations() }, [quoteStatusFilter, fetchQuotations])

  // ─── Handlers ─────────────────────────────────────────────────────────
  const handleCreateClient = async () => {
    if (!clientForm.companyName || !clientForm.contactPerson || !clientForm.email || !clientForm.phone) {
      toast.error('Please fill in all required fields')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/owner/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientForm)
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Client created successfully! Tenant database provisioned.')
        setShowClientForm(false)
        resetClientForm()
        fetchClients()
        fetchDashboard()
        fetchSerialKeys()
      } else {
        toast.error(data.error || 'Failed to create client')
      }
    } catch { toast.error('Failed to create client') }
    finally { setSaving(false) }
  }

  const resetClientForm = () => {
    setClientForm({
      companyName: '', industry: 'Beauty & Salon', businessType: 'salon', website: '',
      taxId: '', registrationNo: '',
      contactPerson: '', email: '', phone: '',
      address: '', city: '', state: '', country: 'Pakistan', postalCode: '',
      purchaseType: 'subscription', planName: 'Professional', billingCycle: 'monthly', currency: 'PKR',
      adminName: '', adminEmail: '', adminPhone: '',
      autoSerialKey: true, serialKeyType: 'subscription',
      validFrom: '', validUntil: '',
      selectedModules: ['dashboard', 'appointments', 'customers', 'services', 'staff'],
    })
  }

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Delete this client and all related data?')) return
    try {
      const res = await fetch(`/api/owner/clients/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) { toast.success('Client deleted'); fetchClients(); fetchDashboard() }
      else toast.error(data.error)
    } catch { toast.error('Delete failed') }
  }

  const handleViewClient = async (id: string) => {
    try {
      const res = await fetch(`/api/owner/clients/${id}`)
      const data = await res.json()
      if (data.success) { setSelectedClient(data.data); setShowClientDetail(true) }
      else toast.error(data.error)
    } catch { toast.error('Failed to load client') }
  }

  const handleGenerateKeys = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/owner/serial-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keyGenForm)
      })
      const data = await res.json()
      if (data.success) { toast.success(`${keyGenForm.count} key(s) generated`); setShowKeyGen(false); fetchSerialKeys() }
      else toast.error(data.error)
    } catch { toast.error('Failed to generate keys') }
    finally { setSaving(false) }
  }

  const handleUpdateKey = async (id: string, updates: any) => {
    try {
      const res = await fetch(`/api/owner/serial-keys/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates)
      })
      const data = await res.json()
      if (data.success) { toast.success('Key updated'); fetchSerialKeys() }
      else toast.error(data.error)
    } catch { toast.error('Update failed') }
  }

  const handleCreateInvoice = async () => {
    if (!invoiceForm.clientId || invoiceForm.items.length === 0) {
      toast.error('Select a client and add items')
      return
    }
    setSaving(true)
    try {
      const subtotal = invoiceForm.items.reduce((s, i) => s + i.total, 0)
      const res = await fetch('/api/owner/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...invoiceForm, subtotal })
      })
      const data = await res.json()
      if (data.success) { toast.success('Invoice created'); setShowInvoiceForm(false); fetchInvoices(); fetchDashboard() }
      else toast.error(data.error)
    } catch { toast.error('Failed to create invoice') }
    finally { setSaving(false) }
  }

  const handleViewInvoice = async (id: string) => {
    try {
      const res = await fetch(`/api/owner/invoices/${id}`)
      const data = await res.json()
      if (data.success) { setSelectedInvoice(data.data); setShowInvoiceDetail(true) }
      else toast.error(data.error)
    } catch { toast.error('Failed to load invoice') }
  }

  const handleCreateQuotation = async () => {
    if (!quoteForm.clientId || quoteForm.items.length === 0) {
      toast.error('Select a client and add items')
      return
    }
    setSaving(true)
    try {
      const subtotal = quoteForm.items.reduce((s, i) => s + i.total, 0)
      const res = await fetch('/api/owner/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...quoteForm, subtotal })
      })
      const data = await res.json()
      if (data.success) { toast.success('Quotation created'); setShowQuoteForm(false); fetchQuotations() }
      else toast.error(data.error)
    } catch { toast.error('Failed to create quotation') }
    finally { setSaving(false) }
  }

  const handleViewQuotation = async (id: string) => {
    try {
      const res = await fetch(`/api/owner/quotations/${id}`)
      const data = await res.json()
      if (data.success) { setSelectedQuote(data.data); setShowQuoteDetail(true) }
      else toast.error(data.error)
    } catch { toast.error('Failed to load quotation') }
  }

  const handleConvertQuotation = async (id: string) => {
    try {
      const res = await fetch(`/api/owner/quotations/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'converted' })
      })
      const data = await res.json()
      if (data.success) { toast.success('Quotation converted to invoice'); setShowQuoteDetail(false); fetchQuotations(); fetchInvoices() }
      else toast.error(data.error)
    } catch { toast.error('Conversion failed') }
  }

  const handleCreateSubscription = async () => {
    if (!subForm.clientId || !subForm.planName) { toast.error('Fill required fields'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/owner/subscriptions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subForm)
      })
      const data = await res.json()
      if (data.success) { toast.success('Subscription created'); setShowSubForm(false); fetchSubscriptions() }
      else toast.error(data.error)
    } catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  const handleCreateUser = async () => {
    if (!userForm.clientId || !userForm.name || !userForm.email) { toast.error('Fill required fields'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/owner/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm)
      })
      const data = await res.json()
      if (data.success) { toast.success('User created'); setShowUserForm(false); fetchUsers() }
      else toast.error(data.error)
    } catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  const handleUpdateInvoiceStatus = async (id: string, updates: any) => {
    try {
      const res = await fetch(`/api/owner/invoices/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates)
      })
      const data = await res.json()
      if (data.success) { toast.success('Invoice updated'); fetchInvoices(); fetchDashboard() }
      else toast.error(data.error)
    } catch { toast.error('Update failed') }
  }

  const handleUpdateSubscription = async (id: string, updates: any) => {
    try {
      const res = await fetch(`/api/owner/subscriptions/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates)
      })
      const data = await res.json()
      if (data.success) { toast.success('Subscription updated'); fetchSubscriptions() }
      else toast.error(data.error)
    } catch { toast.error('Update failed') }
  }

  // ─── Invoice Item Helpers ─────────────────────────────────────────────
  const addInvoiceItem = () => {
    setInvoiceForm(f => ({
      ...f,
      items: [...f.items, { itemType: 'subscription', description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }]
    }))
  }
  const updateInvoiceItem = (idx: number, field: string, value: any) => {
    setInvoiceForm(f => {
      const items = [...f.items]
      items[idx] = { ...items[idx], [field]: value }
      items[idx].total = (items[idx].quantity * items[idx].unitPrice) - items[idx].discount
      return { ...f, items }
    })
  }
  const removeInvoiceItem = (idx: number) => {
    setInvoiceForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  const addQuoteItem = () => {
    setQuoteForm(f => ({
      ...f,
      items: [...f.items, { itemType: 'subscription', description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }]
    }))
  }
  const updateQuoteItem = (idx: number, field: string, value: any) => {
    setQuoteForm(f => {
      const items = [...f.items]
      items[idx] = { ...items[idx], [field]: value }
      items[idx].total = (items[idx].quantity * items[idx].unitPrice) - items[idx].discount
      return { ...f, items }
    })
  }
  const removeQuoteItem = (idx: number) => {
    setQuoteForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  // ─── Print Functions ──────────────────────────────────────────────────
  const printInvoice = () => {
    if (!selectedInvoice) return
    const c = selectedInvoice.client as any
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${selectedInvoice.invoiceNumber}</title>
    <style>
      @page { size: A4; margin: 0; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a2e; line-height: 1.5; }
      .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 20mm; position: relative; }
      .header { border-bottom: 3px solid #e11d48; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
      .logo-area h1 { font-size: 28px; font-weight: 800; color: #e11d48; letter-spacing: -0.5px; }
      .logo-area p { font-size: 11px; color: #666; margin-top: 2px; }
      .invoice-label { text-align: right; }
      .invoice-label h2 { font-size: 32px; font-weight: 300; color: #e11d48; letter-spacing: 2px; }
      .invoice-label p { font-size: 12px; color: #666; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
      .info-box h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #999; margin-bottom: 8px; }
      .info-box p { font-size: 13px; margin-bottom: 2px; }
      .info-box .name { font-weight: 700; font-size: 15px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
      thead th { background: #f8f8fa; padding: 10px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; text-align: left; border-bottom: 2px solid #e11d48; }
      tbody td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
      tbody tr:nth-child(even) { background: #fafafa; }
      .totals { display: flex; justify-content: flex-end; }
      .totals-table { width: 280px; }
      .totals-table tr td { padding: 6px 0; font-size: 13px; }
      .totals-table tr td:last-child { text-align: right; font-weight: 600; }
      .totals-table .grand-total td { border-top: 2px solid #e11d48; padding-top: 10px; font-size: 18px; font-weight: 800; color: #e11d48; }
      .footer { position: absolute; bottom: 20mm; left: 20mm; right: 20mm; border-top: 1px solid #ddd; padding-top: 15px; }
      .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
      .footer h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 5px; }
      .footer p { font-size: 11px; color: #666; }
      .bank-info { background: #f8f8fa; padding: 12px; border-radius: 6px; margin-top: 20px; }
      .bank-info h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 5px; }
      .bank-info p { font-size: 12px; color: #333; margin-bottom: 2px; }
      .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 100px; color: rgba(0,0,0,0.02); font-weight: 900; pointer-events: none; z-index: -1; }
      @media print { .page { margin: 0; } }
    </style></head><body>
    <div class="watermark">SALONFLOW</div>
    <div class="page">
      <div class="header">
        <div class="logo-area">
          <h1>SalonFlow OS</h1>
          <p>Enterprise Resource Planning</p>
          <p style="margin-top:8px; font-size:12px; color:#333;">ApexFlow Ecosystem</p>
          <p style="font-size:11px; color:#666;">Karachi, Pakistan</p>
          <p style="font-size:11px; color:#666;">info@salonflow.pk | +92-300-1234567</p>
        </div>
        <div class="invoice-label">
          <h2>INVOICE</h2>
          <p><strong>${selectedInvoice.invoiceNumber}</strong></p>
          <p>Date: ${formatDate(selectedInvoice.issueDate)}</p>
          <p>Due: ${formatDate(selectedInvoice.dueDate)}</p>
        </div>
      </div>
      <div class="info-grid">
        <div class="info-box">
          <h3>Bill To</h3>
          <p class="name">${c?.companyName || 'N/A'}</p>
          <p>${c?.address || ''}</p>
          <p>${[c?.city, c?.state, c?.postalCode].filter(Boolean).join(', ')}</p>
          <p>${c?.country || 'Pakistan'}</p>
          <p style="margin-top:5px;">Attn: ${c?.contactPerson || 'N/A'}</p>
          <p>${c?.email || ''}</p>
          <p>${c?.phone || ''}</p>
        </div>
        <div class="info-box">
          <h3>Invoice Details</h3>
          <p>Payment Status: <strong>${selectedInvoice.paymentStatus.toUpperCase()}</strong></p>
          <p>Currency: ${selectedInvoice.currency}</p>
          ${selectedInvoice.paymentMethod ? `<p>Payment Method: ${selectedInvoice.paymentMethod}</p>` : ''}
          ${selectedInvoice.taxId ? `<p>NTN/CNIC: ${c?.taxId}</p>` : ''}
        </div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Discount</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>
          ${(selectedInvoice.items || []).map((item, i) => `<tr><td>${i + 1}</td><td>${item.description}</td><td>${item.quantity}</td><td>${formatPKR(item.unitPrice)}</td><td>${item.discount > 0 ? formatPKR(item.discount) : '-'}</td><td style="text-align:right">${formatPKR(item.total)}</td></tr>`).join('')}
        </tbody>
      </table>
      <div class="totals">
        <table class="totals-table">
          <tr><td>Subtotal</td><td>${formatPKR(selectedInvoice.subtotal)}</td></tr>
          ${selectedInvoice.taxAmount > 0 ? `<tr><td>Tax (${selectedInvoice.taxRate}%)</td><td>${formatPKR(selectedInvoice.taxAmount)}</td></tr>` : ''}
          ${selectedInvoice.discountAmount > 0 ? `<tr><td>Discount (${selectedInvoice.discountRate}%)</td><td>-${formatPKR(selectedInvoice.discountAmount)}</td></tr>` : ''}
          <tr class="grand-total"><td>Grand Total</td><td>${formatPKR(selectedInvoice.totalAmount)}</td></tr>
        </table>
      </div>
      ${selectedInvoice.terms ? `<div style="margin-top:25px;"><h4 style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:5px;">Terms & Conditions</h4><p style="font-size:11px;color:#666;">${selectedInvoice.terms}</p></div>` : ''}
      <div class="bank-info">
        <h4>Bank Details</h4>
        <p><strong>Account Name:</strong> SalonFlow OS - ApexFlow Ecosystem</p>
        <p><strong>Bank:</strong> HBL - Habib Bank Limited</p>
        <p><strong>Account No:</strong> 1234-5678-9012-3456</p>
        <p><strong>IBAN:</strong> PK36HABB0012345678901234</p>
        <p><strong>Branch:</strong> DHA Phase 6, Karachi</p>
      </div>
      <div class="footer">
        <div class="footer-grid">
          <div>
            <h4>Thank You</h4>
            <p>Thank you for your business. We appreciate your trust in SalonFlow OS.</p>
          </div>
          <div style="text-align:right">
            <h4>SalonFlow OS</h4>
            <p>ApexFlow Ecosystem | www.salonflow.pk</p>
            <p>This is a computer-generated document.</p>
          </div>
        </div>
      </div>
    </div></body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  const printQuotation = () => {
    if (!selectedQuote) return
    const c = selectedQuote.client as any
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><title>Quotation ${selectedQuote.quotationNumber}</title>
    <style>
      @page { size: A4; margin: 0; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a2e; line-height: 1.5; }
      .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 20mm; position: relative; }
      .header { border-bottom: 3px solid #7c3aed; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
      .logo-area h1 { font-size: 28px; font-weight: 800; color: #7c3aed; letter-spacing: -0.5px; }
      .logo-area p { font-size: 11px; color: #666; margin-top: 2px; }
      .quote-label { text-align: right; }
      .quote-label h2 { font-size: 32px; font-weight: 300; color: #7c3aed; letter-spacing: 2px; }
      .quote-label p { font-size: 12px; color: #666; }
      .valid-badge { display: inline-block; background: #7c3aed10; color: #7c3aed; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-top: 8px; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
      .info-box h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #999; margin-bottom: 8px; }
      .info-box p { font-size: 13px; margin-bottom: 2px; }
      .info-box .name { font-weight: 700; font-size: 15px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
      thead th { background: #f8f8fa; padding: 10px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; text-align: left; border-bottom: 2px solid #7c3aed; }
      tbody td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
      tbody tr:nth-child(even) { background: #fafafa; }
      .totals { display: flex; justify-content: flex-end; }
      .totals-table { width: 280px; }
      .totals-table tr td { padding: 6px 0; font-size: 13px; }
      .totals-table tr td:last-child { text-align: right; font-weight: 600; }
      .totals-table .grand-total td { border-top: 2px solid #7c3aed; padding-top: 10px; font-size: 18px; font-weight: 800; color: #7c3aed; }
      .footer { position: absolute; bottom: 20mm; left: 20mm; right: 20mm; border-top: 1px solid #ddd; padding-top: 15px; }
      .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
      .footer h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 5px; }
      .footer p { font-size: 11px; color: #666; }
      .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 100px; color: rgba(0,0,0,0.02); font-weight: 900; pointer-events: none; z-index: -1; }
    </style></head><body>
    <div class="watermark">QUOTATION</div>
    <div class="page">
      <div class="header">
        <div class="logo-area">
          <h1>SalonFlow OS</h1>
          <p>Enterprise Resource Planning</p>
          <p style="margin-top:8px; font-size:12px; color:#333;">ApexFlow Ecosystem</p>
          <p style="font-size:11px; color:#666;">Karachi, Pakistan</p>
          <p style="font-size:11px; color:#666;">info@salonflow.pk | +92-300-1234567</p>
        </div>
        <div class="quote-label">
          <h2>QUOTATION</h2>
          <p><strong>${selectedQuote.quotationNumber}</strong></p>
          <p>Date: ${formatDate(selectedQuote.issueDate)}</p>
          <div class="valid-badge">Valid Until: ${formatDate(selectedQuote.validUntil)}</div>
        </div>
      </div>
      ${selectedQuote.subject ? `<p style="font-size:16px;font-weight:600;margin-bottom:20px;">${selectedQuote.subject}</p>` : ''}
      <div class="info-grid">
        <div class="info-box">
          <h3>Prepared For</h3>
          <p class="name">${c?.companyName || 'N/A'}</p>
          <p>${c?.address || ''}</p>
          <p>${[c?.city, c?.state, c?.postalCode].filter(Boolean).join(', ')}</p>
          <p>${c?.country || 'Pakistan'}</p>
          <p style="margin-top:5px;">Attn: ${c?.contactPerson || 'N/A'}</p>
          <p>${c?.email || ''}</p>
        </div>
        <div class="info-box">
          <h3>Quotation Details</h3>
          <p>Status: <strong>${selectedQuote.status.toUpperCase()}</strong></p>
          <p>Currency: ${selectedQuote.currency}</p>
        </div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Discount</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>
          ${(selectedQuote.items || []).map((item, i) => `<tr><td>${i + 1}</td><td>${item.description}</td><td>${item.quantity}</td><td>${formatPKR(item.unitPrice)}</td><td>${item.discount > 0 ? formatPKR(item.discount) : '-'}</td><td style="text-align:right">${formatPKR(item.total)}</td></tr>`).join('')}
        </tbody>
      </table>
      <div class="totals">
        <table class="totals-table">
          <tr><td>Subtotal</td><td>${formatPKR(selectedQuote.subtotal)}</td></tr>
          ${selectedQuote.taxAmount > 0 ? `<tr><td>Tax (${selectedQuote.taxRate}%)</td><td>${formatPKR(selectedQuote.taxAmount)}</td></tr>` : ''}
          ${selectedQuote.discountAmount > 0 ? `<tr><td>Discount (${selectedQuote.discountRate}%)</td><td>-${formatPKR(selectedQuote.discountAmount)}</td></tr>` : ''}
          <tr class="grand-total"><td>Grand Total</td><td>${formatPKR(selectedQuote.totalAmount)}</td></tr>
        </table>
      </div>
      ${selectedQuote.terms ? `<div style="margin-top:25px;"><h4 style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:5px;">Terms & Conditions</h4><p style="font-size:11px;color:#666;">${selectedQuote.terms}</p></div>` : ''}
      <div class="footer">
        <div class="footer-grid">
          <div>
            <h4>Acceptance</h4>
            <p>To accept this quotation, please sign and return to us.</p>
          </div>
          <div style="text-align:right">
            <h4>SalonFlow OS</h4>
            <p>ApexFlow Ecosystem | www.salonflow.pk</p>
            <p>This is a computer-generated document.</p>
          </div>
        </div>
      </div>
    </div></body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  // ─── Render Helpers ───────────────────────────────────────────────────
  const tabItems = [
    { value: 'overview', label: 'Overview', icon: BarChart3 },
    { value: 'clients', label: 'Clients', icon: Building2 },
    { value: 'serial-keys', label: 'Serial Keys', icon: Key },
    { value: 'invoices', label: 'Invoices', icon: FileText },
    { value: 'quotations', label: 'Quotations', icon: FileSpreadsheet },
    { value: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { value: 'reports', label: 'Reports', icon: TrendingUp },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Tab Navigation ──────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-foreground/[0.03] p-1 rounded-xl">
            {tabItems.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs gap-1.5 px-3 data-[state=active]:bg-tahoe-accent data-[state=active]:text-white rounded-lg">
                <tab.icon className="size-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs rounded-xl" onClick={() => { fetchDashboard(); fetchClients(); fetchSerialKeys(); fetchInvoices(); fetchQuotations(); fetchSubscriptions(); }}>
              <RefreshCw className="size-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* ─── Overview Tab ────────────────────────────────────────────── */}
        <TabsContent value="overview">
          <StaggerContainer className="space-y-6">
            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StaggerItem>
                <AnimatedMetricCard
                  title="Total Clients"
                  value={String(dashboardData?.totalClients || 0)}
                  subtitle={`${dashboardData?.activeClients || 0} active · ${dashboardData?.trialClients || 0} trial`}
                  icon={Building2}
                  accentGradient="from-rose-500/20 to-pink-500/20"
                  iconBg="bg-rose-500/10 text-rose-600 dark:text-rose-400"
                />
              </StaggerItem>
              <StaggerItem>
                <AnimatedMetricCard
                  title="Active Subscriptions"
                  value={String(dashboardData?.activeSubscriptions || 0)}
                  subtitle="Recurring revenue"
                  icon={CreditCard}
                  accentGradient="from-emerald-500/20 to-teal-500/20"
                  iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                />
              </StaggerItem>
              <StaggerItem>
                <AnimatedMetricCard
                  title="Total Revenue"
                  value={formatPKR(dashboardData?.totalRevenue || 0)}
                  subtitle="From paid invoices"
                  icon={DollarSign}
                  accentGradient="from-amber-500/20 to-orange-500/20"
                  iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                />
              </StaggerItem>
              <StaggerItem>
                <AnimatedMetricCard
                  title="Pending Amount"
                  value={formatPKR(dashboardData?.pendingAmount || 0)}
                  subtitle="Unpaid invoices"
                  icon={AlertCircle}
                  accentGradient="from-red-500/20 to-rose-500/20"
                  iconBg="bg-red-500/10 text-red-600 dark:text-red-400"
                />
              </StaggerItem>
            </div>

            {/* Client Status & Revenue Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold mb-4">Clients by Status</h3>
                <div className="space-y-3">
                  {['active', 'trial', 'suspended', 'cancelled'].map(status => {
                    const count = clients.filter(c => c.status === status).length
                    const total = Math.max(clients.length, 1)
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <StatusBadge status={status} />
                        <div className="flex-1 h-2 bg-foreground/5 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-tahoe-accent rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(count / total) * 100}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground w-8 text-right">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold mb-4">Revenue Trend (Last 6 Months)</h3>
                <div className="flex items-end gap-2 h-40">
                  {(dashboardData?.monthlyRevenue || []).map((m: any, i: number) => {
                    const maxRev = Math.max(...(dashboardData?.monthlyRevenue || []).map((x: any) => x.revenue), 1)
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <motion.div
                          className="w-full bg-gradient-to-t from-rose-500 to-pink-400 rounded-t-md min-h-[4px]"
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max((m.revenue / maxRev) * 120, 4)}px` }}
                          transition={{ duration: 0.6, delay: i * 0.08 }}
                        />
                        <span className="text-[9px] text-muted-foreground font-mono">{m.month}</span>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>
            </div>

            {/* Recent Clients */}
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold mb-4">Recent Clients</h3>
              <div className="space-y-2">
                {clients.slice(0, 5).map(client => (
                  <div key={client.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-foreground/[0.02] transition-colors cursor-pointer" onClick={() => handleViewClient(client.id)}>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 text-white text-xs font-bold">
                        {client.companyName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{client.companyName}</p>
                        <p className="text-xs text-muted-foreground">{client.contactPerson} · {client.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={client.status} />
                      <Badge variant="outline" className="text-[10px]">{client.purchaseType === 'subscription' ? 'Sub' : 'One-time'}</Badge>
                    </div>
                  </div>
                ))}
                {clients.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No clients yet. Create your first client!</p>}
              </div>
            </GlassCard>
          </StaggerContainer>
        </TabsContent>

        {/* ─── Clients Tab ─────────────────────────────────────────────── */}
        <TabsContent value="clients">
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input placeholder="Search clients..." className="pl-9 h-9 text-sm w-full sm:w-64 rounded-xl" value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
                </div>
                <Select value={clientStatusFilter} onValueChange={setClientStatusFilter}>
                  <SelectTrigger className="h-9 w-32 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="gap-1.5 text-xs rounded-xl" onClick={() => setShowClientForm(true)}>
                <Plus className="size-3.5" /> New Client
              </Button>
            </div>

            {/* Client List */}
            <GlassCard className="overflow-hidden">
              <ScrollArea className="max-h-[600px]">
                <div className="divide-y divide-border/50">
                  {clients.map(client => (
                    <motion.div
                      key={client.id}
                      className="flex items-center justify-between p-4 hover:bg-foreground/[0.02] transition-colors cursor-pointer"
                      onClick={() => handleViewClient(client.id)}
                      whileHover={{ x: 2 }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 text-white text-sm font-bold shrink-0">
                          {client.companyName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{client.companyName}</p>
                          <p className="text-xs text-muted-foreground truncate">{client.contactPerson} · {client.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">{client.planName || 'No Plan'}</Badge>
                        <StatusBadge status={client.purchaseType === 'subscription' ? 'subscription' : 'one_time'} />
                        <StatusBadge status={client.status} />
                        <StatusBadge status={client.tenantDbStatus} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="size-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e: any) => { e.stopPropagation(); handleViewClient(client.id) }}><Eye className="size-3.5 mr-2" /> View</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e: any) => { e.stopPropagation(); handleDeleteClient(client.id) }} className="text-red-600"><Trash2 className="size-3.5 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  ))}
                  {clients.length === 0 && (
                    <div className="p-12 text-center">
                      <Building2 className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No clients found. Create your first client!</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </GlassCard>
          </div>
        </TabsContent>

        {/* ─── Serial Keys Tab ──────────────────────────────────────────── */}
        <TabsContent value="serial-keys">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Select value={keyStatusFilter} onValueChange={setKeyStatusFilter}>
                  <SelectTrigger className="h-9 w-36 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="activated">Activated</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="text-[10px]">{serialKeys.length} keys</Badge>
              </div>
              <Button className="gap-1.5 text-xs rounded-xl" onClick={() => setShowKeyGen(true)}>
                <Plus className="size-3.5" /> Generate Keys
              </Button>
            </div>

            <GlassCard className="overflow-hidden">
              <ScrollArea className="max-h-[600px]">
                <div className="divide-y divide-border/50">
                  {serialKeys.map(sk => (
                    <div key={sk.id} className="flex items-center justify-between p-4 hover:bg-foreground/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-foreground/5">
                          <Key className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-mono font-semibold">{sk.key}</p>
                          <p className="text-xs text-muted-foreground">
                            {sk.client?.companyName || 'Unassigned'} · Type: {sk.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={sk.status} />
                        {sk.status === 'available' && (
                          <Select onValueChange={cid => handleUpdateKey(sk.id, { clientId: cid, status: 'assigned' })}>
                            <SelectTrigger className="h-7 w-24 text-[10px] rounded-lg"><SelectValue placeholder="Assign" /></SelectTrigger>
                            <SelectContent>
                              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                        {sk.status === 'assigned' && (
                          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 rounded-lg" onClick={() => handleUpdateKey(sk.id, { status: 'activated', activatedAt: new Date().toISOString() })}>
                            <Zap className="size-3" /> Activate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {serialKeys.length === 0 && (
                    <div className="p-12 text-center">
                      <Key className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No serial keys. Generate some!</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </GlassCard>
          </div>
        </TabsContent>

        {/* ─── Invoices Tab ─────────────────────────────────────────────── */}
        <TabsContent value="invoices">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                <SelectTrigger className="h-9 w-36 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Button className="gap-1.5 text-xs rounded-xl" onClick={() => setShowInvoiceForm(true)}>
                <Plus className="size-3.5" /> Create Invoice
              </Button>
            </div>

            <GlassCard className="overflow-hidden">
              <ScrollArea className="max-h-[600px]">
                <div className="divide-y divide-border/50">
                  {invoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-foreground/[0.02] transition-colors cursor-pointer" onClick={() => handleViewInvoice(inv.id)}>
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-foreground/5">
                          <FileText className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{inv.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">{(inv.client as any)?.companyName || 'N/A'} · {formatDate(inv.issueDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold">{formatPKR(inv.totalAmount)}</span>
                        <StatusBadge status={inv.paymentStatus} />
                        <Eye className="size-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                  {invoices.length === 0 && (
                    <div className="p-12 text-center">
                      <FileText className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No invoices yet.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </GlassCard>
          </div>
        </TabsContent>

        {/* ─── Quotations Tab ───────────────────────────────────────────── */}
        <TabsContent value="quotations">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <Select value={quoteStatusFilter} onValueChange={setQuoteStatusFilter}>
                <SelectTrigger className="h-9 w-36 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
              <Button className="gap-1.5 text-xs rounded-xl" onClick={() => setShowQuoteForm(true)}>
                <Plus className="size-3.5" /> Create Quotation
              </Button>
            </div>

            <GlassCard className="overflow-hidden">
              <ScrollArea className="max-h-[600px]">
                <div className="divide-y divide-border/50">
                  {quotations.map(qt => (
                    <div key={qt.id} className="flex items-center justify-between p-4 hover:bg-foreground/[0.02] transition-colors cursor-pointer" onClick={() => handleViewQuotation(qt.id)}>
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-foreground/5">
                          <FileSpreadsheet className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{qt.quotationNumber}</p>
                          <p className="text-xs text-muted-foreground">{(qt.client as any)?.companyName || 'N/A'} · {qt.subject || 'No subject'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold">{formatPKR(qt.totalAmount)}</span>
                        <StatusBadge status={qt.status} />
                        <Eye className="size-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                  {quotations.length === 0 && (
                    <div className="p-12 text-center">
                      <FileSpreadsheet className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No quotations yet.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </GlassCard>
          </div>
        </TabsContent>

        {/* ─── Subscriptions Tab ────────────────────────────────────────── */}
        <TabsContent value="subscriptions">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{subscriptions.filter(s => s.status === 'active').length} active</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-1.5 text-xs rounded-xl" onClick={() => setShowUserForm(true)}>
                  <Users className="size-3.5" /> Add User
                </Button>
                <Button className="gap-1.5 text-xs rounded-xl" onClick={() => setShowSubForm(true)}>
                  <Plus className="size-3.5" /> New Subscription
                </Button>
              </div>
            </div>

            <GlassCard className="overflow-hidden">
              <ScrollArea className="max-h-[600px]">
                <div className="divide-y divide-border/50">
                  {subscriptions.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-4 hover:bg-foreground/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-foreground/5">
                          <CreditCard className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{sub.planName}</p>
                          <p className="text-xs text-muted-foreground">{(sub.client as any)?.companyName || 'N/A'} · {sub.billingCycle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold">{formatPKR(sub.price)}</span>
                        <StatusBadge status={sub.status} />
                        {sub.status === 'active' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreVertical className="size-3" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleUpdateSubscription(sub.id, { status: 'paused' })}>Pause</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateSubscription(sub.id, { status: 'cancelled', cancelledAt: new Date().toISOString() })} className="text-red-600">Cancel</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {sub.status === 'paused' && (
                          <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg" onClick={() => handleUpdateSubscription(sub.id, { status: 'active' })}>Reactivate</Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {subscriptions.length === 0 && (
                    <div className="p-12 text-center">
                      <CreditCard className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No subscriptions yet.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </GlassCard>
          </div>
        </TabsContent>

        {/* ─── Reports Tab ──────────────────────────────────────────────── */}
        <TabsContent value="reports">
          <OwnerReports clients={clients} invoices={invoices} subscriptions={subscriptions} serialKeys={serialKeys} />
        </TabsContent>
      </Tabs>

      {/* ═══ DIALOGS ═════════════════════════════════════════════════════════ */}

      {/* ─── Create Client Dialog ───────────────────────────────────────── */}
      <Dialog open={showClientForm} onOpenChange={setShowClientForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Building2 className="size-5 text-rose-500" /> Create New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">
            {/* Company Information */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><Globe className="size-3.5" /> Company Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label className="text-xs">Company Name *</Label><Input className="h-9 text-sm rounded-lg" value={clientForm.companyName} onChange={e => setClientForm(f => ({ ...f, companyName: e.target.value }))} placeholder="e.g. Glamour Beauty Lounge" /></div>
                <div><Label className="text-xs">Industry</Label>
                  <Select value={clientForm.industry} onValueChange={v => setClientForm(f => ({ ...f, industry: v }))}>
                    <SelectTrigger className="h-9 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Beauty & Salon">Beauty & Salon</SelectItem><SelectItem value="Spa & Wellness">Spa & Wellness</SelectItem><SelectItem value="Barbershop">Barbershop</SelectItem><SelectItem value="Nail Studio">Nail Studio</SelectItem><SelectItem value="Dermatology Clinic">Dermatology Clinic</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Business Type</Label>
                  <Select value={clientForm.businessType} onValueChange={v => setClientForm(f => ({ ...f, businessType: v }))}>
                    <SelectTrigger className="h-9 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="salon">Salon</SelectItem><SelectItem value="spa">Spa</SelectItem><SelectItem value="barbershop">Barbershop</SelectItem><SelectItem value="nail_studio">Nail Studio</SelectItem><SelectItem value="wellness_center">Wellness Center</SelectItem><SelectItem value="multi_chain">Multi-Chain</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Website</Label><Input className="h-9 text-sm rounded-lg" value={clientForm.website} onChange={e => setClientForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." /></div>
                <div><Label className="text-xs">Tax ID / NTN / CNIC</Label><Input className="h-9 text-sm rounded-lg" value={clientForm.taxId} onChange={e => setClientForm(f => ({ ...f, taxId: e.target.value }))} /></div>
                <div><Label className="text-xs">Registration No</Label><Input className="h-9 text-sm rounded-lg" value={clientForm.registrationNo} onChange={e => setClientForm(f => ({ ...f, registrationNo: e.target.value }))} /></div>
              </div>
            </div>

            <Separator />

            {/* Contact Information */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><Phone className="size-3.5" /> Contact Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label className="text-xs">Contact Person *</Label><Input className="h-9 text-sm rounded-lg" value={clientForm.contactPerson} onChange={e => setClientForm(f => ({ ...f, contactPerson: e.target.value }))} placeholder="Full name" /></div>
                <div><Label className="text-xs">Email *</Label><Input type="email" className="h-9 text-sm rounded-lg" value={clientForm.email} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} placeholder="email@company.com" /></div>
                <div><Label className="text-xs">Phone *</Label><Input className="h-9 text-sm rounded-lg" value={clientForm.phone} onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} placeholder="+92-300-1234567" /></div>
                <div><Label className="text-xs">Address</Label><Input className="h-9 text-sm rounded-lg" value={clientForm.address} onChange={e => setClientForm(f => ({ ...f, address: e.target.value }))} /></div>
                <div><Label className="text-xs">City</Label><Input className="h-9 text-sm rounded-lg" value={clientForm.city} onChange={e => setClientForm(f => ({ ...f, city: e.target.value }))} /></div>
                <div><Label className="text-xs">State</Label><Input className="h-9 text-sm rounded-lg" value={clientForm.state} onChange={e => setClientForm(f => ({ ...f, state: e.target.value }))} /></div>
                <div><Label className="text-xs">Country</Label><Input className="h-9 text-sm rounded-lg" value={clientForm.country} onChange={e => setClientForm(f => ({ ...f, country: e.target.value }))} /></div>
                <div><Label className="text-xs">Postal Code</Label><Input className="h-9 text-sm rounded-lg" value={clientForm.postalCode} onChange={e => setClientForm(f => ({ ...f, postalCode: e.target.value }))} /></div>
              </div>
            </div>

            <Separator />

            {/* Purchase & Billing */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><CreditCard className="size-3.5" /> Purchase & Billing</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Purchase Type</Label>
                  <div className="flex gap-2 mt-1">
                    <Button size="sm" variant={clientForm.purchaseType === 'subscription' ? 'default' : 'outline'} className={cn('flex-1 text-xs rounded-lg', clientForm.purchaseType === 'subscription' && 'bg-tahoe-accent text-white')} onClick={() => setClientForm(f => ({ ...f, purchaseType: 'subscription' }))}>
                      <RefreshCw className="size-3 mr-1" /> Subscription
                    </Button>
                    <Button size="sm" variant={clientForm.purchaseType === 'one_time' ? 'default' : 'outline'} className={cn('flex-1 text-xs rounded-lg', clientForm.purchaseType === 'one_time' && 'bg-tahoe-accent text-white')} onClick={() => setClientForm(f => ({ ...f, purchaseType: 'one_time' }))}>
                      <Package className="size-3 mr-1" /> One-Time
                    </Button>
                  </div>
                </div>
                <div><Label className="text-xs">Plan</Label>
                  <Select value={clientForm.planName} onValueChange={v => setClientForm(f => ({ ...f, planName: v }))}>
                    <SelectTrigger className="h-9 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Starter">Starter</SelectItem><SelectItem value="Professional">Professional</SelectItem><SelectItem value="Enterprise">Enterprise</SelectItem></SelectContent>
                  </Select>
                </div>
                {clientForm.purchaseType === 'subscription' && (
                  <div><Label className="text-xs">Billing Cycle</Label>
                    <Select value={clientForm.billingCycle} onValueChange={v => setClientForm(f => ({ ...f, billingCycle: v }))}>
                      <SelectTrigger className="h-9 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="semi_annual">Semi-Annual</SelectItem><SelectItem value="annual">Annual</SelectItem></SelectContent>
                    </Select>
                  </div>
                )}
                <div><Label className="text-xs">Currency</Label>
                  <Select value={clientForm.currency} onValueChange={v => setClientForm(f => ({ ...f, currency: v }))}>
                    <SelectTrigger className="h-9 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="PKR">PKR</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Module Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Layers className="size-3.5" /> Module Selection</h4>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg" onClick={() => setClientForm(f => ({ ...f, selectedModules: MODULE_CATALOG.map(m => m.key) }))}>Select All</Button>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg" onClick={() => setClientForm(f => ({ ...f, selectedModules: [] }))}>Deselect All</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {MODULE_CATALOG.map(mod => {
                  const selected = clientForm.selectedModules.includes(mod.key)
                  return (
                    <motion.button
                      key={mod.key}
                      type="button"
                      onClick={() => setClientForm(f => ({
                        ...f,
                        selectedModules: selected ? f.selectedModules.filter(k => k !== mod.key) : [...f.selectedModules, mod.key]
                      }))}
                      className={cn(
                        'flex items-center gap-2 p-2.5 rounded-xl border text-xs transition-all text-left',
                        selected
                          ? 'border-rose-500/50 bg-rose-500/5 text-foreground shadow-sm'
                          : 'border-border/50 bg-foreground/[0.01] text-muted-foreground hover:border-border'
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-base">{mod.icon}</span>
                      <span className="font-medium truncate">{mod.name}</span>
                      {selected && <Check className="size-3 text-rose-500 ml-auto shrink-0" />}
                    </motion.button>
                  )
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">{clientForm.selectedModules.length} of {MODULE_CATALOG.length} modules selected</p>
            </div>

            <Separator />

            {/* Admin User */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><Users className="size-3.5" /> Admin User</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><Label className="text-xs">Admin Name</Label><Input className="h-9 text-sm rounded-lg" value={clientForm.adminName} onChange={e => setClientForm(f => ({ ...f, adminName: e.target.value }))} placeholder="Admin full name" /></div>
                <div><Label className="text-xs">Admin Email</Label><Input type="email" className="h-9 text-sm rounded-lg" value={clientForm.adminEmail} onChange={e => setClientForm(f => ({ ...f, adminEmail: e.target.value }))} placeholder="admin@company.com" /></div>
                <div><Label className="text-xs">Admin Phone</Label><Input className="h-9 text-sm rounded-lg" value={clientForm.adminPhone} onChange={e => setClientForm(f => ({ ...f, adminPhone: e.target.value }))} placeholder="+92-..." /></div>
              </div>
            </div>

            <Separator />

            {/* Serial Key */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><Key className="size-3.5" /> Serial Key</h4>
              <div className="flex items-center gap-3 mb-3">
                <Switch checked={clientForm.autoSerialKey} onCheckedChange={v => setClientForm(f => ({ ...f, autoSerialKey: v }))} />
                <Label className="text-xs">Auto-generate serial key</Label>
              </div>
              {clientForm.autoSerialKey && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label className="text-xs">Key Type</Label>
                    <Select value={clientForm.serialKeyType} onValueChange={v => setClientForm(f => ({ ...f, serialKeyType: v }))}>
                      <SelectTrigger className="h-9 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="subscription">Subscription</SelectItem><SelectItem value="one_time">One-Time</SelectItem><SelectItem value="trial">Trial</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowClientForm(false)}>Cancel</Button>
            <Button className="rounded-xl gap-1.5" onClick={handleCreateClient} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Create Client & Provision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Client Detail Dialog ───────────────────────────────────────── */}
      <Dialog open={showClientDetail} onOpenChange={setShowClientDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 text-white text-sm font-bold">{selectedClient?.companyName?.charAt(0)}</div>
              {selectedClient?.companyName}
            </DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={selectedClient.status} />
                <Badge variant="outline" className="text-[10px]">{selectedClient.purchaseType}</Badge>
                <Badge variant="outline" className="text-[10px]">{selectedClient.planName || 'No Plan'}</Badge>
                <StatusBadge status={selectedClient.tenantDbStatus} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-[10px] text-muted-foreground uppercase">Contact Person</p><p className="text-sm font-medium">{selectedClient.contactPerson}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Email</p><p className="text-sm">{selectedClient.email}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Phone</p><p className="text-sm">{selectedClient.phone}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Industry</p><p className="text-sm">{selectedClient.industry}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">City</p><p className="text-sm">{selectedClient.city || '-'}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Onboarded</p><p className="text-sm">{formatDate(selectedClient.onboardedAt)}</p></div>
              </div>

              <Separator />

              {/* Modules */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Active Modules ({selectedClient.modules?.length || 0})</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedClient.modules?.map(m => (
                    <Badge key={m.id} variant="outline" className="text-[10px]">{m.moduleName}</Badge>
                  ))}
                  {(!selectedClient.modules || selectedClient.modules.length === 0) && <p className="text-xs text-muted-foreground">No modules assigned</p>}
                </div>
              </div>

              {/* Serial Keys */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Serial Keys</p>
                {selectedClient.serialKeys?.map(sk => (
                  <div key={sk.id} className="flex items-center gap-2 p-2 rounded-lg bg-foreground/[0.02] mb-1">
                    <Key className="size-3.5 text-muted-foreground" />
                    <span className="text-xs font-mono font-semibold">{sk.key}</span>
                    <StatusBadge status={sk.status} />
                  </div>
                ))}
                {(!selectedClient.serialKeys || selectedClient.serialKeys.length === 0) && <p className="text-xs text-muted-foreground">No serial keys</p>}
              </div>

              {/* Users */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Users</p>
                {selectedClient.users?.map(u => (
                  <div key={u.id} className="flex items-center gap-2 p-2 rounded-lg bg-foreground/[0.02] mb-1">
                    <Users className="size-3.5 text-muted-foreground" />
                    <span className="text-xs">{u.name} ({u.email})</span>
                    <Badge variant="outline" className="text-[9px]">{u.role}</Badge>
                  </div>
                ))}
              </div>

              {selectedClient.tenantDbPath && (
                <div className="p-3 rounded-xl bg-foreground/[0.02]">
                  <p className="text-[10px] text-muted-foreground uppercase">Tenant Database</p>
                  <p className="text-xs font-mono">{selectedClient.tenantDbPath}</p>
                  <StatusBadge status={selectedClient.tenantDbStatus} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Generate Keys Dialog ───────────────────────────────────────── */}
      <Dialog open={showKeyGen} onOpenChange={setShowKeyGen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Key className="size-5 text-rose-500" /> Generate Serial Keys</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Number of Keys</Label><Input type="number" min={1} max={50} className="h-9 text-sm rounded-lg" value={keyGenForm.count} onChange={e => setKeyGenForm(f => ({ ...f, count: parseInt(e.target.value) || 1 }))} /></div>
            <div><Label className="text-xs">Key Type</Label>
              <Select value={keyGenForm.type} onValueChange={v => setKeyGenForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="h-9 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="subscription">Subscription</SelectItem><SelectItem value="one_time">One-Time</SelectItem><SelectItem value="trial">Trial</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Assign to Client (optional)</Label>
              <Select value={keyGenForm.clientId} onValueChange={v => setKeyGenForm(f => ({ ...f, clientId: v }))}>
                <SelectTrigger className="h-9 text-sm rounded-lg"><SelectValue placeholder="Select client..." /></SelectTrigger>
                <SelectContent><SelectItem value="none">No assignment</SelectItem>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowKeyGen(false)}>Cancel</Button>
            <Button className="rounded-xl gap-1.5" onClick={handleGenerateKeys} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Key className="size-4" />} Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Create Invoice Dialog ──────────────────────────────────────── */}
      <Dialog open={showInvoiceForm} onOpenChange={setShowInvoiceForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="size-5 text-rose-500" /> Create Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label className="text-xs">Client *</Label>
              <Select value={invoiceForm.clientId} onValueChange={v => setInvoiceForm(f => ({ ...f, clientId: v }))}>
                <SelectTrigger className="h-9 text-sm rounded-lg"><SelectValue placeholder="Select client..." /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <Separator />
            <div className="flex items-center justify-between"><Label className="text-xs font-bold uppercase">Line Items</Label><Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg" onClick={addInvoiceItem}><Plus className="size-3 mr-1" /> Add Item</Button></div>

            {invoiceForm.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-2"><Label className="text-[10px]">Type</Label>
                  <Select value={item.itemType} onValueChange={v => updateInvoiceItem(idx, 'itemType', v)}>
                    <SelectTrigger className="h-8 text-[10px] rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="subscription">Subscription</SelectItem><SelectItem value="module">Module</SelectItem><SelectItem value="setup_fee">Setup Fee</SelectItem><SelectItem value="customization">Customization</SelectItem><SelectItem value="support">Support</SelectItem><SelectItem value="training">Training</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="col-span-3"><Label className="text-[10px]">Description</Label><Input className="h-8 text-[10px] rounded-lg" value={item.description} onChange={e => updateInvoiceItem(idx, 'description', e.target.value)} /></div>
                <div className="col-span-1"><Label className="text-[10px]">Qty</Label><Input type="number" className="h-8 text-[10px] rounded-lg" value={item.quantity} onChange={e => updateInvoiceItem(idx, 'quantity', parseInt(e.target.value) || 0)} /></div>
                <div className="col-span-2"><Label className="text-[10px]">Unit Price</Label><Input type="number" className="h-8 text-[10px] rounded-lg" value={item.unitPrice} onChange={e => updateInvoiceItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} /></div>
                <div className="col-span-2"><Label className="text-[10px]">Discount</Label><Input type="number" className="h-8 text-[10px] rounded-lg" value={item.discount} onChange={e => updateInvoiceItem(idx, 'discount', parseFloat(e.target.value) || 0)} /></div>
                <div className="col-span-1"><Label className="text-[10px]">Total</Label><p className="text-[10px] font-bold h-8 flex items-center">{formatPKR(item.total)}</p></div>
                <div className="col-span-1"><Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => removeInvoiceItem(idx)}><X className="size-3" /></Button></div>
              </div>
            ))}

            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Tax Rate (%)</Label><Input type="number" className="h-9 text-sm rounded-lg" value={invoiceForm.taxRate} onChange={e => setInvoiceForm(f => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))} /></div>
              <div><Label className="text-xs">Discount Rate (%)</Label><Input type="number" className="h-9 text-sm rounded-lg" value={invoiceForm.discountRate} onChange={e => setInvoiceForm(f => ({ ...f, discountRate: parseFloat(e.target.value) || 0 }))} /></div>
              <div className="col-span-2"><Label className="text-xs">Notes</Label><Textarea className="text-sm rounded-lg" rows={2} value={invoiceForm.notes} onChange={e => setInvoiceForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <div className="col-span-2"><Label className="text-xs">Terms & Conditions</Label><Textarea className="text-sm rounded-lg" rows={2} value={invoiceForm.terms} onChange={e => setInvoiceForm(f => ({ ...f, terms: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <div className="text-sm font-bold mr-auto">Total: {formatPKR(invoiceForm.items.reduce((s, i) => s + i.total, 0))}</div>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowInvoiceForm(false)}>Cancel</Button>
            <Button className="rounded-xl gap-1.5" onClick={handleCreateInvoice} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Invoice Detail Dialog ──────────────────────────────────────── */}
      <Dialog open={showInvoiceDetail} onOpenChange={setShowInvoiceDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><FileText className="size-5 text-rose-500" /> {selectedInvoice?.invoiceNumber}</span>
              <StatusBadge status={selectedInvoice?.paymentStatus || ''} />
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[10px] text-muted-foreground uppercase">Client</p><p className="text-sm font-semibold">{(selectedInvoice.client as any)?.companyName}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Issue Date</p><p className="text-sm">{formatDate(selectedInvoice.issueDate)}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Due Date</p><p className="text-sm">{formatDate(selectedInvoice.dueDate)}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Currency</p><p className="text-sm">{selectedInvoice.currency}</p></div>
              </div>

              <Separator />

              {/* Items Table */}
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-foreground/[0.02]"><th className="p-2 text-left">#</th><th className="p-2 text-left">Description</th><th className="p-2 text-center">Qty</th><th className="p-2 text-right">Unit Price</th><th className="p-2 text-right">Total</th></tr></thead>
                  <tbody>
                    {(selectedInvoice.items || []).map((item, i) => (
                      <tr key={item.id} className="border-t"><td className="p-2">{i + 1}</td><td className="p-2">{item.description}</td><td className="p-2 text-center">{item.quantity}</td><td className="p-2 text-right">{formatPKR(item.unitPrice)}</td><td className="p-2 text-right font-semibold">{formatPKR(item.total)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-xs">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatPKR(selectedInvoice.subtotal)}</span></div>
                  {selectedInvoice.taxAmount > 0 && <div className="flex justify-between"><span>Tax ({selectedInvoice.taxRate}%)</span><span>{formatPKR(selectedInvoice.taxAmount)}</span></div>}
                  {selectedInvoice.discountAmount > 0 && <div className="flex justify-between"><span>Discount ({selectedInvoice.discountRate}%)</span><span>-{formatPKR(selectedInvoice.discountAmount)}</span></div>}
                  <Separator />
                  <div className="flex justify-between text-base font-bold"><span>Grand Total</span><span className="text-rose-600">{formatPKR(selectedInvoice.totalAmount)}</span></div>
                </div>
              </div>

              {selectedInvoice.paymentStatus !== 'paid' && (
                <div className="flex gap-2">
                  <Button className="gap-1.5 text-xs rounded-xl flex-1" onClick={() => handleUpdateInvoiceStatus(selectedInvoice.id, { paymentStatus: 'paid', paidAmount: selectedInvoice.totalAmount, paidAt: new Date().toISOString(), paymentMethod: 'bank_transfer' })}>
                    <Check className="size-3.5" /> Mark as Paid
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="gap-1.5 text-xs rounded-xl" onClick={printInvoice}><Printer className="size-3.5" /> Print Invoice</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Create Quotation Dialog ────────────────────────────────────── */}
      <Dialog open={showQuoteForm} onOpenChange={setShowQuoteForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="size-5 text-purple-500" /> Create Quotation</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Client *</Label>
                <Select value={quoteForm.clientId} onValueChange={v => setQuoteForm(f => ({ ...f, clientId: v }))}>
                  <SelectTrigger className="h-9 text-sm rounded-lg"><SelectValue placeholder="Select client..." /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Subject</Label><Input className="h-9 text-sm rounded-lg" value={quoteForm.subject} onChange={e => setQuoteForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. SalonFlow Enterprise Package" /></div>
              <div><Label className="text-xs">Valid Until *</Label><Input type="date" className="h-9 text-sm rounded-lg" value={quoteForm.validUntil} onChange={e => setQuoteForm(f => ({ ...f, validUntil: e.target.value }))} /></div>
            </div>

            <Separator />
            <div className="flex items-center justify-between"><Label className="text-xs font-bold uppercase">Line Items</Label><Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg" onClick={addQuoteItem}><Plus className="size-3 mr-1" /> Add Item</Button></div>

            {quoteForm.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-2"><Label className="text-[10px]">Type</Label>
                  <Select value={item.itemType} onValueChange={v => updateQuoteItem(idx, 'itemType', v)}>
                    <SelectTrigger className="h-8 text-[10px] rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="subscription">Subscription</SelectItem><SelectItem value="module">Module</SelectItem><SelectItem value="setup_fee">Setup Fee</SelectItem><SelectItem value="customization">Customization</SelectItem><SelectItem value="support">Support</SelectItem><SelectItem value="training">Training</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="col-span-3"><Label className="text-[10px]">Description</Label><Input className="h-8 text-[10px] rounded-lg" value={item.description} onChange={e => updateQuoteItem(idx, 'description', e.target.value)} /></div>
                <div className="col-span-1"><Label className="text-[10px]">Qty</Label><Input type="number" className="h-8 text-[10px] rounded-lg" value={item.quantity} onChange={e => updateQuoteItem(idx, 'quantity', parseInt(e.target.value) || 0)} /></div>
                <div className="col-span-2"><Label className="text-[10px]">Price</Label><Input type="number" className="h-8 text-[10px] rounded-lg" value={item.unitPrice} onChange={e => updateQuoteItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} /></div>
                <div className="col-span-2"><Label className="text-[10px]">Disc.</Label><Input type="number" className="h-8 text-[10px] rounded-lg" value={item.discount} onChange={e => updateQuoteItem(idx, 'discount', parseFloat(e.target.value) || 0)} /></div>
                <div className="col-span-1"><Label className="text-[10px]">Total</Label><p className="text-[10px] font-bold h-8 flex items-center">{formatPKR(item.total)}</p></div>
                <div className="col-span-1"><Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => removeQuoteItem(idx)}><X className="size-3" /></Button></div>
              </div>
            ))}

            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Tax Rate (%)</Label><Input type="number" className="h-9 text-sm rounded-lg" value={quoteForm.taxRate} onChange={e => setQuoteForm(f => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))} /></div>
              <div><Label className="text-xs">Discount Rate (%)</Label><Input type="number" className="h-9 text-sm rounded-lg" value={quoteForm.discountRate} onChange={e => setQuoteForm(f => ({ ...f, discountRate: parseFloat(e.target.value) || 0 }))} /></div>
              <div className="col-span-2"><Label className="text-xs">Terms & Conditions</Label><Textarea className="text-sm rounded-lg" rows={2} value={quoteForm.terms} onChange={e => setQuoteForm(f => ({ ...f, terms: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <div className="text-sm font-bold mr-auto">Total: {formatPKR(quoteForm.items.reduce((s, i) => s + i.total, 0))}</div>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowQuoteForm(false)}>Cancel</Button>
            <Button className="rounded-xl gap-1.5" onClick={handleCreateQuotation} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />} Create Quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Quotation Detail Dialog ────────────────────────────────────── */}
      <Dialog open={showQuoteDetail} onOpenChange={setShowQuoteDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><FileSpreadsheet className="size-5 text-purple-500" /> {selectedQuote?.quotationNumber}</span>
              <StatusBadge status={selectedQuote?.status || ''} />
            </DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[10px] text-muted-foreground uppercase">Client</p><p className="text-sm font-semibold">{(selectedQuote.client as any)?.companyName}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Subject</p><p className="text-sm">{selectedQuote.subject || '-'}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Issue Date</p><p className="text-sm">{formatDate(selectedQuote.issueDate)}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Valid Until</p><p className="text-sm font-semibold">{formatDate(selectedQuote.validUntil)}</p></div>
              </div>

              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-foreground/[0.02]"><th className="p-2 text-left">#</th><th className="p-2 text-left">Description</th><th className="p-2 text-center">Qty</th><th className="p-2 text-right">Unit Price</th><th className="p-2 text-right">Total</th></tr></thead>
                  <tbody>
                    {(selectedQuote.items || []).map((item, i) => (
                      <tr key={item.id} className="border-t"><td className="p-2">{i + 1}</td><td className="p-2">{item.description}</td><td className="p-2 text-center">{item.quantity}</td><td className="p-2 text-right">{formatPKR(item.unitPrice)}</td><td className="p-2 text-right font-semibold">{formatPKR(item.total)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-xs">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatPKR(selectedQuote.subtotal)}</span></div>
                  {selectedQuote.taxAmount > 0 && <div className="flex justify-between"><span>Tax</span><span>{formatPKR(selectedQuote.taxAmount)}</span></div>}
                  {selectedQuote.discountAmount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatPKR(selectedQuote.discountAmount)}</span></div>}
                  <Separator />
                  <div className="flex justify-between text-base font-bold"><span>Grand Total</span><span className="text-purple-600">{formatPKR(selectedQuote.totalAmount)}</span></div>
                </div>
              </div>

              <div className="flex gap-2">
                {selectedQuote.status !== 'converted' && (
                  <Button className="gap-1.5 text-xs rounded-xl" onClick={() => handleConvertQuotation(selectedQuote.id)}>
                    <ArrowRight className="size-3.5" /> Convert to Invoice
                  </Button>
                )}
                <Button variant="outline" className="gap-1.5 text-xs rounded-xl" onClick={printQuotation}><Printer className="size-3.5" /> Print</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Create Subscription Dialog ─────────────────────────────────── */}
      <Dialog open={showSubForm} onOpenChange={setShowSubForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CreditCard className="size-5 text-rose-500" /> New Subscription</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Client *</Label>
              <Select value={subForm.clientId} onValueChange={v => setSubForm(f => ({ ...f, clientId: v }))}>
                <SelectTrigger className="h-9 text-sm rounded-lg"><SelectValue placeholder="Select client..." /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Plan Name</Label><Input className="h-9 text-sm rounded-lg" value={subForm.planName} onChange={e => setSubForm(f => ({ ...f, planName: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Price</Label><Input type="number" className="h-9 text-sm rounded-lg" value={subForm.price} onChange={e => setSubForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} /></div>
              <div><Label className="text-xs">Billing Cycle</Label>
                <Select value={subForm.billingCycle} onValueChange={v => setSubForm(f => ({ ...f, billingCycle: v }))}>
                  <SelectTrigger className="h-9 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="semi_annual">Semi-Annual</SelectItem><SelectItem value="annual">Annual</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Start Date</Label><Input type="date" className="h-9 text-sm rounded-lg" value={subForm.startDate} onChange={e => setSubForm(f => ({ ...f, startDate: e.target.value }))} /></div>
              <div><Label className="text-xs">End Date</Label><Input type="date" className="h-9 text-sm rounded-lg" value={subForm.endDate} onChange={e => setSubForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={subForm.autoRenew} onCheckedChange={v => setSubForm(f => ({ ...f, autoRenew: v }))} /><Label className="text-xs">Auto-renew</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowSubForm(false)}>Cancel</Button>
            <Button className="rounded-xl gap-1.5" onClick={handleCreateSubscription} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Create User Dialog ─────────────────────────────────────────── */}
      <Dialog open={showUserForm} onOpenChange={setShowUserForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="size-5 text-rose-500" /> Add Client User</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Client *</Label>
              <Select value={userForm.clientId} onValueChange={v => setUserForm(f => ({ ...f, clientId: v }))}>
                <SelectTrigger className="h-9 text-sm rounded-lg"><SelectValue placeholder="Select client..." /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Full Name *</Label><Input className="h-9 text-sm rounded-lg" value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label className="text-xs">Email *</Label><Input type="email" className="h-9 text-sm rounded-lg" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label className="text-xs">Phone</Label><Input className="h-9 text-sm rounded-lg" value={userForm.phone} onChange={e => setUserForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label className="text-xs">Role</Label>
              <Select value={userForm.role} onValueChange={v => setUserForm(f => ({ ...f, role: v }))}>
                <SelectTrigger className="h-9 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="manager">Manager</SelectItem><SelectItem value="viewer">Viewer</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowUserForm(false)}>Cancel</Button>
            <Button className="rounded-xl gap-1.5" onClick={handleCreateUser} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />} Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Reports Sub-Component ────────────────────────────────────────────────
function OwnerReports({ clients, invoices, subscriptions, serialKeys }: {
  clients: OwnerClientType[]
  invoices: InvoiceType[]
  subscriptions: SubscriptionType[]
  serialKeys: SerialKeyType[]
}) {
  const [reportType, setReportType] = useState('revenue')
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/owner/reports?type=${reportType}`)
        const data = await res.json()
        if (data.success) setReportData(data.data)
      } catch { toast.error('Failed to load report') }
      finally { setLoading(false) }
    }
    load()
  }, [reportType])

  const printReport = () => {
    const w = window.open('', '_blank')
    if (!w) return
    const title = reportType.charAt(0).toUpperCase() + reportType.slice(1)
    const now = new Date().toLocaleString('en-PK')
    w.document.write(`<!DOCTYPE html><html><head><title>${title} Report - SalonFlow OS</title>
    <style>
      @page { size: A4; margin: 15mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1a1a2e; line-height: 1.5; font-size: 12px; }
      .header { border-bottom: 3px solid #e11d48; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; }
      .header h1 { font-size: 20px; color: #e11d48; }
      .header p { font-size: 10px; color: #666; }
      .meta { text-align: right; }
      .meta h2 { font-size: 16px; font-weight: 300; letter-spacing: 1px; color: #333; }
      table { width: 100%; border-collapse: collapse; margin: 15px 0; }
      th { background: #f8f8fa; padding: 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #666; text-align: left; border-bottom: 2px solid #e11d48; }
      td { padding: 8px; border-bottom: 1px solid #eee; }
      .footer { position: fixed; bottom: 15mm; left: 15mm; right: 15mm; border-top: 1px solid #ddd; padding-top: 10px; display: flex; justify-content: space-between; }
      .footer p { font-size: 9px; color: #999; }
      .summary-box { background: #f8f8fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
      .summary-item p.label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #999; }
      .summary-item p.value { font-size: 18px; font-weight: 700; color: #e11d48; }
    </style></head><body>
    <div class="header">
      <div><h1>SalonFlow OS</h1><p>Enterprise Resource Planning</p><p>ApexFlow Ecosystem</p></div>
      <div class="meta"><h2>${title} Report</h2><p>Generated: ${now}</p><p>Confidential</p></div>
    </div>
    ${reportData?.summary ? `<div class="summary-box">${Object.entries(reportData.summary).map(([k, v]: any) => `<div class="summary-item"><p class="label">${k.replace(/([A-Z])/g, ' $1').trim()}</p><p class="value">${typeof v === 'number' && v > 100 ? formatPKR(v) : String(v)}</p></div>`).join('')}</div>` : ''}
    ${reportData?.data ? `<table><thead><tr>${Object.keys(reportData.data[0] || {}).map(k => `<th>${k.replace(/([A-Z])/g, ' $1').trim()}</th>`).join('')}</tr></thead><tbody>${(reportData.data || []).map((row: any) => `<tr>${Object.values(row).map((v: any) => `<td>${typeof v === 'number' && v > 100 ? formatPKR(v) : String(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p>No data available</p>'}
    <div class="footer"><p>SalonFlow OS - Confidential</p><p>Page 1</p><p>Generated: ${now}</p></div>
    </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="h-9 w-48 text-xs rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Revenue Report</SelectItem>
              <SelectItem value="clients">Client Report</SelectItem>
              <SelectItem value="subscriptions">Subscription Report</SelectItem>
              <SelectItem value="serial_keys">Serial Key Report</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="gap-1.5 text-xs rounded-xl" onClick={printReport}>
          <Printer className="size-3.5" /> Print Report
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>
      ) : (
        <GlassCard className="p-5">
          {reportData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {Object.entries(reportData.summary).map(([k, v]: any) => (
                <div key={k} className="p-3 rounded-xl bg-foreground/[0.02]">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.replace(/([A-Z])/g, ' $1').trim()}</p>
                  <p className="text-lg font-bold mt-1">{typeof v === 'number' && v > 100 ? formatPKR(v) : String(v)}</p>
                </div>
              ))}
            </div>
          )}

          {reportData?.data && reportData.data.length > 0 ? (
            <div className="rounded-xl border overflow-hidden">
              <ScrollArea className="max-h-96">
                <table className="w-full text-xs">
                  <thead><tr className="bg-foreground/[0.02]">{Object.keys(reportData.data[0]).map(k => <th key={k} className="p-3 text-left font-semibold uppercase tracking-wider">{k.replace(/([A-Z])/g, ' $1').trim()}</th>)}</tr></thead>
                  <tbody>
                    {reportData.data.map((row: any, i: number) => (
                      <tr key={i} className="border-t hover:bg-foreground/[0.01]">
                        {Object.values(row).map((v: any, j: number) => <td key={j} className="p-3">{typeof v === 'number' && v > 100 ? formatPKR(v) : String(v)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No data available for this report</p>
          )}
        </GlassCard>
      )}
    </div>
  )
}
