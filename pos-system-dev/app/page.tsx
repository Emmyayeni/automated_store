import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Metadata } from "next";
import { authOptions } from "@/lib/auth";
import { ROLE_DASHBOARD_PATH } from "@/lib/roles";
import LandingPage from "@/components/marketing/landing-page";

export const metadata: Metadata = {
  title: "Automated Inventory Control System | Multi-Branch Inventory Management",
  description: "Manage products, monitor stock levels, coordinate stock transfers and track inventory across multiple supermarket branches with a centralized inventory management system.",
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  console.log("=== Homepage Debug ===");
  console.log("Session exists:", !!session);
  console.log("User exists:", !!session?.user);
  
  // If user is authenticated, redirect to their role-specific dashboard
  if (session?.user) {
    const user = session.user as any; // Cast to access custom properties
    const userRole = user.role;
    
    console.log("User role:", userRole);
    console.log("Available dashboard paths:", ROLE_DASHBOARD_PATH);
    
    if (userRole) {
      // Try uppercase first (primary), then lowercase (fallback)
      const dashboardPath = ROLE_DASHBOARD_PATH[userRole] || ROLE_DASHBOARD_PATH[userRole.toLowerCase()];
      
      console.log("Resolved dashboard path:", dashboardPath);
      
      if (dashboardPath) {
        console.log("Redirecting to:", dashboardPath);
        redirect(dashboardPath);
      } else {
        // Fallback: if role not found, default to cashier
        console.warn(`Unknown role: ${userRole}, defaulting to cashier`);
        redirect("/cashier");
      }
    } else {
      console.log("No role found for user");
    }
  }

  console.log("Showing landing page for non-authenticated user");
  // Show marketing landing page for non-authenticated users
  return <LandingPage />;
}