"use client"

import { useState } from "react"
import { Home, Calendar, Target, ChevronDown, UserPlus, Diamond, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface LeftSidebarProps {
  onClose: () => void
  onViewChange?: (view: "kanban" | "today" | "focus" | "daily-planner") => void
  currentView?: string
}

const navItems = [
  { icon: Home, label: "Home", id: "home" },
  { icon: Calendar, label: "Today", id: "today" },
  { icon: Target, label: "Focus", id: "focus" },
]

const dailyRituals = [
  { id: "daily-planning", label: "Daily planning", premium: false },
  { id: "daily-shutdown", label: "Daily shutdown", premium: true },
  { id: "daily-highlights", label: "Daily highlights", premium: true },
]

const weeklyRituals = [
  { id: "weekly-planning", label: "Weekly planning", premium: false },
  { id: "weekly-review", label: "Weekly review", premium: false },
]

export default function LeftSidebar({ onClose, onViewChange, currentView }: LeftSidebarProps) {
  const [activeNav, setActiveNav] = useState(
    currentView === "today" ? "today" : currentView === "focus" ? "focus" : "today",
  )
  const [checkedRituals, setCheckedRituals] = useState<string[]>([])

  const toggleRitual = (id: string) => {
    setCheckedRituals((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
  }

  const handleNavClick = (id: string) => {
    setActiveNav(id)
    if (id === "today") {
      onViewChange?.("today")
    } else if (id === "focus") {
      onViewChange?.("focus")
    } else {
      onViewChange?.("kanban")
    }
  }

  const handleDailyPlanningClick = () => {
    onViewChange?.("daily-planner")
  }

  return (
    <div className="h-full w-[260px] bg-background border-r border-border flex flex-col">
      {/* Close button for mobile */}
      <button onClick={onClose} className="lg:hidden absolute top-3 right-3 p-1.5 rounded-md hover:bg-secondary">
        <X className="w-4 h-4" />
      </button>

      {/* User Profile */}
      <div className="p-4 flex items-center gap-3">
        <Avatar className="w-9 h-9">
          <AvatarImage src="/placeholder.svg?key=cq5hd" />
          <AvatarFallback className="text-xs">SU</AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-1">
          <span className="font-serif  text-md italic">Zenith</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 space-y-0.5">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={cn(
              "w-full h-10 flex items-center gap-3 px-3 rounded-md text-sm font-medium transition-colors duration-150",
              activeNav === item.id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary",
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Daily Rituals */}
      <div className="mt-8 px-4">
        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Daily Rituals</h3>
        <div className="space-y-1">
          {dailyRituals.map((ritual) => (
            <label
              key={ritual.id}
              onClick={ritual.id === "daily-planning" ? handleDailyPlanningClick : undefined}
              className="flex items-center h-8 px-2 -mx-2 rounded-md hover:bg-secondary cursor-pointer transition-colors duration-150"
            >
              <Checkbox
                checked={checkedRituals.includes(ritual.id)}
                onCheckedChange={() => toggleRitual(ritual.id)}
                className="mr-2.5 w-3.5 h-3.5"
              />
              <span className="text-sm flex-1">{ritual.label}</span>
              {ritual.premium && <Diamond className="w-3.5 h-3.5 text-amber-500" />}
            </label>
          ))}
        </div>
      </div>

      {/* Weekly Rituals */}
      <div className="mt-6 px-4">
        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Weekly Rituals
        </h3>
        <div className="space-y-1">
          {weeklyRituals.map((ritual) => (
            <label
              key={ritual.id}
              className="flex items-center h-8 px-2 -mx-2 rounded-md hover:bg-secondary cursor-pointer transition-colors duration-150"
            >
              <Checkbox
                checked={checkedRituals.includes(ritual.id)}
                onCheckedChange={() => toggleRitual(ritual.id)}
                className="mr-2.5 w-3.5 h-3.5"
              />
              <span className="text-sm">{ritual.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Invite Button */}
      <div className="p-4">
        <button className="w-full h-9 flex items-center justify-center gap-2 border border-border rounded-md text-sm font-medium hover:bg-secondary transition-colors duration-150">
          <UserPlus className="w-4 h-4" />
          Invite someone
        </button>
      </div>
    </div>
  )
}
