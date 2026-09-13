import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Calendar, Clock } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { format, addDays, isSameDay } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TaskTag = "work" | "personal" | "health";

const TAGS: { value: TaskTag; label: string; dot: string; active: string }[] = [
  {
    value: "work",
    label: "Work",
    dot: "bg-tag-work",
    active: "border-tag-work/40 bg-work-soft text-foreground",
  },
  {
    value: "personal",
    label: "Personal",
    dot: "bg-tag-personal",
    active: "border-tag-personal/40 bg-personal-soft text-foreground",
  },
  {
    value: "health",
    label: "Health",
    dot: "bg-tag-health",
    active: "border-tag-health/40 bg-health-soft text-foreground",
  },
];

const DURATIONS = [
  { value: "0:15", label: "15 min" },
  { value: "0:30", label: "30 min" },
  { value: "0:45", label: "45 min" },
  { value: "1:00", label: "1 hr" },
  { value: "1:30", label: "1½ hr" },
  { value: "2:00", label: "2 hr" },
];

const TIME_SLOTS = [
  "7:00 am",
  "8:00 am",
  "9:00 am",
  "10:00 am",
  "11:00 am",
  "12:00 pm",
  "1:00 pm",
  "2:00 pm",
  "3:00 pm",
  "4:00 pm",
  "5:00 pm",
  "6:00 pm",
  "7:00 pm",
  "8:00 pm",
];

export function CreateTaskModal() {
  const { showCreateModal, setShowCreateModal, addTask } = useApp();
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState<TaskTag>("work");
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("1:00");

  const close = () => {
    setTitle("");
    setTime("");
    setShowCreateModal(false);
  };

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

    close();
  };

  const quickDates = [
    { label: "Today", value: new Date() },
    { label: "Tomorrow", value: addDays(new Date(), 1) },
  ];

  return (
    <AnimatePresence>
      {showCreateModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-foreground/15 bg-card shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5">
              <p className="text-sm font-medium text-foreground">New task</p>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 pb-5 pt-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to get done?"
                className="w-full border-b border-foreground/15 bg-transparent pb-3 text-lg font-medium text-foreground outline-none placeholder:text-muted-foreground/70"
                autoFocus
              />

              <div className="mt-5">
                <p className="mb-2 text-xs text-muted-foreground">Channel</p>
                <div className="flex gap-2">
                  {TAGS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setTag(item.value)}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm transition-colors",
                        tag === item.value
                          ? item.active
                          : "border-foreground/10 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", item.dot)} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Date</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg border border-foreground/10 bg-muted/40 px-3 py-2 text-sm hover:border-foreground/20"
                      >
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{format(date, "MMM d")}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="flex gap-1 border-b border-border p-2">
                        {quickDates.map((qd) => (
                          <button
                            key={qd.label}
                            type="button"
                            onClick={() => setDate(qd.value)}
                            className={cn(
                              "rounded-md px-3 py-1.5 text-xs transition-colors",
                              isSameDay(date, qd.value)
                                ? "bg-brand-soft text-brand"
                                : "bg-muted hover:bg-muted/80"
                            )}
                          >
                            {qd.label}
                          </button>
                        ))}
                      </div>
                      <CalendarComponent
                        mode="single"
                        selected={date}
                        onSelect={(d) => d && setDate(d)}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Start</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg border border-foreground/10 bg-muted/40 px-3 py-2 text-sm hover:border-foreground/20"
                      >
                        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className={cn(!time && "text-muted-foreground")}>
                          {time || "Anytime"}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="z-[60] w-64 p-3" align="end">
                      <button
                        type="button"
                        onClick={() => setTime("")}
                        className={cn(
                          "mb-2 w-full rounded-lg border px-3 py-2 text-sm transition-colors",
                          !time
                            ? "border-brand/40 bg-brand-soft text-brand"
                            : "border-foreground/10 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                        )}
                      >
                        Anytime
                      </button>
                      <div className="grid grid-cols-2 gap-1.5">
                        {TIME_SLOTS.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setTime(slot)}
                            className={cn(
                              "rounded-lg border px-2 py-1.5 text-sm transition-colors",
                              time === slot
                                ? "border-brand/40 bg-brand-soft text-brand"
                                : "border-foreground/10 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                            )}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs text-muted-foreground">Duration</p>
                <div className="flex flex-wrap gap-1.5">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDuration(d.value)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                        duration === d.value
                          ? "border-brand/40 bg-brand-soft text-brand"
                          : "border-foreground/10 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={close}>
                  Cancel
                </Button>
                <Button type="submit" variant="brand" disabled={!title.trim()}>
                  Add to board
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
