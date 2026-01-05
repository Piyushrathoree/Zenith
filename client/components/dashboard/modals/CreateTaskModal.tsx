import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Hash, Calendar, Clock, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { format, addDays } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function CreateTaskModal() {
  const { showCreateModal, setShowCreateModal, addTask } = useApp();
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState<"work" | "personal" | "health">("work");
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("1:00");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTask({
      title: title.trim(),
      time: time || undefined,
      duration,
      tag,
      date: format(date, "yyyy-MM-dd"),
      completed: false,
    });

    setTitle("");
    setTime("");
    setShowCreateModal(false);
  };

  const tags: {
    value: "work" | "personal" | "health";
    label: string;
    color: string;
  }[] = [
    { value: "work", label: "work", color: "text-tag-work" },
    { value: "personal", label: "personal", color: "text-tag-personal" },
    { value: "health", label: "health", color: "text-tag-health" },
  ];

  const quickDates = [
    { label: "Today", value: new Date() },
    { label: "Tomorrow", value: addDays(new Date(), 1) },
    { label: "Next Week", value: addDays(new Date(), 7) },
  ];

  const durations = ["0:15", "0:30", "0:45", "1:00", "1:30", "2:00", "3:00"];

  if (!showCreateModal) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => setShowCreateModal(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
            <div className="flex items-center gap-4">
              {tags.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTag(t.value)}
                  className={cn(
                    "flex items-center gap-1 text-sm transition-colors",
                    tag === t.value
                      ? t.color
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Hash className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                  {tag === t.value && <Check className="w-3 h-3 ml-1" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCreateModal(false)}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task description..."
              className="w-full text-lg font-medium bg-transparent border-none outline-none placeholder:text-muted-foreground"
              autoFocus
            />

            {/* Options Row */}
            <div className="flex flex-wrap gap-2">
              {/* Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{format(date, "MMM d")}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-2 border-b border-border">
                    <div className="flex gap-1">
                      {quickDates.map((qd) => (
                        <button
                          key={qd.label}
                          type="button"
                          onClick={() => setDate(qd.value)}
                          className="px-3 py-1.5 text-xs bg-muted hover:bg-accent/20 rounded-md transition-colors"
                        >
                          {qd.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {/* Time Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
                  >
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{time || "--:--"}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="start">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 bg-muted rounded-lg text-sm"
                  />
                </PopoverContent>
              </Popover>

              {/* Duration Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
                  >
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{duration}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="flex flex-wrap gap-1">
                    {durations.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDuration(d)}
                        className={cn(
                          "px-3 py-1.5 text-xs rounded-md transition-colors",
                          duration === d
                            ? "bg-accent text-accent-foreground"
                            : "bg-muted hover:bg-muted/80"
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                disabled={!title.trim()}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add task
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
