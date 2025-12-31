"use client"

import { useState } from "react"
import { Calendar, Filter, ChevronDown, Bell, Settings, Plus, Sun, Moon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "@/components/theme-provider"
import type { KanbanData, Task } from "@/lib/types"
import TaskCard from "@/components/task-card"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

interface KanbanBoardProps {
  data: KanbanData
  onAddTask: (columnId: string) => void
  onTaskClick: (task: Task) => void
}

export default function KanbanBoard({ data, onAddTask, onTaskClick }: KanbanBoardProps) {
  const { theme, toggleTheme } = useTheme()
  const [viewMode, setViewMode] = useState<"board" | "calendar">("board")
  const router = useRouter()

  // Get today's date info for the header
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
  const todayString = `${dayNames[today.getDay()]}, ${monthNames[today.getMonth()]} ${today.getDate()}`

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 px-4 flex items-center justify-between border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors duration-150">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">Today</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors duration-150">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filter</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Board/Calendar toggle */}
          <div className="flex bg-secondary rounded-md p-0.5 mr-2">
            <button
              onClick={() => setViewMode("board")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded transition-colors duration-150",
                viewMode === "board" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded transition-colors duration-150",
                viewMode === "calendar"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Calendars
            </button>
          </div>

          {/* Action buttons */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-secondary transition-colors duration-150"
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <button className="p-2 rounded-md hover:bg-secondary transition-colors duration-150">
            <Bell className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-md hover:bg-secondary transition-colors duration-150">
            <Calendar className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push("/settings")}
            className="p-2 rounded-md hover:bg-secondary transition-colors duration-150"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={() => router.push("/profile")} className="ml-1">
            <Avatar className="w-7 h-7 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
              <AvatarImage src="/placeholder.svg?key=vd8cd" />
              <AvatarFallback className="text-[10px]">PR</AvatarFallback>
            </Avatar>
          </button>
        </div>
      </header>

      {/* Kanban Columns - scrollable for 2 weeks */}
      <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <div className="flex h-full min-w-max">
          {data.columns.map((column, index) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onAddTask={onAddTask}
              onTaskClick={onTaskClick}
              isToday={index === 0}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface KanbanColumnProps {
  column: KanbanData["columns"][0]
  onAddTask: (columnId: string) => void
  onTaskClick: (task: Task) => void
  isToday?: boolean
}

function KanbanColumn({ column, onAddTask, onTaskClick, isToday }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div className={cn("w-[280px] flex flex-col shrink-0 border-r border-border", isToday && "bg-secondary/20")}>
      {/* Column Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        <div>
          <h3 className="font-semibold text-sm text-foreground">{column.dayName}</h3>
          <p className="text-xs text-muted-foreground">{column.date}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAddTask(column.id)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors duration-150"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add task</span>
          </button>
          <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">3:00</span>
        </div>
      </div>

      {/* Tasks area with smooth transition for drop zone */}
      <motion.div
        ref={setNodeRef}
        animate={{
          backgroundColor: isOver ? "rgba(var(--primary-rgb), 0.05)" : "transparent",
        }}
        transition={{ duration: 0.15 }}
        className="flex-1 p-3 overflow-y-auto"
      >
        <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {column.tasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <TaskCard task={task} onClick={() => onTaskClick(task)} />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        </SortableContext>

        {column.tasks.length === 0 && !isOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-32 flex items-center justify-center border border-dashed border-border rounded"
          >
            <span className="text-xs text-muted-foreground">No tasks</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
