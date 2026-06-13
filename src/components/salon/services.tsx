'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Scissors,
  Sparkles,
  Palette,
  Hand,
  Flower2,
  User,
  Heart,
  Leaf,
  Plus,
  Pencil,
  ChevronDown,
  ChevronUp,
  Clock,
  Search,
  Loader2,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Percent,
  Info,
} from 'lucide-react'

// ---- Types ----
interface ServiceAddon {
  id: string
  name: string
  price: number
  duration: number
  isActive: boolean
}

interface Service {
  id: string
  categoryId: string
  name: string
  description: string | null
  duration: number
  price: number
  taxRate: number
  taxType: string
  isActive: boolean
  isPackage: boolean
  requirements: string | null
  afterCare: string | null
  createdAt: string
  updatedAt: string
  serviceAddons: ServiceAddon[]
}

interface ServiceCategory {
  id: string
  name: string
  description: string | null
  icon: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  services: Service[]
  serviceCount: number
}

const formatCurrency = (amount: number) => `PKR ${amount.toLocaleString()}`

const categoryIconMap: Record<string, React.ReactNode> = {
  scissors: <Scissors className="size-5" />,
  sparkles: <Sparkles className="size-5" />,
  palette: <Palette className="size-5" />,
  hand: <Hand className="size-5" />,
  flower: <Flower2 className="size-5" />,
  user: <User className="size-5" />,
  heart: <Heart className="size-5" />,
  leaf: <Leaf className="size-5" />,
}

const categoryColorMap: Record<string, string> = {
  scissors: 'bg-rose-50 text-rose-600 border-rose-200',
  sparkles: 'bg-amber-50 text-amber-600 border-amber-200',
  palette: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200',
  hand: 'bg-violet-50 text-violet-600 border-violet-200',
  flower: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  user: 'bg-sky-50 text-sky-600 border-sky-200',
  heart: 'bg-pink-50 text-pink-600 border-pink-200',
  leaf: 'bg-lime-50 text-lime-600 border-lime-200',
}

const taxBadge = (service: Service) => {
  const taxType = service.taxType || 'none'
  const taxRate = service.taxRate || 0

  if (taxType === 'none' || taxRate === 0) {
    return <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-100 text-xs">No Tax</Badge>
  }
  if (taxType === 'included') {
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">{taxRate}% Incl.</Badge>
  }
  if (taxType === 'excluded') {
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">{taxRate}% Excl.</Badge>
  }
  return <Badge variant="secondary" className="text-xs">No Tax</Badge>
}

const initialFormState = {
  name: '',
  categoryId: '',
  description: '',
  duration: '',
  price: '',
  taxRate: '',
  taxType: 'none',
}

