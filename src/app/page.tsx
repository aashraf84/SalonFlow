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
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/theme-toggle'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

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
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="size-[18px]" />, group: 'Main' },
  { key: 'appointments', label: 'Appointments', icon: <Calendar className="size-[18px]" />, group: 'Main' },
  { key: 'customers', label: 'Customers', icon: <Users className="size-[18px]" />, group: 'Main' },
  { key: 'services', label: 'Services', icon: <Scissors className="size-[18px]" />, group: 'Operations' },
  { key: 'staff', label: 'Staff', icon: <UserCog className="size-[18px]" />, group: 'Operations' },
  { key: 'rooms', label: 'Rooms', icon: <DoorOpen className="size-[18px]" />, group: 'Operations' },
  { key: 'memberships', label: 'Memberships', icon: <Crown className="size-[18px]" />, group: 'Business' },
  { key: 'loyalty', label: 'Loyalty & Rewards', icon: <Star className="size-[18px]" />, group: 'Business' },
  { key: 'pos', label: 'Point of Sale', icon: <ShoppingCart className="size-[18px]" />, group: 'Business' },
  { key: 'inventory', label: 'Inventory', icon: <Package className="size-[18px]" />, group: 'Business' },
  { key: 'finance', label: 'Finance', icon: <Wallet className="size-[18px]" />, group: 'Business' },
  { key: 'marketing', label: 'Marketing', icon: <Megaphone className="size-[18px]" />, group: 'Business' },
  { key: 'branches', label: 'Branches', icon: <Building2 className="size-[18px]" />, group: 'Intelligence' },
  { key: 'reports', label: 'Reports', icon: <BarChart3 className="size-[18px]" />, group: 'Intelligence' },
  { key: 'ai-assistant', label: 'AI Assistant', icon: <Bot className="size-[18px]" />, group: 'Intelligence' },
  { key: 'settings', label: 'Settings', icon: <Settings className="size-[18px]" />, group: 'Intelligence' },
]

const groups = ['Main', 'Operations', 'Business', 'Intelligence']

// ─── Sidebar Nav Item ──────────────────────────────────────────────────────

function SidebarNavItem({
  mod,
  isActive,
  onClick,
}: {
  mod: typeof moduleConfig[number]
  isActive: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 relative',
        isActive
          ? 'text-white'
          : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]'
      )}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {isActive && (
        <motion.div
          layoutId="activeNav"
          className="absolute inset-0 rounded-xl bg-tahoe-accent shadow-lg shadow-tahoe-accent/20"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center w-5">
        {mod.icon}
      </span>
      <span className="relative z-10">{mod.label}</span>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 ml-auto"
        >
          <ChevronRight className="size-3.5 opacity-70" />
        </motion.div>
      )}
    </motion.button>
  )
}

// ─── Main App ──────────────────────────────────────────────────────────────

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
  const currentModule = moduleConfig.find((m) => m.key === activeModule)

  return (
    <div className="min-h-screen flex tahoe-bg">
      {/* ─── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden lg:flex lg:w-[260px] lg:shrink-0 lg:flex-col lg:fixed lg:inset-y-0 z-40 sidebar-vibrancy border-r border-sidebar-border">
        <div className="flex h-full flex-col">
          {/* Logo Area */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border/50">
            <motion.div
              className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/20"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <ScissorsIcon className="size-5 text-white" />
            </motion.div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">SalonFlow OS</h1>
              <p className="text-[10px] text-muted-foreground tracking-wide">ApexFlow Ecosystem</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            {groups.map((group) => (
              <div key={group}>
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {moduleConfig
                    .filter((m) => m.group === group)
                    .map((mod) => (
                      <SidebarNavItem
                        key={mod.key}
                        mod={mod}
                        isActive={activeModule === mod.key}
                        onClick={() => setActiveModule(mod.key)}
                      />
                    ))}
                </div>
              </div>
            ))}
          </nav>

          {/* User Profile */}
          <div className="border-t border-sidebar-border/50 p-4">
            <div className="flex items-center gap-3 px-2">
              <motion.div
                className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 text-white text-xs font-bold shadow-md"
                whileHover={{ scale: 1.1 }}
              >
                SF
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">SalonFlow Admin</p>
                <p className="text-[10px] text-muted-foreground truncate">admin@salonflow.pk</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Mobile Menu Overlay ──────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── Mobile Sidebar ───────────────────────────────────────────────── */}
      <AnimatePresence>
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-[280px] sidebar-vibrancy border-r border-sidebar-border transition-transform duration-300 ease-out lg:hidden',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-full flex-col">
            {/* Mobile Header */}
            <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border/50">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600">
                  <ScissorsIcon className="size-4 text-white" />
                </div>
                <h1 className="text-sm font-bold">SalonFlow OS</h1>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-foreground/5" onClick={() => setMobileMenuOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            {/* Mobile Nav */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
              {groups.map((group) => (
                <div key={group}>
                  <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
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
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
                            activeModule === mod.key
                              ? 'bg-tahoe-accent text-white shadow-md shadow-tahoe-accent/20'
                              : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]'
                          )}
                        >
                          <span className="flex items-center justify-center w-5">
                            {mod.icon}
                          </span>
                          <span>{mod.label}</span>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* Mobile User Profile */}
            <div className="border-t border-sidebar-border/50 p-4">
              <div className="flex items-center gap-3 px-2">
                <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 text-white text-xs font-bold">
                  SF
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">SalonFlow Admin</p>
                  <p className="text-[10px] text-muted-foreground truncate">admin@salonflow.pk</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </AnimatePresence>

      {/* ─── Main Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:ml-[260px] min-h-screen">
        {/* ─── Tahoe Header ─────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 header-vibrancy">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            {/* Left: Menu + Module Title */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 rounded-xl hover:bg-foreground/5 lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="size-[18px]" />
              </Button>
              <div>
                <motion.h2
                  key={activeModule}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="text-[15px] font-semibold"
                >
                  {currentModule?.label || 'Dashboard'}
                </motion.h2>
                <p className="text-[11px] text-muted-foreground hidden sm:block">{dateStr}</p>
              </div>
            </div>

            {/* Right: Search + Actions */}
            <div className="flex items-center gap-2">
              {/* macOS-style search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-9 h-9 w-52 text-sm bg-foreground/[0.03] border-border/50 rounded-xl focus-visible:ring-tahoe-accent/30 focus-visible:bg-transparent transition-all"
                />
              </div>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 relative rounded-xl hover:bg-foreground/5">
                <Bell className="size-[18px]" />
                <span className="absolute top-1 right-1 flex size-2 items-center justify-center rounded-full bg-rose-500">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-50" />
                </span>
              </Button>

              {/* Version Badge */}
              <Badge variant="outline" className="hidden text-[10px] sm:flex rounded-lg border-border/50 font-mono">
                v1.0
              </Badge>
            </div>
          </div>
        </header>

        {/* ─── Page Content ─────────────────────────────────────────────────── */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {renderModule()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ─── Sticky Footer ───────────────────────────────────────────────── */}
        <footer className="border-t border-border/50 header-vibrancy px-6 py-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="font-medium">SalonFlow OS — ApexFlow Ecosystem</span>
            <span className="font-mono">v1.0.0 Enterprise</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
