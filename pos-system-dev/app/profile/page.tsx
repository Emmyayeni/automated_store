"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useSession, signOut } from "next-auth/react"
import { Camera, Save, LogOut } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export default function ProfilePage() {
  const { data: session } = useSession()
  const user = session?.user
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")

  const handleSave = () => {
    toast.success("Profile updated successfully!")
  }

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false })
    } catch (err) {
      console.error("Sign out error:", err)
    } finally {
      window.location.href = "/login"
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.image || "/placeholder.svg"} />
                <AvatarFallback className="text-lg">{user.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm">
                <Camera className="mr-2 h-4 w-4" />
                Change Photo
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="capitalize">
                  {(user as any)?.role || "User"}
                </Badge>
                <span className="text-sm text-muted-foreground">Contact your administrator to change roles</span>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input id="current-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input id="confirm-password" type="password" />
            </div>
            <Button variant="outline">Update Password</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
