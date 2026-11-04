"use client"

import { useSession } from "next-auth/react"
import { hasPermission, type Role, type Permission } from "@/lib/roles"

export function usePermissions() {
  const { data: session } = useSession()
  
  const userRole = session?.user?.role as Role
  
  const checkPermission = (permission: string): boolean => {
    if (!userRole) return false
    return hasPermission(userRole, permission as Permission)
  }

  const canAddProducts = () => checkPermission("add_products")
  const canEditProducts = () => checkPermission("edit_products") 
  const canDeleteProducts = () => checkPermission("delete_products")
  const canRegisterProducts = () => checkPermission("register_products")
  const canManageInventory = () => checkPermission("manage_inventory")
  const canProcessTransactions = () => checkPermission("process_transactions")
  const canScanProducts = () => checkPermission("scan_products")

  return {
    userRole,
    checkPermission,
    canAddProducts,
    canEditProducts,
    canDeleteProducts,
    canRegisterProducts,
    canManageInventory,
    canProcessTransactions,
    canScanProducts,
  }
}
