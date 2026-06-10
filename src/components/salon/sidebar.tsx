'use client'

import { useSalonStore, SalonModule } from '@/store/salon-store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import {
  Scissors,
  LayoutDashboard,
  CalendarDays,
  Users,
  Sparkles,
  UserCog,
  DoorOpen,
  Crown,
  Star,
  ShoppingCart,
  Package,
  Wallet,
  Megaphone,
  Building2,
  Bot,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  id: SalonModule
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'appointments', label: 'Appointments', icon: CalendarDays },
      { id: 'customers', label: 'Customers', icon: Users },
    ],
  },
  {
    title: 'Operations',
    items: [
      { id: 'services', label: 'Services', icon: Sparkles },
      { id: 'staff', label: 'Staff', icon: UserCog },
      { id: 'rooms', label: 'Rooms', icon: DoorOpen },
    ],
  },
  {
    title: 'Business',
    items: [
      { id: 'memberships', label: 'Memberships', icon: Crown },
      { id: 'loyalty', label: 'Loyalty', icon: Star },
      { id: 'pos', label: 'POS', icon: ShoppingCart },
    ],
  },
  {
    title: 'Management',
    items: [
      { id: 'inventory', label: 'Inventory', icon: Package },
      { id: 'finance', label: 'Finance', icon: Wallet },
      { id: 'marketing', label: 'Marketing', icon: Megaphone },
      { id: 'branches', label: 'Branches', icon: Building2 },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { id: 'ai-assistant', label: 'AI Assistant', icon: Bot },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
]

export function SalonSidebar() {
  const { activeModule, setActiveModule, sidebarCollapsed, toggleSidebar } = useSalonStore()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-card border-r flex flex-col z-50 transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand / Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b shrink-0',
        sidebarCollapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shrink-0">
          <Scissors className="w-4 h-4" />
        </div>
        {!sidebarCollapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold tracking-tight truncate">SalonFlow OS</span>
            <span className="text-[10px] text-muted-foreground truncate">ApexFlow Ecosystem</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {navGroups.map((group, groupIdx) => (
            <div key={group.title}>
              {groupIdx > 0 && <Separator className="my-2" />}
              {/* Group label */}
              {!sidebarCollapsed && (
                <div className="px-3 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.title}
                  </span>
                </div>
              )}
              {/* Nav items */}
              {group.items.map((item) => {
                const isActive = activeModule === item.id
                const Icon = item.icon

                const button = (
                  <Button
                    key={item.id}
                    variant={isActive ? 'secondary' : 'ghost'}
                    size={sidebarCollapsed ? 'icon' : 'default'}
                    className={cn(
                      'w-full transition-all duration-200',
                      sidebarCollapsed
                        ? 'justify-center h-10 w-10 mx-auto'
                        : 'justify-start h-9 px-3',
                      isActive && 'bg-primary/10 text-primary font-semibold hover:bg-primary/15',
                      !isActive && 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setActiveModule(item.id)}
                  >
                    <Icon className={cn('shrink-0', sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4')} />
                    {!sidebarCollapsed && (
                      <span className="ml-2 truncate text-sm">{item.label}</span>
                    )}
                  </Button>
                )

                if (sidebarCollapsed) {
                  return (
                    <Tooltip key={item.id} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div className="flex justify-center py-0.5">
                          {button}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return (
                  <div key={item.id} className="py-0.5">
                    {button}
                  </div>
                )
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Collapse Toggle */}
      <div className="border-t p-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full transition-all',
            sidebarCollapsed ? 'justify-center h-8 w-8 mx-auto' : 'justify-start'
          )}
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="ml-2 text-xs">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
