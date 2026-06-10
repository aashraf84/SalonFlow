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
  Search,
  Loader2,
  DoorOpen,
  Users,
  Wrench,
  Building2,
  Sparkles,
  Stethoscope,
  Sofa,
  MapPin,
} from 'lucide-react'

// ---- Types ----
interface Branch {
  id: string
  name: string
  branchCode: string
}

interface Room {
  id: string
  branchId: string
  name: string
  roomType: string
  capacity: number
  status: string
  equipment: string | null
  createdAt: string
  branch: Branch
}

interface RoomStats {
  total: number
  available: number
  occupied: number
  maintenance: number
}

interface BranchOption {
  id: string
  name: string
}

const roomTypeBadgeColors: Record<string, string> = {
  treatment: 'bg-pink-100 text-pink-700 border-pink-200',
  spa: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  consultation: 'bg-amber-100 text-amber-700 border-amber-200',
  waiting: 'bg-gray-100 text-gray-700 border-gray-200',
}

const roomTypeIcons: Record<string, React.ReactNode> = {
  treatment: <Sparkles className="size-4" />,
  spa: <Sparkles className="size-4" />,
  consultation: <Stethoscope className="size-4" />,
  waiting: <Sofa className="size-4" />,
}

const roomTypeLabels: Record<string, string> = {
  treatment: 'Treatment',
  spa: 'Spa',
  consultation: 'Consultation',
  waiting: 'Waiting',
}

const statusBadgeColors: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700',
  occupied: 'bg-amber-100 text-amber-700',
  cleaning: 'bg-sky-100 text-sky-700',
  maintenance: 'bg-red-100 text-red-700',
}

const statusDotColors: Record<string, string> = {
  available: 'bg-emerald-500',
  occupied: 'bg-amber-500',
  cleaning: 'bg-sky-500',
  maintenance: 'bg-red-500',
}

const statusLabels: Record<string, string> = {
  available: 'Available',
  occupied: 'Occupied',
  cleaning: 'Cleaning',
  maintenance: 'Maintenance',
}

export function RoomsModule() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [stats, setStats] = useState<RoomStats>({ total: 0, available: 0, occupied: 0, maintenance: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBranch, setFilterBranch] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    branchId: '',
    roomType: 'treatment',
    capacity: '1',
    status: 'available',
    equipment: '',
  })

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/rooms')
      const json = await res.json()
      if (json.success) {
        setRooms(json.data)
        setStats(json.stats)
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err)
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
    fetchRooms()
    fetchBranches()
  }, [fetchRooms, fetchBranches])

  const handleAddRoom = async () => {
    if (!form.name || !form.branchId) return
    try {
      setSaving(true)
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          branchId: form.branchId,
          roomType: form.roomType,
          capacity: parseInt(form.capacity),
          status: form.status,
          equipment: form.equipment || null,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setAddDialogOpen(false)
        setForm({
          name: '',
          branchId: '',
          roomType: 'treatment',
          capacity: '1',
          status: 'available',
          equipment: '',
        })
        fetchRooms()
      }
    } catch (err) {
      console.error('Failed to add room:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (roomId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: roomId, status: newStatus }),
      })
      const json = await res.json()
      if (json.success) {
        fetchRooms()
      }
    } catch (err) {
      console.error('Failed to update room status:', err)
    }
  }

  // Filter rooms
  const filteredRooms = rooms.filter((room) => {
    const matchSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchBranch = filterBranch === 'all' || room.branchId === filterBranch
    const matchType = filterType === 'all' || room.roomType === filterType
    const matchStatus = filterStatus === 'all' || room.status === filterStatus
    return matchSearch && matchBranch && matchType && matchStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Room & Spa Management</h2>
          <p className="text-muted-foreground text-sm">
            Manage rooms, spa areas, and treatment spaces
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Add Room
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-violet-100">
              <DoorOpen className="size-5 text-violet-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium">Total Rooms</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100">
              <DoorOpen className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium">Available</p>
              <p className="text-xl font-bold text-emerald-600">{stats.available}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100">
              <Users className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium">Occupied</p>
              <p className="text-xl font-bold text-amber-600">{stats.occupied}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-red-100">
              <Wrench className="size-5 text-red-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium">Maintenance</p>
              <p className="text-xl font-bold text-red-600">{stats.maintenance}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterBranch} onValueChange={setFilterBranch}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="treatment">Treatment</SelectItem>
            <SelectItem value="spa">Spa</SelectItem>
            <SelectItem value="consultation">Consultation</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="occupied">Occupied</SelectItem>
            <SelectItem value="cleaning">Cleaning</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Room Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        </div>
      ) : filteredRooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DoorOpen className="text-muted-foreground mb-3 size-10" />
            <p className="text-muted-foreground text-sm">No rooms found matching your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRooms.map((room) => {
            const typeColor = roomTypeBadgeColors[room.roomType] || 'bg-gray-100 text-gray-700 border-gray-200'
            const statusColor = statusBadgeColors[room.status] || 'bg-gray-100 text-gray-700'
            const statusDot = statusDotColors[room.status] || 'bg-gray-400'
            const typeLabel = roomTypeLabels[room.roomType] || room.roomType
            const statusLabel = statusLabels[room.status] || room.status
            const typeIcon = roomTypeIcons[room.roomType] || <DoorOpen className="size-4" />

            return (
              <Card key={room.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="p-4 pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex size-9 items-center justify-center rounded-lg border ${typeColor}`}
                      >
                        {typeIcon}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">{room.name}</CardTitle>
                        <Badge variant="outline" className={`mt-1 text-[10px] ${typeColor}`}>
                          {typeLabel}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-block size-2.5 rounded-full ${statusDot}`} />
                      <span className="text-xs font-medium">{statusLabel}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0">
                  <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                    <Users className="size-3.5" />
                    Capacity: <span className="font-medium text-foreground">{room.capacity}</span>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                    <MapPin className="size-3.5" />
                    <span className="truncate font-medium text-foreground">{room.branch.name}</span>
                  </div>
                  {room.equipment && (
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      <span className="font-medium text-foreground">Equipment:</span> {room.equipment}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Select
                      value={room.status}
                      onValueChange={(val) => handleStatusChange(room.id, val)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="cleaning">Cleaning</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Room Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Room</DialogTitle>
            <DialogDescription>
              Add a new room or space to your salon.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">Room Name</Label>
              <Input
                id="room-name"
                placeholder="e.g., VIP Treatment Suite"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Room Type</Label>
                <Select
                  value={form.roomType}
                  onValueChange={(val) => setForm((f) => ({ ...f, roomType: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="treatment">Treatment</SelectItem>
                    <SelectItem value="spa">Spa</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="waiting">Waiting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room-capacity">Capacity</Label>
                <Input
                  id="room-capacity"
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(val) => setForm((f) => ({ ...f, status: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-equipment">Equipment Notes</Label>
              <Textarea
                id="room-equipment"
                placeholder="List any equipment or notes"
                value={form.equipment}
                onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRoom} disabled={saving || !form.name || !form.branchId}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Add Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
