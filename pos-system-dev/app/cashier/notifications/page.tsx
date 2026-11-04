"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Bell, AlertTriangle, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Notification = {
  id: number;
  type: "warning" | "info" | "success";
  message: string;
  time: string;
};

const notifications: Notification[] = [
  { id: 1, type: "warning", message: "Low stock alert: Coffee Beans (5 remaining)", time: "2 min ago" },
  { id: 2, type: "info", message: "Shift ends in 30 minutes", time: "5 min ago" },
  { id: 3, type: "success", message: "Daily sales target achieved!", time: "1 hour ago" },
];

export default function NotificationsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Notifications</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div key={notification.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <div
                  className={`p-1 rounded-full ${
                    notification.type === "warning"
                      ? "bg-yellow-100 text-yellow-600"
                      : notification.type === "success"
                        ? "bg-green-100 text-green-600"
                        : "bg-blue-100 text-blue-600"
                  }`}
                >
                  {notification.type === "warning" ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : notification.type === "success" ? (
                    <DollarSign className="h-4 w-4" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">{notification.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}