import { useState } from "react";
import {
  Home,
  Calendar,
  Target,
  UserPlus,
  ChevronDown,
  ChevronRight,
  CalendarCheck,
  TrendingUp,
  Copy,
  Mail,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ZenithLogo } from "@/components/brand/ZenithLogo";

// There is no invite backend yet, so this is a lightweight placeholder:
// it lets the user copy a canned invite message or open their mail client.
// Follow-up: replace with a real invite flow once an invites API exists.
const INVITE_MESSAGE =
  "Join me on Zenith, a calm way to plan and manage your day: https://zenith.piyushh.me";

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
  } = useApp();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const userEmail = useAuthStore((state) => state.user?.email);

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    router.replace("/login");
  };

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(INVITE_MESSAGE);
      toast.success("Invite message copied");
    } catch {
      toast.error("Could not copy the invite message");
    }
  };

  const navItems = [
    {
      icon: Home,
      label: "Home",
      active: false,
      onClick: () => router.push("/dashboard"),
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
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors">
                <UserPlus className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Invite someone
                </span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite someone to Zenith</DialogTitle>
                <DialogDescription>
                  There is no invite system yet, so share Zenith the simple way for now:
                  copy the message below or send it by email.
                </DialogDescription>
              </DialogHeader>
              <p className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-foreground">
                {INVITE_MESSAGE}
              </p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCopyInvite}>
                  <Copy className="w-4 h-4" />
                  Copy message
                </Button>
                <Button type="button" asChild>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(
                      "Join me on Zenith"
                    )}&body=${encodeURIComponent(INVITE_MESSAGE)}`}
                  >
                    <Mail className="w-4 h-4" />
                    Email invite
                  </a>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
