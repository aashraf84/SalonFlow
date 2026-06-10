'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  Plus,
  Pencil,
  Search,
  Loader2,
  Calendar,
  Phone,
  Mail,
  TrendingUp,
  Award,
  Users,
  UserCheck,
  UserX,
  Clock,
} from 'lucide-react'

// ---- Types ----
interface Branch {
  id: string
  name: string
  branchCode: string
}

interface Commission {
  id: string
  amount: number
  type: string
  status: string
  period: string
  createdAt: string
}

interface CommissionTotals {
  total: number
  pending: number
  paid: number
}

interface StaffMember {
  id: string
  branchId: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  role: string
  specialization: string | null
  hireDate: string
  status: string
  commissionRate: number
  avatar: string | null
  bio: string | null
  createdAt: string
  updatedAt: string
  branch: Branch
  commissions: Commission[]
  commissionTotals: CommissionTotals
}

interface BranchOption {
  id: string
  name: string
}

const formatCurrency = (amount: number) => `PKR ${amount.toLocaleString()}`

const roleBadgeColors: Record<string, string> = {
  owner: 'bg-red-100 text-red-700 border-red-200',
  manager: 'bg-amber-100 text-amber-700 border-amber-200',
  stylist: 'bg-purple-100 text-purple-700 border-purple-200',
  beautician: 'bg-pink-100 text-pink-700 border-pink-200',
  therapist: 'bg-teal-100 text-teal-700 border-teal-200',
  receptionist: 'bg-sky-100 text-sky-700 border-sky-200',
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500',
  on_leave: 'bg-amber-500',
  inactive: 'bg-gray-400',
}

const statusLabels: Record<string, string> = {
  active: 'Active',
  on_leave: 'On Leave',
  inactive: 'Inactive',
}

const avatarColors = [
  'bg-rose-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-sky-500',
  'bg-emerald-500',
  'bg-indigo-500',
  'bg-fuchsia-500',
  'bg-cyan-500',
]

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

