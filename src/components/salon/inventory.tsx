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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
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
  Package,
  AlertTriangle,
  DollarSign,
  Layers,
  RefreshCw,
  ArrowUp,
  Search,
  Circle,
} from 'lucide-react'

const formatCurrency = (amount: number) => `PKR ${amount.toLocaleString()}`

// --- Types ---
interface ProductCategory {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  sku: string
  brand?: string
  costPrice: number
  sellingPrice: number
  unit: string
  reorderLevel: number
  isActive: boolean
  category: ProductCategory
}

interface Branch {
  id: string
  name: string
  branchCode: string
}

interface InventoryItem {
  id: string
  productId: string
  branchId: string
  quantity: number
  batchNumber?: string
  expiryDate?: string
  lastRestocked?: string
  product: Product
  branch: Branch
}

// --- Stock status helper ---
function getStockStatus(quantity: number, reorderLevel: number) {
  if (quantity <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', dot: 'text-red-500' }
  if (quantity <= reorderLevel) return { label: 'Low Stock', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', dot: 'text-amber-500' }
  if (quantity <= reorderLevel * 1.5) return { label: 'Near Reorder', color: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400', dot: 'text-amber-400' }
  return { label: 'In Stock', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300', dot: 'text-emerald-500' }
}

export function InventoryModule() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [stockForm, setStockForm] = useState({ id: '', quantity: '', operation: 'add' })

  const fetchItems = useCallback(async () => {
    try {
      const [itemsRes, lowRes, brRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/inventory?lowStock=true'),
        fetch('/api/branches'),
      ])
      const itemsData = await itemsRes.json()
      const lowData = await lowRes.json()
      const brData = await brRes.json()

      if (itemsData.success) setItems(itemsData.data)
      if (lowData.success) setLowStockItems(lowData.data)
      if (brData.success) setBranches(brData.data)
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await fetchItems()
      setLoading(false)
    }
    load()
  }, [fetchItems])

  // Stats
  const uniqueProducts = new Map<string, Product>()
  items.forEach((item) => uniqueProducts.set(item.productId, item.product))

  const totalValue = items.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  )
  const uniqueCategories = new Set(
    items.map((item) => item.product.category?.id).filter(Boolean)
  )

  // Group by product and branch for the table
  const productMap = new Map<string, { product: Product; branches: Map<string, number>; reorderLevel: number }>()
  items.forEach((item) => {
    if (!productMap.has(item.productId)) {
      productMap.set(item.productId, {
        product: item.product,
        branches: new Map(),
        reorderLevel: item.product.reorderLevel,
      })
    }
    productMap.get(item.productId)!.branches.set(item.branchId, item.quantity)
  })

  // Filter
  const filteredProducts = Array.from(productMap.entries())
    .filter(([, data]) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        data.product.name.toLowerCase().includes(q) ||
        data.product.sku.toLowerCase().includes(q) ||
        (data.product.brand?.toLowerCase() || '').includes(q)
      )
    })

  // Update stock handler
  const handleUpdateStock = async () => {
    if (!stockForm.id || !stockForm.quantity) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: stockForm.id,
          quantity: parseInt(stockForm.quantity),
          operation: stockForm.operation,
        }),
      })
      if (res.ok) {
        setDialogOpen(false)
        setStockForm({ id: '', quantity: '', operation: 'add' })
        await fetchItems()
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false)
    }
  }

  const openStockDialog = (itemId: string) => {
    setStockForm({ id: itemId, quantity: '', operation: 'add' })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory Management</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Track stock levels, manage products, and reorder alerts
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" variant="outline">
              <RefreshCw className="size-4" />
              Update Stock
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Update Stock</DialogTitle>
              <DialogDescription>
                Adjust inventory quantity for a specific item.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Operation</Label>
                <Select value={stockForm.operation} onValueChange={(v) => setStockForm({ ...stockForm, operation: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add Stock</SelectItem>
                    <SelectItem value="subtract">Remove Stock</SelectItem>
                    <SelectItem value="set">Set Absolute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock-qty">Quantity</Label>
                <Input
                  id="stock-qty"
                  type="number"
                  placeholder="Enter quantity"
                  value={stockForm.quantity}
                  onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateStock} disabled={submitting || !stockForm.quantity}>
                {submitting ? 'Updating...' : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                <Package className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-xl font-bold">{uniqueProducts.size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900">
                <AlertTriangle className="size-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Alerts</p>
                <p className="text-xl font-bold">{lowStockItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900">
                <DollarSign className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900">
                <Layers className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-xl font-bold">{uniqueCategories.size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Products</TabsTrigger>
          <TabsTrigger value="lowstock" className="gap-1">
            Low Stock Alerts
            {lowStockItems.length > 0 && (
              <Badge variant="secondary" className="ml-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-xs px-1.5">
                {lowStockItems.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Products Tab */}
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product name, SKU, or brand..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="size-12 text-muted-foreground/50 mb-3" />
                  <h3 className="font-semibold text-lg">No Products Found</h3>
                  <p className="text-muted-foreground text-sm mt-1">Add products and inventory to get started.</p>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Selling</TableHead>
                        {branches.map((b) => (
                          <TableHead key={b.id}>{b.name}</TableHead>
                        ))}
                        <TableHead>Reorder Level</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map(([productId, data]) => {
                        const totalQty = Array.from(data.branches.values()).reduce((s, q) => s + q, 0)
                        const status = getStockStatus(totalQty, data.reorderLevel)
                        return (
                          <TableRow key={productId}>
                            <TableCell className="font-medium">{data.product.name}</TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">{data.product.sku}</TableCell>
                            <TableCell className="text-sm">{data.product.brand || '—'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {data.product.category?.name || '—'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{formatCurrency(data.product.costPrice)}</TableCell>
                            <TableCell className="text-sm font-medium">{formatCurrency(data.product.sellingPrice)}</TableCell>
                            {branches.map((b) => {
                              const qty = data.branches.get(b.id) || 0
                              const itemStatus = getStockStatus(qty, data.reorderLevel)
                              return (
                                <TableCell key={b.id}>
                                  <span className={`font-medium ${qty <= data.reorderLevel ? 'text-red-600 dark:text-red-400' : ''}`}>
                                    {qty}
                                  </span>
                                  <Circle className={`inline-block size-2 ml-1 ${itemStatus.dot}`} fill="currentColor" />
                                </TableCell>
                              )
                            })}
                            <TableCell className="text-sm text-muted-foreground">{data.reorderLevel}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={`text-xs ${status.color}`}>
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => {
                                  const invItem = items.find(
                                    (i) => i.productId === productId
                                  )
                                  if (invItem) openStockDialog(invItem.id)
                                }}
                              >
                                <ArrowUp className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Low Stock Alerts Tab */}
        <TabsContent value="lowstock" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : lowStockItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="size-12 text-emerald-300 mb-3" />
                  <h3 className="font-semibold text-lg text-emerald-700 dark:text-emerald-300">All Stock Healthy</h3>
                  <p className="text-muted-foreground text-sm mt-1">No products are below their reorder level.</p>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Reorder Level</TableHead>
                        <TableHead>Suggested Reorder</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockItems.map((item) => {
                        const status = getStockStatus(item.quantity, item.product.reorderLevel)
                        const suggestedReorder = Math.max(0, item.product.reorderLevel * 2 - item.quantity)
                        return (
                          <TableRow key={item.id} className={item.quantity <= 0 ? 'bg-red-50/50 dark:bg-red-950/30' : ''}>
                            <TableCell className="font-medium">{item.product.name}</TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">{item.product.sku}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {item.product.category?.name || '—'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{item.branch.name}</TableCell>
                            <TableCell>
                              <span className={`font-bold ${item.quantity <= 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                {item.quantity}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.product.reorderLevel}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="gap-1 text-xs">
                                <ArrowUp className="size-3" />
                                {suggestedReorder} units
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={`text-xs ${status.color}`}>
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-xs"
                                onClick={() => openStockDialog(item.id)}
                              >
                                <RefreshCw className="size-3" />
                                Restock
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
