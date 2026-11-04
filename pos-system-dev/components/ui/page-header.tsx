import React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-6 border-b border-slate-200/80 mb-6">
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/admin" className="hover:text-emerald-800 transition-colors">
            Home
          </Link>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-emerald-800 transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-semibold text-slate-800">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