export function StaffModule() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'stylist',
    specialization: '',
    branchId: '',
    commissionRate: '10',
    bio: '',
  })

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/staff')
      const json = await res.json()
      if (json.success) {
        setStaff(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch staff:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch('/api/branches')
      const json = await res.json()
      if (json.success) {
        setBranches(json.data.map((b: { id: string; name: string }) => ({ id: b.id, name: b.name })))
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err)
    }
  }, [])

  useEffect(() => {
    fetchStaff()
    fetchBranches()
  }, [fetchStaff, fetchBranches])

  const handleAddStaff = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.branchId) return
    try {
      setSaving(true)
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || null,
          role: form.role,
          specialization: form.specialization || null,
          branchId: form.branchId,
          commissionRate: parseFloat(form.commissionRate) / 100,
          bio: form.bio || null,
          status: 'active',
        }),
      })
      const json = await res.json()
      if (json.success) {
        setAddDialogOpen(false)
        setForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          role: 'stylist',
          specialization: '',
          branchId: '',
          commissionRate: '10',
          bio: '',
        })
        fetchStaff()
      }
    } catch (err) {
      console.error('Failed to add staff:', err)
    } finally {
      setSaving(false)
    }
  }

  const openDetail = (member: StaffMember) => {
    setSelectedStaff(member)
    setDetailDialogOpen(true)
  }

  // Stats
  const totalStaff = staff.length
  const activeToday = staff.filter((s) => s.status === 'active').length
  const onLeave = staff.filter((s) => s.status === 'on_leave').length
  const managers = staff.filter((s) => s.role === 'manager' || s.role === 'owner').length

  // Filter
  const filteredStaff = staff.filter((s) => {
    const matchSearch =
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.specialization && s.specialization.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchRole = filterRole === 'all' || s.role === filterRole
    return matchSearch && matchRole
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Staff Management</h2>
          <p className="text-muted-foreground text-sm">
            Manage your team, commissions, and schedules
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Add Staff
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-violet-100">
              <Users className="size-5 text-violet-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium">Total Staff</p>
              <p className="text-xl font-bold">{totalStaff}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100">
              <UserCheck className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium">Active Today</p>
              <p className="text-xl font-bold text-emerald-600">{activeToday}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100">
              <Clock className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium">On Leave</p>
              <p className="text-xl font-bold text-amber-600">{onLeave}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-rose-100">
              <Award className="size-5 text-rose-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium">Managers</p>
              <p className="text-xl font-bold text-rose-600">{managers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="stylist">Stylist</SelectItem>
            <SelectItem value="beautician">Beautician</SelectItem>
            <SelectItem value="therapist">Therapist</SelectItem>
            <SelectItem value="receptionist">Receptionist</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStaff.map((member) => {
            const initials = getInitials(member.firstName, member.lastName)
            const colorClass = getAvatarColor(`${member.firstName} ${member.lastName}`)
            return (
              <Card key={member.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="p-4 pb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${colorClass}`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base truncate">
                          {member.firstName} {member.lastName}
                        </CardTitle>
                        <span
                          className={`inline-block size-2.5 shrink-0 rounded-full ${statusColors[member.status] || 'bg-gray-400'}`}
                          title={statusLabels[member.status] || member.status}
                        />
                      </div>
                      <Badge
                        variant="outline"
                        className={`mt-1 text-xs ${roleBadgeColors[member.role] || 'bg-gray-100 text-gray-700 border-gray-200'}`}
                      >
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0">
                  {member.specialization && (
                    <p className="text-muted-foreground text-sm">
                      <span className="font-medium text-foreground">Specialization:</span>{' '}
                      {member.specialization}
                    </p>
                  )}
                  <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                    <Phone className="size-3.5" />
                    <span className="truncate">{member.phone || 'N/A'}</span>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                    <Mail className="size-3.5" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Branch: <span className="font-medium text-foreground">{member.branch.name}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Commission:{' '}
                      <span className="font-medium text-foreground">
                        {(member.commissionRate * 100).toFixed(0)}%
                      </span>
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => openDetail(member)}
                    >
                      <Calendar className="size-3.5" />
                      View Profile
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Staff Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
            <DialogDescription>
              Add a new team member to your salon.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="staff-fname">First Name</Label>
                <Input
                  id="staff-fname"
                  placeholder="First name"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-lname">Last Name</Label>
                <Input
                  id="staff-lname"
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                placeholder="email@salonflow.pk"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-phone">Phone</Label>
              <Input
                id="staff-phone"
                placeholder="+92-300-0000000"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(val) => setForm((f) => ({ ...f, role: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="stylist">Stylist</SelectItem>
                    <SelectItem value="beautician">Beautician</SelectItem>
                    <SelectItem value="therapist">Therapist</SelectItem>
                    <SelectItem value="receptionist">Receptionist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select
                  value={form.branchId}
                  onValueChange={(val) => setForm((f) => ({ ...f, branchId: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-spec">Specialization</Label>
              <Input
                id="staff-spec"
                placeholder="e.g., Hair Styling & Color"
                value={form.specialization}
                onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-comm">Commission Rate (%)</Label>
              <Input
                id="staff-comm"
                type="number"
                min="0"
                max="50"
                placeholder="10"
                value={form.commissionRate}
                onChange={(e) => setForm((f) => ({ ...f, commissionRate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-bio">Bio</Label>
              <Textarea
                id="staff-bio"
                placeholder="Brief bio or notes"
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddStaff}
              disabled={saving || !form.firstName || !form.lastName || !form.email || !form.branchId}
            >
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Add Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedStaff && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-14 items-center justify-center rounded-full text-lg font-bold text-white ${getAvatarColor(`${selectedStaff.firstName} ${selectedStaff.lastName}`)}`}
                  >
                    {getInitials(selectedStaff.firstName, selectedStaff.lastName)}
                  </div>
                  <div>
                    <DialogTitle>
                      {selectedStaff.firstName} {selectedStaff.lastName}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={`text-xs ${roleBadgeColors[selectedStaff.role] || ''}`}
                      >
                        {selectedStaff.role.charAt(0).toUpperCase() + selectedStaff.role.slice(1)}
                      </Badge>
                      <span
                        className={`inline-block size-2.5 rounded-full ${statusColors[selectedStaff.status]}`}
                      />
                      <span className="text-xs">{statusLabels[selectedStaff.status]}</span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {/* Contact Info */}
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="text-muted-foreground size-4" />
                    <span>{selectedStaff.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="text-muted-foreground size-4" />
                    <span>{selectedStaff.phone || 'N/A'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Branch</span>
                    <p className="font-medium">{selectedStaff.branch.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Specialization</span>
                    <p className="font-medium">{selectedStaff.specialization || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Commission Rate</span>
                    <p className="font-medium">{(selectedStaff.commissionRate * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hire Date</span>
                    <p className="font-medium">
                      {new Date(selectedStaff.hireDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Commission Summary */}
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Commission Summary</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-muted-foreground text-xs">Total Earned</p>
                        <p className="text-sm font-bold">
                          {formatCurrency(selectedStaff.commissionTotals.total)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-muted-foreground text-xs">Pending</p>
                        <p className="text-sm font-bold text-amber-600">
                          {formatCurrency(selectedStaff.commissionTotals.pending)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-muted-foreground text-xs">Paid</p>
                        <p className="text-sm font-bold text-emerald-600">
                          {formatCurrency(selectedStaff.commissionTotals.paid)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Performance</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardContent className="flex items-center gap-2 p-3">
                        <TrendingUp className="size-4 text-emerald-600" />
                        <div>
                          <p className="text-muted-foreground text-xs">Appointments</p>
                          <p className="text-sm font-bold">{selectedStaff.commissions.length}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="flex items-center gap-2 p-3">
                        <Award className="size-4 text-violet-600" />
                        <div>
                          <p className="text-muted-foreground text-xs">Avg Commission</p>
                          <p className="text-sm font-bold">
                            {selectedStaff.commissions.length > 0
                              ? formatCurrency(
                                  Math.round(
                                    selectedStaff.commissionTotals.total /
                                      selectedStaff.commissions.length
                                  )
                                )
                              : 'PKR 0'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Recent Commissions */}
                {selectedStaff.commissions.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Recent Commissions</h4>
                    <div className="max-h-48 space-y-2 overflow-y-auto">
                      {selectedStaff.commissions.slice(0, 5).map((comm) => (
                        <div
                          key={comm.id}
                          className="flex items-center justify-between rounded-lg border p-2 text-sm"
                        >
                          <div>
                            <p className="font-medium">{comm.period}</p>
                            <p className="text-muted-foreground text-xs capitalize">
                              {comm.type} commission
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(comm.amount)}</p>
                            <Badge
                              variant={comm.status === 'paid' ? 'default' : 'secondary'}
                              className={
                                comm.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-700 text-[10px]'
                                  : 'bg-amber-100 text-amber-700 text-[10px]'
                              }
                            >
                              {comm.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
