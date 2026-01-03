"use client"

import { useState } from "react"
import { Plus, X, Trash2 } from "lucide-react"
import type { DailyPlannerTask } from "@/lib/types"
import { cn } from "@/lib/utils"

interface DailyPlannerProps {
  onClose: () => void
}

export default function DailyPlanner({ onClose }: DailyPlannerProps) {
  const [tasks, setTasks] = useState<DailyPlannerTask[]>([
    { id: "1", title: "Review yesterday's accomplishments", completed: false },
    { id: "2", title: "Set top 3 priorities for today", completed: false },
    { id: "3", title: "Check calendar for meetings", completed: true },
    { id: "4", title: "Process inbox to zero", completed: false },
  ])
  const [newTaskTitle, setNewTaskTitle] = useState("")

  const today = new Date()
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const toggleTask = (taskId: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)))
  }

  const addTask = () => {
    if (!newTaskTitle.trim()) return
    const newTask: DailyPlannerTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      completed: false,
    }
    setTasks((prev) => [...prev, newTask])
    setNewTaskTitle("")
  }

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  const completedCount = tasks.filter((t) => t.completed).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 animate-fade-in" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-card rounded-lg shadow-2xl overflow-hidden animate-slide-in-bottom m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold">Daily Planning</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            {dayNames[today.getDay()]}, {monthNames[today.getMonth()]} {today.getDate()}
          </p>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-medium">
                {completedCount}/{tasks.length}
              </span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: tasks.length ? `${(completedCount / tasks.length) * 100}%` : "0%" }}
              />
            </div>
          </div>
        </div>

        {/* Task list */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-3 p-3 bg-secondary/30 rounded-md group transition-all",
                  task.completed && "opacity-60",
                )}
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                    task.completed
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-muted-foreground hover:border-foreground",
                  )}
                >
                  {task.completed && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <span className={cn("flex-1 text-sm", task.completed && "line-through text-muted-foreground")}>
                  {task.title}
                </span>

                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            ))}
          </div>

          {/* Add new task */}
          <div className="mt-4 flex items-center gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="Add a planning task..."
              className="flex-1 px-3 py-2 text-sm bg-secondary/50 rounded-md outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/50"
            />
            <button
              onClick={addTask}
              disabled={!newTaskTitle.trim()}
              className={cn(
                "p-2 rounded-md transition-colors",
                newTaskTitle.trim()
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-secondary/20">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Done Planning
          </button>
        </div>
      </div>
    </div>
  )
}
