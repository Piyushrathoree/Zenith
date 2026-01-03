"use client"

import { useState } from "react"
import {
  ArrowLeft,
  Camera,
  Mail,
  Calendar,
  MapPin,
  LinkIcon,
  Github,
  Twitter,
  Save,
  Bell,
  Shield,
  CreditCard,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeProvider } from "@/components/theme-provider"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export default function ProfilePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("profile")

  // Profile form state
  const [profile, setProfile] = useState({
    name: "Piyush Rathoree",
    email: "piyush@example.com",
    username: "Piyushrathoree",
    bio: "Full-stack developer passionate about building great products.",
    location: "India",
    website: "https://piyush.dev",
    github: "Piyushrathoree",
    twitter: "piyushrathoree",
    joinedDate: "October 2024",
  })

  const tabs = [
    { id: "profile", label: "Profile", icon: null },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "billing", label: "Billing", icon: CreditCard },
  ]

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="h-14 px-4 flex items-center gap-4 border-b border-border bg-card">
          <button onClick={() => router.push("/")} className="p-2 hover:bg-secondary rounded-md transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-semibold">Profile Settings</h1>
        </header>

        <div className="max-w-4xl mx-auto p-6">
          {/* Profile header card */}
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <div className="flex items-start gap-6">
              {/* Avatar with edit button */}
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src="/placeholder.svg?key=s1d9u" />
                  <AvatarFallback className="text-2xl">PR</AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors">
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Profile info */}
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{profile.name}</h2>
                <p className="text-muted-foreground">@{profile.username}</p>
                <p className="text-sm text-muted-foreground mt-2">{profile.bio}</p>

                <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {profile.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Joined {profile.joinedDate}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold">127</p>
                  <p className="text-xs text-muted-foreground">Tasks Done</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">24</p>
                  <p className="text-xs text-muted-foreground">Streak Days</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">156h</p>
                  <p className="text-xs text-muted-foreground">Focus Time</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "profile" && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-6">Edit Profile</h3>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-secondary rounded-md border border-border outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Username</label>
                    <input
                      type="text"
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-secondary rounded-md border border-border outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Email</label>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="flex-1 px-3 py-2 text-sm bg-secondary rounded-md border border-border outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-secondary rounded-md border border-border outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Location</label>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={profile.location}
                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                        className="flex-1 px-3 py-2 text-sm bg-secondary rounded-md border border-border outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Website</label>
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-muted-foreground" />
                      <input
                        type="url"
                        value={profile.website}
                        onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                        className="flex-1 px-3 py-2 text-sm bg-secondary rounded-md border border-border outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">GitHub</label>
                    <div className="flex items-center gap-2">
                      <Github className="w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={profile.github}
                        onChange={(e) => setProfile({ ...profile, github: e.target.value })}
                        className="flex-1 px-3 py-2 text-sm bg-secondary rounded-md border border-border outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Twitter</label>
                    <div className="flex items-center gap-2">
                      <Twitter className="w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={profile.twitter}
                        onChange={(e) => setProfile({ ...profile, twitter: e.target.value })}
                        className="flex-1 px-3 py-2 text-sm bg-secondary rounded-md border border-border outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-6">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  { label: "Email notifications", description: "Receive daily digest and important updates" },
                  { label: "Push notifications", description: "Get notified about task reminders" },
                  { label: "Weekly summary", description: "Receive a weekly productivity report" },
                  { label: "Integration alerts", description: "Get notified about GitHub, Gmail updates" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <input type="checkbox" defaultChecked={i < 2} className="w-4 h-4 accent-primary" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-6">Security Settings</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Change Password</label>
                  <div className="space-y-3">
                    <input
                      type="password"
                      placeholder="Current password"
                      className="w-full px-3 py-2 text-sm bg-secondary rounded-md border border-border outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <input
                      type="password"
                      placeholder="New password"
                      className="w-full px-3 py-2 text-sm bg-secondary rounded-md border border-border outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      className="w-full px-3 py-2 text-sm bg-secondary rounded-md border border-border outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                  Update Password
                </button>
              </div>
            </div>
          )}

          {activeTab === "billing" && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-6">Billing & Subscription</h3>
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Pro Plan</p>
                    <p className="text-sm text-muted-foreground">Billed monthly</p>
                  </div>
                  <p className="text-2xl font-bold">
                    $12<span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                </div>
              </div>
              <button className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-secondary transition-colors">
                Manage Subscription
              </button>
            </div>
          )}
        </div>
      </div>
    </ThemeProvider>
  )
}