export function ServicesModule() {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(initialFormState)

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/services?includeInactive=true')
      const json = await res.json()
      if (json.success) {
        setCategories(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch services:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const handleAddService = async () => {
    if (!form.name || !form.categoryId || !form.duration || !form.price) return
    try {
      setSaving(true)
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          categoryId: form.categoryId,
          description: form.description || null,
          duration: parseInt(form.duration),
          price: parseFloat(form.price),
          taxRate: parseFloat(form.taxRate) || 0,
          taxType: form.taxType,
          isActive: true,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setDialogOpen(false)
        setForm(initialFormState)
        fetchServices()
      }
    } catch (err) {
      console.error('Failed to add service:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (service: Service) => {
    try {
      const res = await fetch('/api/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: service.id,
          isActive: !service.isActive,
        }),
      })
      const json = await res.json()
      if (json.success) {
        fetchServices()
      }
    } catch (err) {
      console.error('Failed to toggle service:', err)
    }
  }

  const handleEditService = async () => {
    if (!editingService || !form.name || !form.duration || !form.price) return
    try {
      setSaving(true)
      const res = await fetch('/api/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingService.id,
          name: form.name,
          categoryId: form.categoryId || editingService.categoryId,
          description: form.description || null,
          duration: parseInt(form.duration),
          price: parseFloat(form.price),
          taxRate: parseFloat(form.taxRate) || 0,
          taxType: form.taxType,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setEditDialogOpen(false)
        setEditingService(null)
        setForm(initialFormState)
        fetchServices()
      }
    } catch (err) {
      console.error('Failed to edit service:', err)
    } finally {
      setSaving(false)
    }
  }

  const openEditDialog = (service: Service) => {
    setEditingService(service)
    setForm({
      name: service.name,
      categoryId: service.categoryId,
      description: service.description || '',
      duration: String(service.duration),
      price: String(service.price),
      taxRate: String(service.taxRate || ''),
      taxType: service.taxType || 'none',
    })
    setEditDialogOpen(true)
  }

  // Filter services by search
  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      services: cat.services.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    }))
    .filter((cat) => cat.services.length > 0 || !searchQuery)

  // All services flat
  const allServices = categories.flatMap((c) => c.services)
  const filteredAllServices = allServices.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const totalServices = allServices.length
  const activeServices = allServices.filter((s) => s.isActive).length
  const inactiveServices = allServices.filter((s) => !s.isActive).length

  const taxHelperText: Record<string, string> = {
    none: 'No tax will be applied to this service',
    included: 'Tax is already included in the service price. The price shown includes tax.',
    excluded: 'Tax will be added on top of the service price. The price shown is before tax.',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Services & Treatments</h2>
          <p className="text-muted-foreground text-sm">
            {totalServices} services across {categories.length} categories • {activeServices} active •{' '}
            {inactiveServices} inactive
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Add Service
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium">Total Services</p>
            <p className="text-2xl font-bold">{totalServices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium">Active</p>
            <p className="text-2xl font-bold text-emerald-600">{activeServices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium">Inactive</p>
            <p className="text-2xl font-bold text-amber-600">{inactiveServices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium">Categories</p>
            <p className="text-2xl font-bold text-violet-600">{categories.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="category">
        <TabsList>
          <TabsTrigger value="category">By Category</TabsTrigger>
          <TabsTrigger value="all">All Services</TabsTrigger>
        </TabsList>

        {/* Category View */}
        <TabsContent value="category" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground size-8 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCategories.map((category) => {
                const isExpanded = expandedCategories.has(category.id)
                const iconKey = category.icon || 'scissors'
                return (
                  <Card
                    key={category.id}
                    className={`transition-all ${
                      isExpanded ? 'sm:col-span-2 lg:col-span-3 xl:col-span-4' : ''
                    }`}
                  >
                    <CardHeader
                      className="cursor-pointer select-none p-4"
                      onClick={() => toggleCategory(category.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex size-10 items-center justify-center rounded-lg border ${
                              categoryColorMap[iconKey] || 'bg-gray-50 text-gray-600 border-gray-200'
                            }`}
                          >
                            {categoryIconMap[iconKey] || <Scissors className="size-5" />}
                          </div>
                          <div>
                            <CardTitle className="text-base">{category.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {category.description}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {category.services.length} service{category.services.length !== 1 ? 's' : ''}
                          </Badge>
                          {isExpanded ? (
                            <ChevronUp className="text-muted-foreground size-4" />
                          ) : (
                            <ChevronDown className="text-muted-foreground size-4" />
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="px-4 pb-4">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-left">
                                <th className="pb-2 pr-4 font-medium text-muted-foreground">Service</th>
                                <th className="pb-2 pr-4 font-medium text-muted-foreground">Duration</th>
                                <th className="pb-2 pr-4 font-medium text-muted-foreground">Price</th>
                                <th className="pb-2 pr-4 font-medium text-muted-foreground">Tax</th>
                                <th className="pb-2 pr-4 font-medium text-muted-foreground">Status</th>
                                <th className="pb-2 font-medium text-muted-foreground">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {category.services.map((service) => (
                                <tr key={service.id} className="border-b last:border-0">
                                  <td className="py-3 pr-4">
                                    <div>
                                      <p className="font-medium">{service.name}</p>
                                      {service.description && (
                                        <p className="text-muted-foreground max-w-xs truncate text-xs">
                                          {service.description}
                                        </p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 pr-4">
                                    <div className="flex items-center gap-1">
                                      <Clock className="text-muted-foreground size-3" />
                                      {service.duration} min
                                    </div>
                                  </td>
                                  <td className="py-3 pr-4 font-medium">
                                    {formatCurrency(service.price)}
                                  </td>
                                  <td className="py-3 pr-4">
                                    {taxBadge(service)}
                                  </td>
                                  <td className="py-3 pr-4">
                                    <Badge
                                      variant={service.isActive ? 'default' : 'secondary'}
                                      className={
                                        service.isActive
                                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                          : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                      }
                                    >
                                      {service.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </td>
                                  <td className="py-3">
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => openEditDialog(service)}
                                      >
                                        <Pencil className="size-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-1 px-2"
                                        onClick={() => handleToggleActive(service)}
                                      >
                                        {service.isActive ? (
                                          <>
                                            <ToggleRight className="size-4 text-emerald-600" />
                                            <span className="text-xs text-emerald-600">On</span>
                                          </>
                                        ) : (
                                          <>
                                            <ToggleLeft className="size-4 text-amber-600" />
                                            <span className="text-xs text-amber-600">Off</span>
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* All Services View */}
        <TabsContent value="all">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground size-8 animate-spin" />
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="p-4 font-medium text-muted-foreground">Service</th>
                        <th className="p-4 font-medium text-muted-foreground">Category</th>
                        <th className="p-4 font-medium text-muted-foreground">Duration</th>
                        <th className="p-4 font-medium text-muted-foreground">Price</th>
                        <th className="p-4 font-medium text-muted-foreground">Tax</th>
                        <th className="p-4 font-medium text-muted-foreground">Status</th>
                        <th className="p-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAllServices.map((service) => {
                        const cat = categories.find((c) => c.id === service.categoryId)
                        return (
                          <tr key={service.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="p-4">
                              <p className="font-medium">{service.name}</p>
                              {service.description && (
                                <p className="text-muted-foreground max-w-xs truncate text-xs">
                                  {service.description}
                                </p>
                              )}
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className="text-xs">
                                {cat?.name || 'Uncategorized'}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1">
                                <Clock className="text-muted-foreground size-3" />
                                {service.duration} min
                              </div>
                            </td>
                            <td className="p-4 font-medium">{formatCurrency(service.price)}</td>
                            <td className="p-4">{taxBadge(service)}</td>
                            <td className="p-4">
                              <Badge
                                variant={service.isActive ? 'default' : 'secondary'}
                                className={
                                  service.isActive
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                    : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                }
                              >
                                {service.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => openEditDialog(service)}
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1 px-2"
                                  onClick={() => handleToggleActive(service)}
                                >
                                  {service.isActive ? (
                                    <>
                                      <ToggleRight className="size-4 text-emerald-600" />
                                      <span className="text-xs text-emerald-600">On</span>
                                    </>
                                  ) : (
                                    <>
                                      <ToggleLeft className="size-4 text-amber-600" />
                                      <span className="text-xs text-amber-600">Off</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Service Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
            <DialogDescription>
              Create a new service for your salon catalog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Section 1: Basic Information */}
            <div>
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 mb-4">
                <Scissors className="size-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Basic Information</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="svc-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service Name</Label>
                  <Input
                    id="svc-name"
                    placeholder="e.g., Premium Haircut"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="svc-category" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
                  <Select
                    value={form.categoryId}
                    onValueChange={(val) => setForm((f) => ({ ...f, categoryId: val }))}
                  >
                    <SelectTrigger id="svc-category" className="h-11">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="svc-desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                  <Textarea
                    id="svc-desc"
                    placeholder="Brief description of the service"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="border-b" />

            {/* Section 2: Pricing & Duration */}
            <div>
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 mb-4">
                <DollarSign className="size-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pricing & Duration</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="svc-duration" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duration (min)</Label>
                  <Input
                    id="svc-duration"
                    type="number"
                    placeholder="60"
                    value={form.duration}
                    onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="svc-price" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price (PKR)</Label>
                  <Input
                    id="svc-price"
                    type="number"
                    placeholder="5000"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="h-11"
                  />
                </div>
              </div>
            </div>

            <div className="border-b" />

            {/* Section 3: Tax Configuration */}
            <div>
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 mb-4">
                <Percent className="size-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tax Configuration</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tax Type</Label>
                  <Select
                    value={form.taxType}
                    onValueChange={(val) => setForm((f) => ({ ...f, taxType: val }))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select tax type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Tax</SelectItem>
                      <SelectItem value="included">Included in Price</SelectItem>
                      <SelectItem value="excluded">Excluded from Price</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2">
                    <Info className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{taxHelperText[form.taxType]}</p>
                  </div>
                </div>
                {form.taxType !== 'none' && (
                  <div className="space-y-2">
                    <Label htmlFor="svc-tax-rate" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tax Rate (%)</Label>
                    <Input
                      id="svc-tax-rate"
                      type="number"
                      placeholder="e.g., 16"
                      value={form.taxRate}
                      onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddService} disabled={saving || !form.name || !form.categoryId || !form.duration || !form.price}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Add Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>
              Update service details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Section 1: Basic Information */}
            <div>
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 mb-4">
                <Scissors className="size-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Basic Information</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-svc-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service Name</Label>
                  <Input
                    id="edit-svc-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-svc-category" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
                  <Select
                    value={form.categoryId}
                    onValueChange={(val) => setForm((f) => ({ ...f, categoryId: val }))}
                  >
                    <SelectTrigger id="edit-svc-category" className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-svc-desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                  <Textarea
                    id="edit-svc-desc"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="border-b" />

            {/* Section 2: Pricing & Duration */}
            <div>
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 mb-4">
                <DollarSign className="size-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pricing & Duration</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-svc-duration" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duration (min)</Label>
                  <Input
                    id="edit-svc-duration"
                    type="number"
                    value={form.duration}
                    onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-svc-price" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price (PKR)</Label>
                  <Input
                    id="edit-svc-price"
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="h-11"
                  />
                </div>
              </div>
            </div>

            <div className="border-b" />

            {/* Section 3: Tax Configuration */}
            <div>
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 mb-4">
                <Percent className="size-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tax Configuration</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tax Type</Label>
                  <Select
                    value={form.taxType}
                    onValueChange={(val) => setForm((f) => ({ ...f, taxType: val }))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select tax type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Tax</SelectItem>
                      <SelectItem value="included">Included in Price</SelectItem>
                      <SelectItem value="excluded">Excluded from Price</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2">
                    <Info className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{taxHelperText[form.taxType]}</p>
                  </div>
                </div>
                {form.taxType !== 'none' && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-svc-tax-rate" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tax Rate (%)</Label>
                    <Input
                      id="edit-svc-tax-rate"
                      type="number"
                      placeholder="e.g., 16"
                      value={form.taxRate}
                      onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditService} disabled={saving || !form.name || !form.duration || !form.price}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
