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

  // Dynamic typography to prevent overflow on long numbers and currencies (e.g. ₦3,301,300.00)
  const valStr = String(value ?? "")
  const isExtraLong = valStr.length > 14
  const isLong = valStr.length > 10
  const isMedium = valStr.length > 7

  const valueSizeClass = isExtraLong
    ? "text-base sm:text-lg font-bold"
    : isLong
    ? "text-lg sm:text-xl font-extrabold"
    : isMedium
    ? "text-xl sm:text-2xl font-black"
    : "text-2xl sm:text-3xl font-black"

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-5 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-200 group overflow-hidden flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold gap-1">
          <span className="truncate tracking-wide">{title}</span>
          {icon && (
            <div className={`p-1.5 sm:p-2 rounded-xl bg-slate-50/80 border border-slate-100/80 group-hover:bg-emerald-50/50 group-hover:border-emerald-100 transition-colors shrink-0 ${iconColor}`}>
              {renderIcon()}
            </div>
          )}
        </div>

        <div className="mt-2.5 sm:mt-3 flex items-baseline justify-between gap-1.5 overflow-hidden">
          <div
            title={typeof value === "string" ? value : undefined}
            className={`${valueSizeClass} tracking-tight text-slate-900 font-mono truncate`}
          >
            {value}
          </div>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
      </div>

      {(displaySubtitle || trend) && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 overflow-hidden">
          {trend && (
            <span
              className={`font-semibold shrink-0 ${
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
