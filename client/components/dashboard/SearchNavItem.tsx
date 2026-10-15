"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, isToday, parse } from "date-fns";
import { Search } from "lucide-react";
import { motion } from "motion/react";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function SearchNavItem() {
  const {
    tasks,
    jumpToDate,
    setSelectedTask,
    setShowTaskModal,
  } = useApp();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return tasks
      .filter((task) => task.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, tasks]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (typing) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openTask = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    jumpToDate(task.date);
    setSelectedTask(task);
    setShowTaskModal(true);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <motion.button
          type="button"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={cn("sidebar-nav-item w-full", open && "active")}
        >
          <Search className="h-5 w-5 text-tag-personal" />
          <span>Search</span>
        </motion.button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="right"
        className="w-80 p-3"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (matches[0]) openTask(matches[0].id);
          }}
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a task"
            className="w-full rounded-lg border border-foreground/10 bg-muted/40 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground/20"
          />
        </form>
        <div className="mt-2 space-y-1">
          {query.trim() === "" ? (
            <p className="px-1 py-2 text-xs text-muted-foreground">
              Type a title. Ctrl+K anytime.
            </p>
          ) : matches.length === 0 ? (
            <p className="px-1 py-2 text-xs text-muted-foreground">
              Nothing matches that
            </p>
          ) : (
            matches.map((task) => {
              const date = parse(task.date, "yyyy-MM-dd", new Date());
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => openTask(task.id)}
                  className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-muted"
                >
                  <span className="text-sm text-foreground">{task.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {isToday(date) ? "Today" : format(date, "EEE, MMM d")}
                    {task.completed ? " · done" : ""}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
