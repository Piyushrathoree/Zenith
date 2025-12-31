"use client"

import type React from "react"
import { useDraggable } from "@dnd-kit/core"
import type { IntegrationCard } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Github, Mail, FileText, Calendar } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion } from "framer-motion"

interface IntegrationCardComponentProps {
  card: IntegrationCard
  onClick: () => void
}

const sourceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  github: Github,
  gmail: Mail,
  notion: FileText,
}

const labelColors: Record<string, string> = {
  "help wanted": "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  "good first issue": "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  bug: "bg-red-500/20 text-red-400 border border-red-500/30",
  enhancement: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  documentation: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  urgent: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  hacktoberfest: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  "hacktoberfest-accepted": "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  test: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
}

export default function IntegrationCardComponent({ card, onClick }: IntegrationCardComponentProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id })

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
      }
    : undefined

  const bgClass =
    card.source === "github"
      ? "bg-neutral-100 dark:bg-neutral-900"
      : card.source === "gmail"
        ? "bg-neutral-100 dark:bg-neutral-900"
        : "bg-neutral-100 dark:bg-neutral-900"

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      initial={false}
      animate={{
        scale: isDragging ? 1.02 : 1,
        boxShadow: isDragging ? "0 20px 25px -5px rgba(0, 0, 0, 0.3)" : "0 1px 2px rgba(0, 0, 0, 0.05)",
        opacity: isDragging ? 0.8 : 1,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 50 }}
      className={cn(
        "border border-border/50 rounded-md p-3 cursor-grab active:cursor-grabbing transition-all duration-150 dark:bg-neutral-900",
        bgClass,
        isDragging && "z-50",
      )}
    >
      {/* Repository/source path */}
      <p className="text-xs dark:text-white/60 text-black/60  mb-1.5 truncate">
        {card.source === "github" && card.repository}
        {card.source === "gmail" && card.sender}
        {card.source === "notion" && card.workspace}
      </p>

      {/* Title */}
      <h4 className="text-[13px] font-medium leading-snug mb-1.5 line-clamp-2 dark:text-white text-black">{card.title}</h4>

      {/* Meta info row */}
      <div className="flex items-center gap-1.5 text-[11px] dark:text-white/50 text-black/50 mb-2">
        {card.source === "github" && (
          <>
            <span>#{card.issueNumber}</span>
            <span>·</span>
            <span>{card.timestamp}</span>
            {card.author && (
              <>
                <span>·</span>
                <span>{card.author}</span>
              </>
            )}
          </>
        )}
        {card.source === "gmail" && <span>{card.timestamp}</span>}
        {card.source === "notion" && <span>Edited {card.timestamp}</span>}
      </div>

      {/* Labels */}
      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium",
                labelColors[label.toLowerCase()] || "bg-white/10 dark:text-white/70 text-black/70",
              )}
            >
              {label.length > 12 ? `${label.slice(0, 12)}...` : label}
            </span>
          ))}
        </div>
      )}

      {/* Preview text for Gmail */}
      {card.source === "gmail" && card.preview && (
        <p className="text-[11px] text-black/60 dark:text-white/60 line-clamp-2 mb-2">{card.preview}</p>
      )}

      {/* Bottom row: Due date and avatar */}
      <div className="flex items-center justify-between">
        {card.dueDate && (
          <div className="flex items-center gap-1 text-[11px] text-black/60 dark:text-white/60">
            <Calendar className="w-3 h-3" />
            <span>{card.dueDate}</span>
          </div>
        )}
        {card.avatarUrl && (
          <Avatar className="w-5 h-5 ml-auto">
            <AvatarImage src={card.avatarUrl || "/placeholder.svg"} />
            <AvatarFallback className="text-[9px] text-black/20 dark:bg-white/20">{card.author?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
        )}
      </div>
    </motion.div>
  )
}
