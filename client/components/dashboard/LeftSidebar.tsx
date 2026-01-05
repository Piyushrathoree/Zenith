import {
  Home,
  Calendar,
  Target,
  UserPlus,
  ChevronDown,
  ChevronRight,
  CalendarCheck,
  TrendingUp,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { WeeklyRitualsPanel } from "./panels/WeeklyRitualsPanel";
export function LeftSidebar() {
  const {
    setShowTodayPanel,
    setShowDailyPlanner,
    setFocusMode,
    setShowWeeklyRituals,
    showTodayPanel,
    showWeeklyRituals,
    weeklyRitualType,
    focusMode,
  } = useApp();
  const navItems = [
    {
      icon: Home,
      label: "Home",
      active: false,
      onClick: () => {},
    },
    {
      icon: Calendar,
      label: "Today",
      active: showTodayPanel,
      onClick: () => setShowTodayPanel(true),
    },
    {
      icon: Target,
      label: "Focus",
      active: focusMode,
      onClick: () => setFocusMode(true),
    },
  ];
  const dailyRituals = [
    {
      id: "planning",
      label: "Daily planning",
      onClick: () => setShowDailyPlanner(true),
    },
    {
      id: "shutdown",
      label: "Daily shutdown",
      onClick: () => setShowDailyPlanner(true),
    },
    {
      id: "highlights",
      label: "Daily highlights",
      onClick: () => setShowDailyPlanner(true),
    },
  ];
  const weeklyRituals = [
    {
      id: "weekly-planning",
      label: "Weekly planning",
      icon: CalendarCheck,
      description: "Plan your week ahead",
      onClick: () => setShowWeeklyRituals(true, "planning"),
    },
    {
      id: "weekly-review",
      label: "Weekly review",
      icon: TrendingUp,
      description: "Review your progress",
      onClick: () => setShowWeeklyRituals(true, "review"),
    },
  ];
  return (
    <>
      <aside className="w-sidebar h-screen flex flex-col bg-card border-r border-border overflow-hidden">
        {/* User Profile */}
        <div className="p-4 border-b border-border">
          <button className="flex items-center gap-3 w-full hover:bg-muted rounded-lg p-2 transition-colors">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-accent font-semibold text-sm">​Z</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">​Zenith</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <motion.button
              key={item.label}
              onClick={item.onClick}
              whileHover={{
                scale: 1.01,
              }}
              whileTap={{
                scale: 0.99,
              }}
              className={cn("sidebar-nav-item w-full", item.active && "active")}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </motion.button>
          ))}
        </nav>

        {/* Daily Rituals */}
        <div className="px-4 py-3">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Daily Rituals
          </h3>
          <div className="space-y-1">
            {dailyRituals.map((ritual) => (
              <button
                key={ritual.id}
                onClick={ritual.onClick}
                className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-muted transition-colors group"
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
                <span className="text-sm text-foreground flex-1 text-left">
                  {ritual.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Weekly Rituals */}
        <div className="px-4 py-3">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Weekly Rituals
          </h3>
          <div className="space-y-2">
            {weeklyRituals.map((ritual) => (
              <motion.button
                key={ritual.id}
                onClick={ritual.onClick}
                whileHover={{
                  scale: 1.01,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                className="flex items-center gap-3 w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-all group border border-transparent hover:border-accent/20"
              >
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <ritual.icon className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">
                    {ritual.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ritual.description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Invite Button */}
        <div className="p-4 border-t border-border">
          <button className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors">
            <UserPlus className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Invite someone
            </span>
          </button>
        </div>
      </aside>

      {/* Weekly Rituals Panel */}
      <WeeklyRitualsPanel
        isOpen={showWeeklyRituals}
        onClose={() => setShowWeeklyRituals(false)}
        type={weeklyRitualType}
      />
    </>
  );
}
