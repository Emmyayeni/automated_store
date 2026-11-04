"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Mail, RefreshCw, Receipt } from "lucide-react";

type Transaction = {
  id: string;
  date: string;
  time: string;
  items: number;
  total: number;
  paymentMethod: string;
  status: string;
};

export default function OrdersPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        // Replace with your actual API endpoint for fetching transactions by user
        const res = await fetch(`/api/transactions?userId=${session?.user?.id}`);
        const data = await res.json();
        // Map/format data as needed for your table
        setTransactions(
          data.map((t: any) => ({
            id: t.id,
            date: t.date || "",
            time: t.time || "",
            items: t.items || 0,
            total: typeof t.total === "string" ? parseFloat(t.total) : t.total,
            paymentMethod: t.paymentMethod,
            status: t.status,
          }))
        );
      } catch (error) {
        setTransactions([]);
      }
      setLoading(false);
    };
    if (session?.user?.id) {
      fetchTransactions();
    }
  }, [session?.user?.id]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Orders</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Your Transactions
          </CardTitle>
          <CardDescription>View and manage your past sales</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.id}</TableCell>
                    <TableCell>{transaction.time}</TableCell>
                    <TableCell>{transaction.items}</TableCell>
                    <TableCell>${transaction.total.toFixed(2)}</TableCell>
                    <TableCell>{transaction.paymentMethod}</TableCell>
                    <TableCell>
                      <Badge variant={transaction.status === "Completed" ? "default" : "destructive"}>
                        {transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline">
                          <Printer className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Mail className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}