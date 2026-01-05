"use client";

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

  const handleResetFilters = () => {
    setFilterTags(["all"]);
    setFilterStatus("all");
  };

  return (
    <header className="h-header flex items-center justify-between px-4 border-b border-border bg-card/50 backdrop-blur-sm">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted rounded-lg transition-colors">
          <Calendar className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium">Today</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
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
        <button className="p-2 hover:bg-muted rounded-lg transition-colors relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
        </button>
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
