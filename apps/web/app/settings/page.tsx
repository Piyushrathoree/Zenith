"use client"

import { useState } from "react"
import { ArrowLeft, Sun, Moon, Monitor, Github, Mail, FileText, Trash2, Download, RefreshCw } from "lucide-react"
import { ThemeProvider, useTheme } from "@/components/theme-provider"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

function SettingsContent() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [activeSection, setActiveSection] = useState("general")

  const sections = [
    { id: "general", label: "General" },
    { id: "appearance", label: "Appearance" },
    { id: "integrations", label: "Integrations" },
    { id: "calendar", label: "Calendar" },
    { id: "data", label: "Data & Privacy" },
  ]

  const integrations = [
    { id: "github", name: "GitHub", icon: Github, connected: true, description: "Sync issues and PRs" },
    { id: "gmail", name: "Gmail", icon: Mail, connected: true, description: "Import emails as tasks" },
    { id: "notion", name: "Notion", icon: FileText, connected: false, description: "Sync Notion pages" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 px-4 flex items-center gap-4 border-b border-border bg-card">
        <button onClick={() => router.push("/")} className="p-2 hover:bg-secondary rounded-md transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-semibold">Settings</h1>
      </header>

      <div className="flex max-w-5xl mx-auto">
        {/* Sidebar */}
        <aside className="w-56 p-4 border-r border-border min-h-[calc(100vh-56px)]">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full px-3 py-2 text-sm font-medium text-left rounded-md transition-colors",
                  activeSection === section.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                )}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6">
          {activeSection === "general" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">General Settings</h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Default view</p>
                      <p className="text-xs text-muted-foreground">Choose what to see when you open the app</p>
                    </div>
                    <select className="px-3 py-1.5 text-sm bg-secondary rounded-md border border-border outline-none">
                      <option>Today</option>
                      <option>Board</option>
                      <option>Focus</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Week starts on</p>
                      <p className="text-xs text-muted-foreground">Set the first day of the week</p>
                    </div>
                    <select className="px-3 py-1.5 text-sm bg-secondary rounded-md border border-border outline-none">
                      <option>Sunday</option>
                      <option>Monday</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Time format</p>
                      <p className="text-xs text-muted-foreground">12-hour or 24-hour clock</p>
                    </div>
                    <select className="px-3 py-1.5 text-sm bg-secondary rounded-md border border-border outline-none">
                      <option>12-hour (AM/PM)</option>
                      <option>24-hour</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Timezone</p>
                      <p className="text-xs text-muted-foreground">Your current timezone</p>
                    </div>
                    <select className="px-3 py-1.5 text-sm bg-secondary rounded-md border border-border outline-none">
                      <option>Asia/Kolkata (GMT+5:30)</option>
                      <option>America/New_York (GMT-5)</option>
                      <option>Europe/London (GMT)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "appearance" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Appearance</h2>

                <div className="space-y-4">
                  <div className="p-4 bg-card border border-border rounded-lg">
                    <p className="font-medium text-sm mb-3">Theme</p>
                    <div className="flex gap-3">
                      {[
                        { value: "light", label: "Light", icon: Sun },
                        { value: "dark", label: "Dark", icon: Moon },
                        { value: "system", label: "System", icon: Monitor },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setTheme(option.value as "light" | "dark")}
                          className={cn(
                            "flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border transition-all",
                            theme === option.value
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-muted-foreground",
                          )}
                        >
                          <option.icon className="w-5 h-5" />
                          <span className="text-sm">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Compact mode</p>
                      <p className="text-xs text-muted-foreground">Use smaller spacing and fonts</p>
                    </div>
                    <input type="checkbox" className="w-4 h-4 accent-primary" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Show task counts</p>
                      <p className="text-xs text-muted-foreground">Display number of tasks per column</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-primary" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "integrations" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Integrations</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your favorite tools to sync tasks and stay productive.
                </p>

                <div className="space-y-3">
                  {integrations.map((integration) => (
                    <div
                      key={integration.id}
                      className="flex items-center justify-between p-4 bg-card border border-border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                          <integration.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{integration.name}</p>
                          <p className="text-xs text-muted-foreground">{integration.description}</p>
                        </div>
                      </div>
                      {integration.connected ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-emerald-500 font-medium">Connected</span>
                          <button className="p-1.5 hover:bg-secondary rounded transition-colors">
                            <RefreshCw className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                      ) : (
                        <button className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                          Connect
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === "calendar" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Calendar Settings</h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Sync with Google Calendar</p>
                      <p className="text-xs text-muted-foreground">Import calendar events as tasks</p>
                    </div>
                    <button className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                      Connect
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Show weekends</p>
                      <p className="text-xs text-muted-foreground">Display Saturday and Sunday in board view</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-primary" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Working hours</p>
                      <p className="text-xs text-muted-foreground">Set your typical work schedule</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="time"
                        defaultValue="09:00"
                        className="px-2 py-1 bg-secondary rounded border border-border"
                      />
                      <span>to</span>
                      <input
                        type="time"
                        defaultValue="18:00"
                        className="px-2 py-1 bg-secondary rounded border border-border"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "data" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Data & Privacy</h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Export data</p>
                      <p className="text-xs text-muted-foreground">Download all your tasks and settings</p>
                    </div>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-secondary transition-colors">
                      <Download className="w-3.5 h-3.5" />
                      Export
                    </button>
                  </div>

                  <div className="p-4 bg-card border border-destructive/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-destructive">Delete account</p>
                        <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
                      </div>
                      <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <ThemeProvider>
      <SettingsContent />
    </ThemeProvider>
  )
}
