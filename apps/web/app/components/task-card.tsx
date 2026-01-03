"use client"

import type React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Task } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Github, Mail, FileText, CheckCircle2 } from "lucide-react"
import { motion } from "framer-motion"

interface TaskCardProps {
  task: Task
  onClick: () => void
}

const tagColors: Record<string, string> = {
  orange: "text-amber-500",
  blue: "text-blue-400",
  green: "text-emerald-400",
  teal: "text-teal-400",
  pink: "text-pink-400",
  purple: "text-purple-400",
}

const integrationIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  github: Github,
  gmail: Mail,
  notion: FileText,
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    transition: {
      duration: 150,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const IntegrationIcon = task.integration ? integrationIcons[task.integration] : null

  // Reminder cards have special styling
  if (task.isReminder) {
    return (
      <motion.div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={onClick}
        initial={false}
        animate={{
          scale: isDragging ? 1.03 : 1,
          boxShadow: isDragging
            ? "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)"
            : "0 1px 3px rgba(0, 0, 0, 0.1)",
          opacity: isDragging ? 0.9 : 1,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "p-3 rounded cursor-grab active:cursor-grabbing",
          task.reminderColor || "bg-neutral-600",
          isDragging && "z-50",
        )}
      >
        <div className="flex justify-between items-start">
          <span className="text-xs font-medium text-white/90">{task.time}</span>
          <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded">{task.duration}</span>
        </div>
        <p className="text-sm font-medium mt-2 text-white">{task.title}</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      initial={false}
      animate={{
        scale: isDragging ? 1.03 : 1,
        boxShadow: isDragging
          ? "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)"
          : "0 1px 2px rgba(0, 0, 0, 0.05)",
        opacity: isDragging ? 0.9 : 1,
        zIndex: isDragging ? 50 : 1,
      }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group bg-card border border-transparent rounded p-3 cursor-grab active:cursor-grabbing hover:border-border transition-colors duration-250",
        isDragging && "z-50",
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Checkbox that appears on hover */}
        <motion.button
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="opacity-0 group-hover:opacity-100 mt-0.5 shrink-0"
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          <CheckCircle2 className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
        </motion.button>

        <div className="flex-1 min-w-0">
          {/* Time and duration row */}
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-foreground">{task.time}</span>
            <div className="flex items-center gap-1.5">
              {IntegrationIcon && <IntegrationIcon className="w-3.5 h-3.5 text-muted-foreground" />}
              <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                {task.duration}
              </span>
            </div>
          </div>

          {/* Task title */}
          <p className="text-[13px] font-medium leading-snug text-foreground">{task.title}</p>

          {/* Tag */}
          {task.tag && (
            <span className={cn("text-xs mt-1.5 inline-flex items-center gap-1", tagColors[task.tagColor || "orange"])}>
              <span className="font-medium">#</span>
              {task.tag.replace("#", "")}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
