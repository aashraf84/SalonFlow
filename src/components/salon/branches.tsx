'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  Users,
  DoorOpen,
  CheckCircle2,
  XCircle,
  Globe,
  Plus,
  Pencil,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface BranchData {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  branchCode: string
  timezone: string
  openTime: string
  closeTime: string
  isActive: boolean
  staffCount: number
  roomCount: number
  createdAt: string
}

export default function BranchesModule() {
  const [branches, setBranches] = useState<BranchData[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<BranchData | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    branchCode: '',
    timezone: 'Asia/Karachi',
    openTime: '09:00',
    closeTime: '21:00',
  })

  const fetchBranches = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/branches')
      const json = await res.json()
      if (json.success) {
        setBranches(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  const totalStaff = branches.reduce((s, b) => s + b.staffCount, 0)
  const totalRooms = branches.reduce((s, b) => s + b.roomCount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Loading branches...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Branch Management</h1>
          <p className="text-muted-foreground text-sm">
            Manage your salon branches and locations
          </p>
        </div>
        <Button onClick={() => { setBranchForm({ name: '', address: '', phone: '', email: '', branchCode: '', timezone: 'Asia/Karachi', openTime: '09:00', closeTime: '21:00' }); setAddDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Branch
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Branches
            </CardTitle>
            <Building2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branches.length}</div>
            <p className="text-xs text-muted-foreground">
              {branches.filter((b) => b.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Staff
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStaff}</div>
            <p className="text-xs text-muted-foreground">Across all branches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Rooms
            </CardTitle>
            <DoorOpen className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRooms}</div>
            <p className="text-xs text-muted-foreground">Treatment & service rooms</p>
          </CardContent>
        </Card>
      </div>

      {/* Branch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {branches.length > 0 ? (
          branches.map((branch) => (
            <Card
              key={branch.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{branch.name}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Code: {branch.branchCode}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingBranch(branch); setBranchForm({ name: branch.name || '', address: branch.address || '', phone: branch.phone || '', email: branch.email || '', branchCode: branch.branchCode, timezone: branch.timezone, openTime: branch.openTime, closeTime: branch.closeTime }); setEditDialogOpen(true) }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {branch.isActive ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Address */}
                {branch.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{branch.address}</span>
                  </div>
                )}

                {/* Contact Info */}
                <div className="flex items-center gap-4">
                  {branch.phone && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{branch.phone}</span>
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{branch.email}</span>
                    </div>
                  )}
                </div>

                {/* Operating Hours */}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {branch.openTime} – {branch.closeTime}
                  </span>
                </div>

                {/* Timezone */}
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{branch.timezone}</span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="text-center">
                    <p className="text-lg font-bold">{branch.staffCount}</p>
                    <p className="text-xs text-muted-foreground">Staff</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{branch.roomCount}</p>
                    <p className="text-xs text-muted-foreground">Rooms</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <h3 className="font-semibold text-sm">No branches found</h3>
            <p className="text-muted-foreground text-xs mt-1">
              Add branches to start managing your salon locations
            </p>
          </div>
        )}
      </div>

      {/* Branch Comparison Table */}
      {branches.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Branch Comparison</CardTitle>
            <CardDescription>Side-by-side comparison of all branches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead className="text-center">Staff</TableHead>
                    <TableHead className="text-center">Rooms</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">{branch.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {branch.branchCode}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {branch.isActive ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 text-xs">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {branch.openTime} – {branch.closeTime}
                      </TableCell>
                      <TableCell className="text-center">{branch.staffCount}</TableCell>
                      <TableCell className="text-center">{branch.roomCount}</TableCell>
                      <TableCell className="text-sm">{branch.phone || '—'}</TableCell>
                      <TableCell className="text-sm">{branch.email || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Branch Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Branch</DialogTitle>
            <DialogDescription>Create a new salon branch location</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Branch Name *</Label>
                <Input value={branchForm.name} onChange={(e) => setBranchForm({...branchForm, name: e.target.value})} placeholder="Gulberg Branch" />
              </div>
              <div className="space-y-2">
                <Label>Branch Code *</Label>
                <Input value={branchForm.branchCode} onChange={(e) => setBranchForm({...branchForm, branchCode: e.target.value})} placeholder="GLB" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={branchForm.address} onChange={(e) => setBranchForm({...branchForm, address: e.target.value})} placeholder="123 Main St" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={branchForm.phone} onChange={(e) => setBranchForm({...branchForm, phone: e.target.value})} placeholder="+92-300-0000000" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={branchForm.email} onChange={(e) => setBranchForm({...branchForm, email: e.target.value})} placeholder="branch@salonflow.pk" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input value={branchForm.timezone} onChange={(e) => setBranchForm({...branchForm, timezone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Open Time</Label>
                <Input type="time" value={branchForm.openTime} onChange={(e) => setBranchForm({...branchForm, openTime: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Close Time</Label>
                <Input type="time" value={branchForm.closeTime} onChange={(e) => setBranchForm({...branchForm, closeTime: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!branchForm.name || !branchForm.branchCode) { toast.error('Name and code are required'); return }
              setSubmitting(true)
              try {
                const res = await fetch('/api/branches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(branchForm) })
                const json = await res.json()
                if (json.success) { toast.success('Branch created'); setAddDialogOpen(false); fetchBranches() }
                else toast.error(json.error || 'Failed to create branch')
              } catch { toast.error('Failed to create branch') }
              finally { setSubmitting(false) }
            }} disabled={submitting || !branchForm.name || !branchForm.branchCode}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Branch Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
            <DialogDescription>Update branch information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Branch Name *</Label>
                <Input value={branchForm.name} onChange={(e) => setBranchForm({...branchForm, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Branch Code</Label>
                <Input value={branchForm.branchCode} disabled />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={branchForm.address} onChange={(e) => setBranchForm({...branchForm, address: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={branchForm.phone} onChange={(e) => setBranchForm({...branchForm, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={branchForm.email} onChange={(e) => setBranchForm({...branchForm, email: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input value={branchForm.timezone} onChange={(e) => setBranchForm({...branchForm, timezone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Open Time</Label>
                <Input type="time" value={branchForm.openTime} onChange={(e) => setBranchForm({...branchForm, openTime: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Close Time</Label>
                <Input type="time" value={branchForm.closeTime} onChange={(e) => setBranchForm({...branchForm, closeTime: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!editingBranch) return
              setSubmitting(true)
              try {
                const res = await fetch(`/api/branches/${editingBranch.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(branchForm) })
                const json = await res.json()
                if (json.success) { toast.success('Branch updated'); setEditDialogOpen(false); setEditingBranch(null); fetchBranches() }
                else toast.error(json.error || 'Failed to update branch')
              } catch { toast.error('Failed to update branch') }
              finally { setSubmitting(false) }
            }} disabled={submitting || !branchForm.name}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
