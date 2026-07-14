"use client";

import { useState } from "react";
import {
  Calendar,
  Bell,
  Settings,
  User,
  LayoutGrid,
  CalendarDays,
  Sun,
  Moon,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { FilterDropdown } from "./FilterDropdown";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";

export function KanbanHeader() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const {
    viewMode,
    setViewMode,
    filterTags,
    setFilterTags,
    filterStatus,
    setFilterStatus,
  } = useApp();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const handleResetFilters = () => {
    setFilterTags(["all"]);
    setFilterStatus("all");
  };

  // There is no store method exposed to jump the board to an arbitrary date
  // (and useStore.ts is out of scope for this change), and KanbanColumn.tsx
  // does not render a per-column date attribute either, so the best we can
  // do without touching either file is a best-effort scroll to a matching
  // "data-date" element if one ever appears, then close the popover either
  // way. Follow-up: expose a jumpToDate/scrollToColumn helper from the store
  // and stamp each column with data-date to make this actually work.
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const key = format(date, "yyyy-MM-dd");
      const target = document.querySelector(`[data-date="${key}"]`);
      target?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
    setIsDatePickerOpen(false);
  };

  return (
    <header className="h-header flex items-center justify-between px-4 border-b border-border bg-card/50 backdrop-blur-sm">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted rounded-lg transition-colors">
              <Calendar className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">Today</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker
              mode="single"
              selected={new Date()}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <span className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, MMMM d")}
        </span>
        <FilterDropdown
          selectedTags={filterTags}
          selectedStatus={filterStatus}
          onTagChange={setFilterTags}
          onStatusChange={setFilterStatus}
          onReset={handleResetFilters}
        />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* View Toggle */}
        <div className="flex p-1 bg-muted rounded-lg">
          <button
            onClick={() => setViewMode("board")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              viewMode === "board"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Board</span>
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              viewMode === "calendar"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Calendars</span>
          </button>
        </div>

        {/* Action Buttons */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Moon className="w-5 h-5 text-muted-foreground" />
          )}
        </motion.button>
        {/* Notifications: placeholder popover only, there is no notifications
            API yet. Swap the empty state below for a real feed once one
            exists on the backend. */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="p-2 hover:bg-muted rounded-lg transition-colors relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <p className="text-sm font-medium text-foreground">Notifications</p>
            <p className="mt-2 text-sm text-muted-foreground">No notifications yet.</p>
          </PopoverContent>
        </Popover>
        <button
          onClick={() => router.push("/settings")}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
        <button
          onClick={() => router.push("/profile")}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <User className="w-4 h-4 text-accent" />
          </div>
        </button>
      </div>
    </header>
  );
}
