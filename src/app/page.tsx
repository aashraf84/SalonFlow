'use client'

import { useSalonStore, type SalonModule } from '@/store/salon-store'
import dynamic from 'next/dynamic'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  UserCog,
  Crown,
  Star,
  ShoppingCart,
  Package,
  Wallet,
  Megaphone,
  Building2,
  DoorOpen,
  Bot,
  BarChart3,
  Settings,
  Menu,
  X,
  ScissorsIcon,
  Bell,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

// Dynamic imports to avoid SSR issues and reduce initial bundle
const DashboardModule = dynamic(() => import('@/components/salon/dashboard').then(mod => ({ default: mod.DashboardModule })), { ssr: false })
const AppointmentsModule = dynamic(() => import('@/components/salon/appointments').then(mod => ({ default: mod.AppointmentsModule })), { ssr: false })
const CustomersModule = dynamic(() => import('@/components/salon/customers').then(mod => ({ default: mod.CustomersModule })), { ssr: false })
const ServicesModule = dynamic(() => import('@/components/salon/services').then(mod => ({ default: mod.ServicesModule })), { ssr: false })
const StaffModule = dynamic(() => import('@/components/salon/staff').then(mod => ({ default: mod.StaffModule })), { ssr: false })
const RoomsModule = dynamic(() => import('@/components/salon/rooms').then(mod => ({ default: mod.RoomsModule })), { ssr: false })
const MembershipsModule = dynamic(() => import('@/components/salon/memberships').then(mod => ({ default: mod.MembershipsModule })), { ssr: false })
const LoyaltyModule = dynamic(() => import('@/components/salon/loyalty').then(mod => ({ default: mod.LoyaltyModule })), { ssr: false })
const PosModule = dynamic(() => import('@/components/salon/pos').then(mod => ({ default: mod.PosModule })), { ssr: false })
const InventoryModule = dynamic(() => import('@/components/salon/inventory').then(mod => ({ default: mod.InventoryModule })), { ssr: false })
const FinanceModule = dynamic(() => import('@/components/salon/finance'), { ssr: false })
const MarketingModule = dynamic(() => import('@/components/salon/marketing'), { ssr: false })
const BranchesModule = dynamic(() => import('@/components/salon/branches'), { ssr: false })
const AIAssistantModule = dynamic(() => import('@/components/salon/ai-assistant'), { ssr: false })
const ReportsModule = dynamic(() => import('@/components/salon/reports'), { ssr: false })
const SettingsModule = dynamic(() => import('@/components/salon/settings'), { ssr: false })

const moduleConfig: { key: SalonModule; label: string; icon: React.ReactNode; group: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="size-4" />, group: 'Main' },
  { key: 'appointments', label: 'Appointments', icon: <Calendar className="size-4" />, group: 'Main' },
  { key: 'customers', label: 'Customers', icon: <Users className="size-4" />, group: 'Main' },
  { key: 'services', label: 'Services', icon: <Scissors className="size-4" />, group: 'Operations' },
  { key: 'staff', label: 'Staff', icon: <UserCog className="size-4" />, group: 'Operations' },
  { key: 'rooms', label: 'Rooms', icon: <DoorOpen className="size-4" />, group: 'Operations' },
  { key: 'memberships', label: 'Memberships', icon: <Crown className="size-4" />, group: 'Business' },
  { key: 'loyalty', label: 'Loyalty & Rewards', icon: <Star className="size-4" />, group: 'Business' },
  { key: 'pos', label: 'Point of Sale', icon: <ShoppingCart className="size-4" />, group: 'Business' },
  { key: 'inventory', label: 'Inventory', icon: <Package className="size-4" />, group: 'Business' },
  { key: 'finance', label: 'Finance', icon: <Wallet className="size-4" />, group: 'Business' },
  { key: 'marketing', label: 'Marketing', icon: <Megaphone className="size-4" />, group: 'Business' },
  { key: 'branches', label: 'Branches', icon: <Building2 className="size-4" />, group: 'Intelligence' },
  { key: 'reports', label: 'Reports', icon: <BarChart3 className="size-4" />, group: 'Intelligence' },
  { key: 'ai-assistant', label: 'AI Assistant', icon: <Bot className="size-4" />, group: 'Intelligence' },
  { key: 'settings', label: 'Settings', icon: <Settings className="size-4" />, group: 'Intelligence' },
]

const groups = ['Main', 'Operations', 'Business', 'Intelligence']

export default function SalonFlowOS() {
  const { activeModule, setActiveModule } = useSalonStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard': return <DashboardModule />
      case 'appointments': return <AppointmentsModule />
      case 'customers': return <CustomersModule />
      case 'services': return <ServicesModule />
      case 'staff': return <StaffModule />
      case 'rooms': return <RoomsModule />
      case 'memberships': return <MembershipsModule />
      case 'loyalty': return <LoyaltyModule />
      case 'pos': return <PosModule />
      case 'inventory': return <InventoryModule />
      case 'finance': return <FinanceModule />
      case 'marketing': return <MarketingModule />
      case 'branches': return <BranchesModule />
      case 'ai-assistant': return <AIAssistantModule />
      case 'reports': return <ReportsModule />
      case 'settings': return <SettingsModule />
      default: return <DashboardModule />
    }
  }

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:fixed lg:inset-y-0 border-r border-border bg-card z-40">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 shadow-sm">
              <ScissorsIcon className="size-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">SalonFlow OS</h1>
              <p className="text-[10px] text-muted-foreground">ApexFlow Ecosystem</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-4">
            {groups.map((group) => (
              <div key={group}>
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {moduleConfig
                    .filter((m) => m.group === group)
                    .map((mod) => (
                      <button
                        key={mod.key}
                        onClick={() => setActiveModule(mod.key)}
                        className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                          activeModule === mod.key
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {mod.icon}
                        <span>{mod.label}</span>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2 px-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-white text-xs font-bold">
                SF
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">SalonFlow Admin</p>
                <p className="text-[10px] text-muted-foreground truncate">admin@salonflow.pk</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-card transition-transform lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-600">
                <ScissorsIcon className="size-4 text-white" />
              </div>
              <h1 className="text-sm font-bold">SalonFlow OS</h1>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setMobileMenuOpen(false)}>
              <X className="size-4" />
            </Button>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-4">
            {groups.map((group) => (
              <div key={group}>
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {moduleConfig
                    .filter((m) => m.group === group)
                    .map((mod) => (
                      <button
                        key={mod.key}
                        onClick={() => {
                          setActiveModule(mod.key)
                          setMobileMenuOpen(false)
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                          activeModule === mod.key
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {mod.icon}
                        <span>{mod.label}</span>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="size-4" />
              </Button>
              <div>
                <h2 className="text-base font-semibold">
                  {moduleConfig.find((m) => m.key === activeModule)?.label || 'Dashboard'}
                </h2>
                <p className="text-[11px] text-muted-foreground hidden sm:block">{dateStr}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-8 h-8 w-48 text-sm bg-muted/50 border-0 focus-visible:ring-1"
                />
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
                <Bell className="size-4" />
                <span className="absolute -top-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] text-white font-bold">
                  3
                </span>
              </Button>
              <Badge variant="outline" className="hidden text-[10px] sm:flex">
                SalonFlow OS v1.0
              </Badge>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {renderModule()}
        </main>

        {/* Sticky Footer */}
        <footer className="border-t border-border bg-card px-6 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>SalonFlow OS — ApexFlow Ecosystem</span>
            <span>v1.0.0 Enterprise Edition</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
