"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function POSRedirectPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return; // Still loading
    
    if (!session) {
      router.push("/login");
      return;
    }

    // Redirect to the new cashier POS route if user has a location
    if (session.user?.locationId) {
      router.push(`/cashier/pos/${session.user.locationId}`);
    } else {
      // If no location, redirect to cashier dashboard
      router.push("/cashier");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-lg font-semibold text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            POS System Moved
          </h1>
          <p className="text-gray-600">
            The POS system has been moved to the cashier section with store-specific access.
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            The POS system is now located at <code>/cashier/pos/[storeId]</code> for better store management.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Link href="/cashier" className="block">
            <Button className="w-full">
              Go to Cashier Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>

          {session?.user?.locationId && (
            <Link href={`/cashier/pos/${session.user.locationId}`} className="block">
              <Button variant="outline" className="w-full">
                Go Directly to POS System
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}