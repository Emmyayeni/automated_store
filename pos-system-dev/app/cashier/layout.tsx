"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  Receipt,
  Package,
  Clock,
  Bell,
  User,
  LogOut,
  CreditCard,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";

export default function CashierLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Get cashier name from session or fallback
  const cashierName = session?.user?.name || "Cashier";
  const location = session?.user?.locationId || null;
  const [storeName, setStoreName] = useState("Main Store");

  // Create navigation items with dynamic store-specific routes
  const navigationItems = [
    { id: "sales", label: "Sales", icon: ShoppingCart, href: "/cashier" },
    { 
      id: "pos", 
      label: "POS System", 
      icon: CreditCard, 
      href: location ? `/cashier/pos/${location}` : "/cashier" 
    },
    { id: "orders", label: "Orders", icon: Receipt, href: "/cashier/orders" },
    { id: "inventory", label: "Inventory", icon: Package, href: "/cashier/inventory" },
    { id: "shift", label: "Shift", icon: Clock, href: "/cashier/shift" },
    { id: "notifications", label: "Notifications", icon: Bell, href: "/cashier/notifications" },
    { id: "profile", label: "Profile", icon: User, href: "/cashier/profile" },
  ];

  useEffect(() => {
    // Fetch store name from API
    async function fetchStoreName() {
      try {
        const res = await fetch(`/api/store/${location}`);
        if (res.ok) {
          const data = await res.json();
          setStoreName(data.name || "Main Store");
        } else {
          setStoreName("Main Store");
        }
      } catch {
        setStoreName("Main Store");
      }
    }
    
    // Don't fetch if location is null or undefined
    if (!location) {
      setStoreName("Main Store");
      return;
    }
    
    fetchStoreName();
  }, [location]); // Add location as dependency

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/40 p-4 flex flex-col">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#14532D] text-white flex items-center justify-center font-bold shadow-xs">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">{storeName}</h1>
            <p className="text-[11px] text-slate-500 font-medium">StockFlow Branch POS</p>
          </div>
        </div>
        <nav className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
              (item.id === "pos" && pathname.startsWith("/cashier/pos/"));
            return (
              <Button
                key={item.id}
                asChild
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start ${isActive ? "font-bold" : ""}`}
                disabled={item.id === "pos" && !location}
              >
                <Link href={item.href}>
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                  {item.id === "notifications" && (
                    <Badge variant="secondary" className="ml-auto">
                      {/* Example: {notificationsCount} */}
                    </Badge>
                  )}
                  {item.id === "pos" && !location && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      No Store
                    </Badge>
                  )}
                </Link>
              </Button>
            );
          })}
        </nav>
        <div className="mt-auto pt-8">
          {/* Cashier Info and Logout */}
          <div className="p-3 bg-background rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Shift Active
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Started at 09:00 AM
            </p>
          </div>
          <div className="flex items-center gap-3 mb-4 p-3 bg-background rounded-lg border">
            <User className="h-6 w-6 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">{cashierName}</div>
              <div className="text-xs text-muted-foreground">Cashier</div>
            </div>
            <Button size="icon" variant="ghost" title="Logout" asChild onClick={() => signOut()}>
                <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="p-3 flex-1 overflow-auto">{children}</div>
    </div>
  );
}