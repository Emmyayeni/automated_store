"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Clock, 
  LogIn, 
  LogOut, 
  Printer, 
  DollarSign, 
  BarChart3, 
  FileText,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users,
  Receipt
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatPrice, formatDisplayDate, formatDisplayDateTime } from "@/lib/standards/formatting";

type Shift = {
  id: string;
  userId: string;
  locationId: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: number | null;
  closingCash: number | null;
  status: "open" | "closed";
  notes: string | null;
  userName: string;
  locationName: string;
};

type ShiftSummary = {
  shift: Shift;
  summary: {
    totalTransactions: number;
    totalSales: number;
    totalTax: number;
    totalDiscount: number;
    cashVariance: number | null;
  };
  paymentBreakdown: Array<{
    paymentMethod: string;
    count: number;
    total: number;
  }>;
  hourlySales: Array<{
    hour: number;
    count: number;
    total: number;
  }>;
  topProducts: Array<{
    productName: string;
    quantitySold: number;
    revenue: number;
  }>;
};

export default function ShiftManagement() {
  const { data: session } = useSession();
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [shiftHistory, setShiftHistory] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [notes, setNotes] = useState("");
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [shiftSummary, setShiftSummary] = useState<ShiftSummary | null>(null);
  const [processing, setProcessing] = useState(false);

  const userId = session?.user?.id;
  const locationId = session?.user?.locationId;

  useEffect(() => {
    if (userId && locationId) {
      fetchShifts();
    }
  }, [userId, locationId]);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      // Fetch current active shift
      const activeResponse = await fetch(`/api/shifts?userId=${userId}&locationId=${locationId}&active=true`);
      const activeJson = await activeResponse.json().catch(() => []);
      const activeShifts = Array.isArray(activeJson) ? activeJson : (activeJson?.data || []);
      setCurrentShift(activeShifts.length > 0 ? activeShifts[0] : null);

      // Fetch shift history
      const historyResponse = await fetch(`/api/shifts?userId=${userId}&locationId=${locationId}`);
      const historyJson = await historyResponse.json().catch(() => []);
      const allShifts = Array.isArray(historyJson) ? historyJson : (historyJson?.data || []);
      setShiftHistory(allShifts.filter((shift: Shift) => shift.status === "closed").slice(0, 5));
    } catch (error) {
      console.error("Error fetching shifts:", error);
    } finally {
      setLoading(false);
    }
  };

  const startShift = async () => {
    if (!locationId) {
      toast({
        title: "Error",
        description: "Location not found",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          openingCash: parseFloat(openingCash) || 0,
          notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start shift");
      }

      const newShift = await response.json();
      setCurrentShift(newShift);
      setOpeningCash("");
      setNotes("");
      
      toast({
        title: "Shift Started",
        description: "Your shift has been started successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const closeShift = async () => {
    if (!currentShift) return;

    setProcessing(true);
    try {
      const response = await fetch("/api/shifts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentShift.id,
          closingCash: parseFloat(closingCash) || 0,
          notes,
          printSummary: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to close shift");
      }

      const result = await response.json();
      setCurrentShift(null);
      setClosingCash("");
      setNotes("");
      setShowCloseDialog(false);
      
      // Show shift summary if available
      if (result.shiftSummary) {
        setShiftSummary(result.shiftSummary);
        setShowSummaryDialog(true);
        
        // Auto-print summary
        printShiftSummary(result.shiftSummary);
      }

      fetchShifts(); // Refresh history
      
      toast({
        title: "Shift Closed",
        description: "Your shift has been closed and summary printed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const printShiftSummary = async (summary: ShiftSummary) => {
    try {
      const response = await fetch("/api/printer/thermal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "shift_summary",
          data: summary,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        toast({
          title: "Print Warning",
          description: "Summary generated but printing failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Print error:", error);
    }
  };

  const viewShiftSummary = async (shiftId: string) => {
    try {
      const response = await fetch(`/api/shifts/${shiftId}/summary`);
      if (response.ok) {
        const summary = await response.json();
        setShiftSummary(summary);
        setShowSummaryDialog(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load shift summary",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (start: string, end?: string | null) => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const diffMs = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatCurrency = (amount: number | null) => {
    return formatPrice(amount || 0);
  };

  if (loading) {
    return <div className="text-center py-8">Loading shift data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Shift Management</h2>
        <Badge variant={currentShift ? "default" : "secondary"}>
          {currentShift ? "On Shift" : "Off Shift"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Shift Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Current Shift
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentShift ? (
              <>
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Start Time:</span>
                  <span>{formatDisplayDateTime(currentShift.openedAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Duration:</span>
                  <span>{formatDuration(currentShift.openedAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Opening Cash:</span>
                  <span>{formatCurrency(currentShift.openingCash)}</span>
                </div>
                <Separator />
                <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={processing}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Close Shift
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Close Shift</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Closing Cash Amount *
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={closingCash}
                          onChange={(e) => setClosingCash(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Notes (optional)
                        </label>
                        <Textarea
                          placeholder="Any notes about this shift..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={closeShift} 
                          disabled={processing || !closingCash}
                          className="flex-1"
                        >
                          {processing ? "Closing..." : "Close Shift & Print Summary"}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowCloseDialog(false)}
                          disabled={processing}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <>
                <div className="text-center py-4 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  No active shift
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Opening Cash Amount
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={openingCash}
                      onChange={(e) => setOpeningCash(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Notes (optional)
                    </label>
                    <Textarea
                      placeholder="Any notes for this shift..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <Button 
                    onClick={startShift} 
                    disabled={processing}
                    className="w-full"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    {processing ? "Starting..." : "Start Shift"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Shift History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {shiftHistory.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  No previous shifts
                </div>
              ) : (
                shiftHistory.map((shift) => (
                  <Card key={shift.id} className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Closed</Badge>
                        <span className="text-sm font-medium">
                          {formatDisplayDate(shift.openedAt)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewShiftSummary(shift.id)}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Duration: {formatDuration(shift.openedAt, shift.closedAt)}</div>
                      <div>Opening: {formatCurrency(shift.openingCash)}</div>
                      <div>Closing: {formatCurrency(shift.closingCash)}</div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shift Summary Dialog */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Shift Summary
            </DialogTitle>
          </DialogHeader>
          {shiftSummary && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Shift Details</h4>
                  <div className="space-y-1 text-sm">
                    <div>Cashier: {shiftSummary.shift.userName}</div>
                    <div>Location: {shiftSummary.shift.locationName}</div>
                    <div>Duration: {formatDuration(shiftSummary.shift.openedAt, shiftSummary.shift.closedAt)}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Sales Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div>Transactions: {shiftSummary.summary.totalTransactions}</div>
                    <div>Total Sales: {formatCurrency(shiftSummary.summary.totalSales)}</div>
                    <div>Tax Collected: {formatCurrency(shiftSummary.summary.totalTax)}</div>
                  </div>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div>
                <h4 className="font-medium mb-2">Payment Methods</h4>
                <div className="grid grid-cols-2 gap-2">
                  {shiftSummary.paymentBreakdown.map((payment) => (
                    <div key={payment.paymentMethod} className="flex justify-between text-sm">
                      <span className="capitalize">{payment.paymentMethod}:</span>
                      <span>{formatCurrency(payment.total)} ({payment.count})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cash Reconciliation */}
              {shiftSummary.summary.cashVariance !== null && (
                <div>
                  <h4 className="font-medium mb-2">Cash Reconciliation</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Opening: {formatCurrency(shiftSummary.shift.openingCash)}</div>
                    <div>Closing: {formatCurrency(shiftSummary.shift.closingCash)}</div>
                    <div className={`col-span-2 ${Math.abs(shiftSummary.summary.cashVariance) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                      Variance: {formatCurrency(shiftSummary.summary.cashVariance)}
                      {Math.abs(shiftSummary.summary.cashVariance) < 0.01 && " ✓ Balanced"}
                    </div>
                  </div>
                </div>
              )}

              {/* Top Products */}
              <div>
                <h4 className="font-medium mb-2">Top Products</h4>
                <div className="space-y-2">
                  {shiftSummary.topProducts.slice(0, 5).map((product, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{product.productName}</span>
                      <span>Qty: {product.quantitySold} | {formatCurrency(product.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => printShiftSummary(shiftSummary)}
                  variant="outline"
                  className="flex-1"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Summary
                </Button>
                <Button 
                  onClick={() => setShowSummaryDialog(false)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
