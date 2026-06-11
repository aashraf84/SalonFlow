import { create } from 'zustand'

export type SalonModule = 
  | 'dashboard'
  | 'appointments'
  | 'customers'
  | 'services'
  | 'staff'
  | 'memberships'
  | 'loyalty'
  | 'pos'
  | 'inventory'
  | 'finance'
  | 'marketing'
  | 'branches'
  | 'rooms'
  | 'ai-assistant'
  | 'reports'
  | 'settings'
  | 'gift-cards'
  | 'notifications'
  | 'feedback'
  | 'scheduling'
  | 'commissions'
  | 'waitlist'
  | 'owner'

interface SalonStore {
  activeModule: SalonModule
  sidebarCollapsed: boolean
  setActiveModule: (module: SalonModule) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useSalonStore = create<SalonStore>((set) => ({
  activeModule: 'dashboard',
  sidebarCollapsed: false,
  setActiveModule: (module) => set({ activeModule: module }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}))
