"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { User, Settings } from "lucide-react";

// Centered modal component
function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="flex items-center justify-center w-full h-full">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm relative">
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      // Replace with your API endpoint
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Password changed successfully.");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setShowPasswordModal(false), 1200);
      } else {
        setMessage(data.error || "Failed to change password.");
      }
    } catch {
      setMessage("Failed to change password.");
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Profile</h2>
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              My Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="w-20 h-20 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                <User className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">John Doe</h3>
              <p className="text-sm text-muted-foreground">Cashier</p>
            </div>
            <Separator />
            <div className="space-y-3">
              <div>
                <Label htmlFor="employee-id">Employee ID</Label>
                <Input id="employee-id" value="EMP001" disabled />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value="john.doe@company.com" disabled />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value="+1 (555) 123-4567" disabled />
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => setShowPasswordModal(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Change Password
              </Button>
              <Button variant="outline" className="w-full bg-transparent">
                <Settings className="h-4 w-4 mr-2" />
                Change PIN
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Modal open={showPasswordModal} onClose={() => setShowPasswordModal(false)}>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <h3 className="text-lg font-semibold mb-2">Change Password</h3>
          <div>
            <Label htmlFor="old-password">Current Password</Label>
            <Input
              id="old-password"
              type="password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {message && (
            <div className="text-sm text-center text-red-500">{message}</div>
          )}
          <div className="flex gap-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Change Password"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}