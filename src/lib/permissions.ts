'use client'

import { createContext, useContext } from 'react'

export type UserRole = 'owner' | 'admin' | 'manager' | 'staff' | 'viewer'

interface PermissionsContextType {
  role: UserRole
  canEdit: boolean
  canDelete: boolean
  canCreate: boolean
  canManageUsers: boolean
  canAccessOwnerPanel: boolean
  canAccessSettings: boolean
  isViewer: boolean
  isOwner: boolean
}

const defaultPermissions: PermissionsContextType = {
  role: 'viewer',
  canEdit: false,
  canDelete: false,
  canCreate: false,
  canManageUsers: false,
  canAccessOwnerPanel: false,
  canAccessSettings: false,
  isViewer: true,
  isOwner: false,
}

export function getPermissions(role: string): PermissionsContextType {
  const r = role as UserRole
  switch (r) {
    case 'owner':
      return {
        role: r,
        canEdit: true,
        canDelete: true,
        canCreate: true,
        canManageUsers: true,
        canAccessOwnerPanel: true,
        canAccessSettings: true,
        isViewer: false,
        isOwner: true,
      }
    case 'admin':
      return {
        role: r,
        canEdit: true,
        canDelete: true,
        canCreate: true,
        canManageUsers: true,
        canAccessOwnerPanel: false,
        canAccessSettings: true,
        isViewer: false,
        isOwner: false,
      }
    case 'manager':
      return {
        role: r,
        canEdit: true,
        canDelete: false,
        canCreate: true,
        canManageUsers: false,
        canAccessOwnerPanel: false,
        canAccessSettings: false,
        isViewer: false,
        isOwner: false,
      }
    case 'staff':
      return {
        role: r,
        canEdit: false,
        canDelete: false,
        canCreate: false,
        canManageUsers: false,
        canAccessOwnerPanel: false,
        canAccessSettings: false,
        isViewer: false,
        isOwner: false,
      }
    case 'viewer':
    default:
      return defaultPermissions
  }
}

export const PermissionsContext = createContext<PermissionsContextType>(defaultPermissions)

export function usePermissions() {
  return useContext(PermissionsContext)
}
