import React from "react"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  iconColor?: string
  trend?: {
    value: string
    isPositive?: boolean
  }
  badge?: React.ReactNode
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-emerald-700",
  trend,
  badge,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-200 group">
      <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
        <span className="truncate tracking-wide">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-xl bg-slate-50/80 border border-slate-100/80 group-hover:bg-emerald-50/50 group-hover:border-emerald-100 transition-colors ${iconColor}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-mono">
          {value}
        </div>
        {badge}
      </div>

      {(subtitle || trend) && (
        <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
          {trend && (
            <span
              className={`font-semibold ${
                trend.isPositive ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {trend.value}
            </span>
          )}
          {subtitle && <span className="truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  )
}
