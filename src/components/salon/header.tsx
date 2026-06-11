'use client'

import { useSalonStore, SalonModule } from '@/store/salon-store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Bell, Search } from 'lucide-react'

const moduleTitles: Record<SalonModule, string> = {
  dashboard: 'Dashboard',
  appointments: 'Appointments',
  customers: 'Customers',
  services: 'Services',
  staff: 'Staff Management',
  memberships: 'Memberships',
  loyalty: 'Loyalty Program',
  pos: 'Point of Sale',
  inventory: 'Inventory',
  finance: 'Finance',
  marketing: 'Marketing',
  branches: 'Branches',
  rooms: 'Rooms',
  'ai-assistant': 'AI Assistant',
  reports: 'Reports',
  settings: 'Settings',
}

function getTodayDate(): string {
  const now = new Date()
  return now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function SalonHeader() {
  const { activeModule } = useSalonStore()
  const title = moduleTitles[activeModule] || 'Dashboard'

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left: Page title */}
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        </div>

        {/* Center: Search */}
        <div className="hidden md:flex items-center max-w-md flex-1 mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search appointments, customers, services..."
              className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs text-muted-foreground font-medium">
            {getTodayDate()}
          </span>

          <Button variant="ghost" size="icon" className="relative h-9 w-9">
            <Bell className="w-4 h-4" />
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
              3
            </Badge>
          </Button>

          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
              SF
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
