import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, RotateCcw } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

export function FocusMode() {
  const { focusMode, setFocusMode, focusTask, tasks } = useApp();
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(25);

  const currentTask = focusTask || tasks.find((t) => !t.completed);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleStart = useCallback(() => {
    setIsRunning(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setTimeLeft(selectedDuration * 60);
    setIsRunning(false);
  }, [selectedDuration]);

  const setDuration = useCallback((minutes: number) => {
    setSelectedDuration(minutes);
    setTimeLeft(minutes * 60);
    setIsRunning(false);
  }, []);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const progress =
    ((selectedDuration * 60 - timeLeft) / (selectedDuration * 60)) * 100;

  const durations = [15, 25, 45, 60];

  if (!focusMode) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center"
      >
        {/* Close Button */}
        <button
          onClick={() => setFocusMode(false)}
          className="absolute top-6 right-6 p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <X className="w-6 h-6 text-muted-foreground" />
        </button>

        {/* Duration Selector */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2 p-1 bg-muted rounded-lg">
          {durations.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                selectedDuration === d
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {d} min
            </button>
          ))}
        </div>

        {/* Timer */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          {/* Progress Ring */}
          <svg className="w-80 h-80 transform -rotate-90">
            <circle
              cx="160"
              cy="160"
              r="150"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-muted"
            />
            <motion.circle
              cx="160"
              cy="160"
              r="150"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              className="text-accent"
              initial={{ strokeDasharray: 942, strokeDashoffset: 942 }}
              animate={{ strokeDashoffset: 942 - (942 * progress) / 100 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </svg>

          {/* Time Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-7xl font-light tracking-tight text-foreground">
              {formatTime(timeLeft)}
            </span>
            <span className="text-sm text-muted-foreground mt-2">
              {isRunning ? "Focus time" : "Ready to focus"}
            </span>
          </div>
        </motion.div>

        {/* Task Display */}
        {currentTask && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 text-center"
          >
            <p className="text-xl font-medium text-foreground">
              {currentTask.title}
            </p>
            <p
              className={cn(
                "text-sm mt-1",
                currentTask.tag === "work" && "text-tag-work",
                currentTask.tag === "personal" && "text-tag-personal",
                currentTask.tag === "health" && "text-tag-health"
              )}
            >
              #{currentTask.tag}
            </p>
          </motion.div>
        )}

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-4 mt-10"
        >
          <button
            onClick={handleReset}
            className="p-3 hover:bg-muted rounded-full transition-colors"
          >
            <RotateCcw className="w-6 h-6 text-muted-foreground" />
          </button>
          <button
            onClick={isRunning ? handlePause : handleStart}
            className="p-6 bg-accent text-accent-foreground rounded-full hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
          >
            {isRunning ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8 ml-1" />
            )}
          </button>
          <div className="w-12" /> {/* Spacer for symmetry */}
        </motion.div>

        {/* Keyboard Hints */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="absolute bottom-6 text-sm text-muted-foreground"
        >
          Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Space</kbd>{" "}
          to {isRunning ? "pause" : "start"} ·{" "}
          <kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd> to exit
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
