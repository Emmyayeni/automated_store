import React from "react"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  description?: string
  icon?: LucideIcon | React.ReactNode
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
  description,
  icon,
  iconColor = "text-emerald-700",
  trend,
  badge,
}: StatCardProps) {
  const displaySubtitle = subtitle || description

  const renderIcon = () => {
    if (!icon) return null
    if (React.isValidElement(icon)) {
      return icon
    }
    const IconComponent = icon as React.ComponentType<{ className?: string }>
    return <IconComponent className="h-4 w-4" />
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-200 group">
      <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
        <span className="truncate tracking-wide">{title}</span>
        {icon && (
          <div className={`p-2 rounded-xl bg-slate-50/80 border border-slate-100/80 group-hover:bg-emerald-50/50 group-hover:border-emerald-100 transition-colors ${iconColor}`}>
            {renderIcon()}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-mono">
          {value}
        </div>
        {badge}
      </div>

      {(displaySubtitle || trend) && (
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
          {displaySubtitle && <span className="truncate">{displaySubtitle}</span>}
        </div>
      )}
    </div>
  )
}
