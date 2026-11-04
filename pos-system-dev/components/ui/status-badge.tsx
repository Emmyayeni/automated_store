import React from "react"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  Truck,
  Shield,
  User,
  Package,
  Layers,
  Store,
  CreditCard
} from "lucide-react"

export type StockStatusType = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | string;
export type TransferStatusType = "REQUESTED" | "APPROVED" | "IN_TRANSIT" | "COMPLETED" | "RECEIVED" | "REJECTED" | "CANCELLED" | string;
export type MovementType = "STOCK_IN" | "STOCK_OUT" | "TRANSFER" | "ADJUSTMENT" | string;
export type RoleType = "ADMIN" | "BRANCH_MANAGER" | "MANAGER" | "CLERK" | "CASHIER" | string;

export function StockStatusBadge({ status }: { status: StockStatusType }) {
  const norm = (status || "").toUpperCase();
  if (norm === "IN_STOCK") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
        In Stock
      </span>
    );
  }
  if (norm === "LOW_STOCK") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
        Low Stock
      </span>
    );
  }
  if (norm === "OUT_OF_STOCK" || norm === "CRITICAL") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
        Out of Stock
      </span>
    );
  }
  return <Badge variant="outline">{status}</Badge>;
}

export function TransferStatusBadge({ status }: { status: TransferStatusType }) {
  const norm = (status || "").toUpperCase();
  switch (norm) {
    case "REQUESTED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
          <Clock className="w-3 h-3" /> Requested
        </span>
      );
    case "APPROVED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
          <CheckCircle2 className="w-3 h-3" /> Approved
        </span>
      );
    case "IN_TRANSIT":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
          <Truck className="w-3 h-3" /> In Transit
        </span>
      );
    case "RECEIVED":
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" /> Completed
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
          <XCircle className="w-3 h-3" /> Rejected
        </span>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function MovementTypeBadge({ type }: { type: MovementType }) {
  const norm = (type || "").toUpperCase();
  if (norm === "STOCK_IN") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
        ↓ Stock In
      </span>
    );
  }
  if (norm === "STOCK_OUT") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
        ↑ Stock Out
      </span>
    );
  }
  if (norm === "TRANSFER") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
        ↔ Transfer
      </span>
    );
  }
  return <Badge variant="secondary">{type}</Badge>;
}

export function RoleBadge({ role }: { role: RoleType }) {
  const norm = (role || "").toUpperCase();
  if (norm === "ADMIN") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300">
        👑 Admin
      </span>
    );
  }
  if (norm === "BRANCH_MANAGER" || norm === "MANAGER") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-900 border border-blue-200">
        🏢 Branch Manager
      </span>
    );
  }
  if (norm === "CLERK") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200">
        📦 Inventory Clerk
      </span>
    );
  }
  if (norm === "CASHIER") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-900 border border-purple-200">
        💳 Cashier
      </span>
    );
  }
  return <Badge variant="outline">{role}</Badge>;
}
