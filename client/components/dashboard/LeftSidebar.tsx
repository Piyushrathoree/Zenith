import {
  Home,
  Calendar,
  Target,
  ChevronDown,
  ChevronRight,
  CalendarCheck,
  TrendingUp,
  LogOut,
  Settings,
  User,
  Sunrise,
  Moon,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { useApp } from "@/context/AppContext";
import { useAuthStore } from "@/store/useAuthStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { WeeklyRitualsPanel } from "./panels/WeeklyRitualsPanel";
import { ZenithLogo } from "@/components/brand/ZenithLogo";

export function LeftSidebar() {
  const router = useRouter();
  const {
    setShowTodayPanel,
    setShowDailyPlanner,
    setFocusMode,
    setShowWeeklyRituals,
    showTodayPanel,
    showWeeklyRituals,
    weeklyRitualType,
    focusMode,
    focusMinimized,
    focusRunning,
    setShowCreateModal,
    tasks,
  } = useApp();
  const logout = useAuthStore((state) => state.logout);
  const userEmail = useAuthStore((state) => state.user?.email);

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todayTasks = tasks.filter((task) => task.date === todayKey);
  const todayDone = todayTasks.filter((task) => task.completed).length;
  const todayTotal = todayTasks.length;
  const todayProgress = todayTotal === 0 ? 0 : (todayDone / todayTotal) * 100;

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    router.replace("/login");
  };

  const navItems = [
    {
      icon: Home,
      label: "Home",
      active: false,
      iconClass: "text-brand",
      onClick: () => router.push("/dashboard"),
    },
    {
      icon: Calendar,
      label: "Today",
      active: showTodayPanel,
      iconClass: "text-tag-personal",
      onClick: () => setShowTodayPanel(true),
    },
    {
      icon: Target,
      label: "Focus",
      active: focusMode || focusMinimized || focusRunning,
      iconClass: "text-tag-health",
      onClick: () => setFocusMode(true),
    },
  ];
  const dailyRituals = [
    {
      id: "planning",
      label: "Daily planning",
      icon: Sunrise,
      iconClass: "text-tag-work",
      onClick: () => setShowDailyPlanner(true),
    },
    {
      id: "shutdown",
      label: "Daily shutdown",
      icon: Moon,
      iconClass: "text-tag-personal",
      onClick: () => setShowDailyPlanner(true),
    },
    {
      id: "highlights",
      label: "Daily highlights",
      icon: Sparkles,
      iconClass: "text-tag-health",
      onClick: () => setShowDailyPlanner(true),
    },
  ];
  const weeklyRituals = [
    {
      id: "weekly-planning",
      label: "Weekly planning",
      icon: CalendarCheck,
      description: "Plan your week ahead",
      iconClass: "text-brand",
      onClick: () => setShowWeeklyRituals(true, "planning"),
    },
    {
      id: "weekly-review",
      label: "Weekly review",
      icon: TrendingUp,
      description: "Review your progress",
      iconClass: "text-tag-personal",
      onClick: () => setShowWeeklyRituals(true, "review"),
    },
  ];
  return (
    <>
      <aside className="w-sidebar h-screen flex flex-col bg-card border-r border-border overflow-hidden">
        {/* User Profile */}
        <div className="p-3 border-b border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full hover:bg-muted rounded-lg p-2 transition-colors">
                <ZenithLogo variant="mark" className="h-10 w-10" />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-foreground">Zenith</p>
                  {userEmail && (
                    <p className="text-xs text-muted-foreground truncate">
                      {userEmail}
                    </p>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem
                className="gap-2"
                onClick={() => router.push("/profile")}
              >
                <User className="w-4 h-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                onClick={() => router.push("/settings")}
              >
                <Settings className="w-4 h-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation */}
        <nav className="p-2 space-y-1">
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
              <item.icon className={cn("w-5 h-5", item.iconClass)} />
              <span>{item.label}</span>
            </motion.button>
          ))}
        </nav>

        {/* Daily Rituals */}
        <div className="px-4 py-2">
          <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Daily Rituals
          </h3>
          <div className="space-y-1">
            {dailyRituals.map((ritual) => (
              <button
                key={ritual.id}
                onClick={ritual.onClick}
                className="flex items-center gap-3 w-full px-2 py-1.5 rounded-lg hover:bg-muted transition-colors group"
              >
                <ritual.icon className={cn("w-4 h-4", ritual.iconClass)} />
                <span className="text-sm text-foreground flex-1 text-left">
                  {ritual.label}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        {/* Weekly Rituals */}
        <div className="px-4 py-2">
          <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
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
                className="flex items-center gap-3 w-full p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-all group border border-transparent hover:border-border"
              >
                <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                  <ritual.icon className={cn("w-4 h-4", ritual.iconClass)} />
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

        <div className="p-3 border-t border-border">
          <button
            type="button"
            onClick={() =>
              todayTotal === 0 ? setShowCreateModal(true) : setShowTodayPanel(true)
            }
            className="w-full rounded-xl border border-foreground/10 bg-muted/30 p-3 text-left hover:bg-muted"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">Progress</p>
              <p className="text-xs text-muted-foreground">
                {todayTotal === 0
                  ? "Nothing planned"
                  : `${todayDone} of ${todayTotal} done`}
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand transition-[width]"
                style={{ width: `${todayProgress}%` }}
              />
            </div>
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
