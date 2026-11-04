"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package, Users, BarChart3, Settings, LogOut, User, Brain } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

interface POSLayoutProps {
  children: ReactNode;
}

export default function POSLayout({ children }: POSLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  } | undefined;

  const navigation = [
    { name: "Cashier Dashboard", href: "/cashier", icon: ShoppingCart },
    { name: "Products", href: "/products", icon: Package },
    { name: "Inventory", href: "/inventory", icon: Package },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Employees", href: "/employees", icon: Users },
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { name: "Analytics", href: "/analytics", icon: Brain },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">POS System Pro</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-4 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${isActive ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500"}`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          {user && (
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}