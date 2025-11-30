"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Play, Pause, RotateCcw, Settings, Volume2, VolumeX } from "lucide-react"
import type { Task } from "@/lib/types"
import { cn } from "@/lib/utils"

interface FocusModeProps {
  task?: Task | null
  onClose: () => void
}

const PRESET_TIMES = [
  { label: "15 min", value: 15 },
  { label: "25 min", value: 25 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
]

export default function FocusMode({ task, onClose }: FocusModeProps) {
  const [duration, setDuration] = useState(25) // minutes
  const [timeRemaining, setTimeRemaining] = useState(25 * 60) // seconds
  const [isRunning, setIsRunning] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const resetTimer = useCallback(() => {
    setIsRunning(false)
    setTimeRemaining(duration * 60)
  }, [duration])

  useEffect(() => {
    setTimeRemaining(duration * 60)
  }, [duration])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            // Play sound when timer ends
            if (soundEnabled) {
              // Could add sound notification here
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, soundEnabled, timeRemaining])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  const progress = ((duration * 60 - timeRemaining) / (duration * 60)) * 100

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
      {/* Close button */}
      <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-md transition-colors">
        <X className="w-5 h-5" />
      </button>

      {/* Settings button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-4 left-4 p-2 hover:bg-secondary rounded-md transition-colors"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Sound toggle */}
      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="absolute top-4 left-14 p-2 hover:bg-secondary rounded-md transition-colors"
      >
        {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </button>

      {/* Main content */}
      <div className="text-center max-w-md px-4">
        {/* Task title if provided */}
        {task && (
          <div className="mb-8">
            <p className="text-sm text-muted-foreground mb-1">Focusing on</p>
            <h2 className="text-xl font-semibold">{task.title}</h2>
            {task.tag && <span className="text-sm text-amber-500 mt-1 inline-block">{task.tag}</span>}
          </div>
        )}

        {/* Timer display */}
        <div className="relative mb-8">
          {/* Circular progress */}
          <div className="relative w-64 h-64 mx-auto">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-secondary"
              />
              {/* Progress circle */}
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                className="text-primary transition-all duration-300"
                strokeDasharray={`${2 * Math.PI * 120}`}
                strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
              />
            </svg>

            {/* Time display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-bold tracking-tight font-mono">{formatTime(timeRemaining)}</span>
              <span className="text-sm text-muted-foreground mt-2">
                {isRunning ? "Focus time" : timeRemaining === 0 ? "Complete!" : "Ready"}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button onClick={resetTimer} className="p-3 hover:bg-secondary rounded-full transition-colors" title="Reset">
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={cn(
              "p-6 rounded-full transition-all duration-200",
              isRunning
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-primary hover:bg-primary/90 text-primary-foreground",
            )}
          >
            {isRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </button>
          <div className="w-11" /> {/* Spacer for alignment */}
        </div>

        {/* Duration presets */}
        {showSettings && (
          <div className="animate-fade-in">
            <p className="text-sm text-muted-foreground mb-3">Set duration</p>
            <div className="flex items-center justify-center gap-2">
              {PRESET_TIMES.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => {
                    setDuration(preset.value)
                    setTimeRemaining(preset.value * 60)
                    setIsRunning(false)
                  }}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                    duration === preset.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom duration input */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <input
                type="number"
                min="1"
                max="120"
                value={duration}
                onChange={(e) => {
                  const val = Number.parseInt(e.target.value) || 25
                  setDuration(Math.min(120, Math.max(1, val)))
                }}
                className="w-20 px-3 py-2 text-sm text-center bg-secondary rounded-md outline-none focus:ring-1 focus:ring-primary/50"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          </div>
        )}
      </div>

      {/* Motivational message */}
      <p className="absolute bottom-8 text-sm text-muted-foreground">
        {isRunning ? "Stay focused. You got this." : "Press play to start your focus session"}
      </p>
    </div>
  )
}
