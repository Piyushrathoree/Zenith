"use client"

import { useState } from "react"
import { Plus, Calendar, ChevronRight } from "lucide-react"
import type { Task } from "@/lib/types"
import { cn } from "@/lib/utils"

interface TodayViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onAddTask: () => void
}

export default function TodayView({ tasks, onTaskClick, onAddTask }: TodayViewProps) {
  const [completedTasks, setCompletedTasks] = useState<string[]>([])

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
    setCompletedTasks((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]))
  }

  const totalDuration = tasks.reduce((acc, task) => {
    const [hours, minutes] = task.duration.split(":").map(Number)
    return acc + hours * 60 + minutes
  }, 0)

  const completedDuration = tasks
    .filter((t) => completedTasks.includes(t.id))
    .reduce((acc, task) => {
      const [hours, minutes] = task.duration.split(":").map(Number)
      return acc + hours * 60 + minutes
    }, 0)

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold mb-1">{dayNames[today.getDay()]}</h1>
        <p className="text-muted-foreground">
          {monthNames[today.getMonth()]} {today.getDate()}
        </p>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Today's progress</span>
            <span className="font-medium">
              {completedTasks.length}/{tasks.length} tasks
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: tasks.length ? `${(completedTasks.length / tasks.length) * 100}%` : "0%" }}
            />
          </div>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Add task button */}
        <button
          onClick={onAddTask}
          className="w-full flex items-center gap-3 p-3 mb-3 border border-dashed border-border rounded-md hover:bg-secondary/50 transition-colors text-muted-foreground"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Add task</span>
          <span className="ml-auto text-xs bg-secondary px-2 py-0.5 rounded">
            {Math.floor(totalDuration / 60)}:{String(totalDuration % 60).padStart(2, "0")}
          </span>
        </button>

        {/* Tasks */}
        <div className="space-y-2">
          {tasks.map((task) => {
            const isCompleted = completedTasks.includes(task.id)
            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-3 p-3 bg-card border border-border rounded-md cursor-pointer transition-all duration-150",
                  "hover:bg-secondary/30",
                  isCompleted && "opacity-60",
                )}
                onClick={() => onTaskClick(task)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleTask(task.id)
                  }}
                  className={cn(
                    "mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                    isCompleted
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-muted-foreground hover:border-foreground",
                  )}
                >
                  {isCompleted && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn("text-xs font-medium", isCompleted && "line-through text-muted-foreground")}>
                      {task.time}
                    </span>
                    <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">
                      {task.duration}
                    </span>
                  </div>
                  <p className={cn("text-sm font-medium", isCompleted && "line-through text-muted-foreground")}>
                    {task.title}
                  </p>
                  {task.tag && <span className="text-xs text-amber-500 mt-1 inline-block">{task.tag}</span>}
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
              </div>
            )
          })}
        </div>

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No tasks for today</p>
            <p className="text-sm text-muted-foreground/70">Click the button above to add one</p>
          </div>
        )}
      </div>
    </div>
  )
}
