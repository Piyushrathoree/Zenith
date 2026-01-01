"use client"

import { useState, useEffect } from "react"
import {
  X,
  Circle,
  ExternalLink,
  Github,
  Mail,
  FileText,
  Play,
  Hash,
  MoreHorizontal,
  Maximize2,
  Pause,
} from "lucide-react"
import type { Task, IntegrationCard } from "@/lib/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface TaskDetailPanelProps {
  isOpen: boolean
  onClose: () => void
  task: Task | IntegrationCard | null
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

export default function TaskDetailPanel({ isOpen, onClose, task }: TaskDetailPanelProps) {
  if (!task) return null

  const isIntegration = "source" in task

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            className="relative w-full max-w-2xl max-h-[80vh] bg-card rounded-lg overflow-hidden flex flex-col shadow-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-14 px-6 flex items-center justify-between bg-secondary border-b border-border shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <Hash className="w-4 h-4 text-accent" />
                  <span>work</span>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Start: Today</span>
                  <span>Due: --</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-primary/10 rounded-lg transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-primary/10 rounded-lg transition-colors">
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button onClick={onClose} className="p-2 hover:bg-primary/10 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isIntegration ? (
                <IntegrationDetailContent card={task as IntegrationCard} />
              ) : (
                <TaskDetailContent task={task as Task} />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function TaskDetailContent({ task }: { task: Task }) {
  const [isCompleted, setIsCompleted] = useState(task.completed || false)
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState("")
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning])

  const formatSeconds = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-start gap-4">
        <motion.button
          onClick={() => setIsCompleted(!isCompleted)}
          whileTap={{ scale: 0.9 }}
          className={cn(
            "mt-1 w-6 h-6 rounded-full border-2 transition-all duration-150 flex items-center justify-center shrink-0",
            isCompleted ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground hover:border-foreground",
          )}
        >
          {isCompleted && (
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-3.5 h-3.5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </motion.svg>
          )}
        </motion.button>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={cn(
            "flex-1 text-2xl font-bold bg-transparent outline-none",
            isCompleted && "line-through text-muted-foreground",
          )}
        />

        <div className="flex items-center gap-4 shrink-0">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsRunning(!isRunning)}
            className="p-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </motion.button>
          <div className="text-right">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time</p>
            <p className="text-lg font-mono font-bold text-foreground">{formatSeconds(timeElapsed)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes..."
          className="w-full h-24 p-3 bg-secondary rounded-lg text-sm outline-none resize-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 transition-all border border-border"
        />
      </div>

      {/* Activity log */}
      <div className="space-y-3 pt-4 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activity</p>
        <motion.div className="space-y-2">
          {[{ user: "You", action: "created this task", time: "just now" }].map((activity, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-3 text-sm"
            >
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">Y</span>
              </div>
              <div>
                <p className="text-foreground">
                  <span className="font-semibold">{activity.user}</span> {activity.action}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {task.integration === "github" && task.integrationData && (
        <div className="mt-6">
          <GitHubIssueSection card={task.integrationData} />
        </div>
      )}
    </div>
  )
}

function IntegrationDetailContent({ card }: { card: IntegrationCard }) {
  const [isCompleted, setIsCompleted] = useState(false)
  const [title, setTitle] = useState(card.title)
  const [notes, setNotes] = useState("")
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning])

  const formatSeconds = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-start gap-4">
        <motion.button
          onClick={() => setIsCompleted(!isCompleted)}
          whileTap={{ scale: 0.9 }}
          className={cn(
            "mt-1 w-6 h-6 rounded-full border-2 transition-all duration-150 flex items-center justify-center shrink-0",
            isCompleted ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground hover:border-foreground",
          )}
        >
          {isCompleted && (
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-3.5 h-3.5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </motion.svg>
          )}
        </motion.button>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={cn(
            "flex-1 text-2xl font-bold bg-transparent outline-none",
            isCompleted && "line-through text-muted-foreground",
          )}
        />

        <div className="flex items-center gap-4 shrink-0">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsRunning(!isRunning)}
            className="p-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </motion.button>
          <div className="text-right">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time</p>
            <p className="text-lg font-mono font-bold text-foreground">{formatSeconds(timeElapsed)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes..."
          className="w-full h-24 p-3 bg-secondary rounded-lg text-sm outline-none resize-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 transition-all border border-border"
        />
      </div>

      {card.source === "github" && <GitHubIssueSection card={card} />}
      {card.source === "gmail" && <GmailSection card={card} />}
      {card.source === "notion" && <NotionSection card={card} />}
    </div>
  )
}

function GitHubIssueSection({ card }: { card: IntegrationCard }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="border-t border-border pt-6">
      <div className="flex items-center gap-2 mb-4">
        <Github className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-cyan-400">GitHub Issue</span>
      </div>

      <h3 className="text-lg font-semibold mb-3">
        {card.title} <span className="text-muted-foreground">#{card.issueNumber}</span>
      </h3>

      <div className="flex items-center gap-3 mb-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/30">
          <Circle className="w-2 h-2 fill-current" />
          Open
        </span>
        {card.author && card.createdAt && (
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{card.author}</span> opened {card.createdAt}
          </span>
        )}
      </div>

      {card.description && (
        <div className="mb-6 p-4 bg-secondary rounded-lg">
          <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans text-foreground/90">
            {card.description}
          </pre>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {card.assignees && card.assignees.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">Assignees</h4>
            <div className="space-y-2">
              {card.assignees.map((assignee, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Avatar className="w-5 h-5">
                    <AvatarFallback className="text-[9px] bg-secondary">{assignee.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{assignee}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {card.labels && card.labels.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">Labels</h4>
            <div className="flex flex-wrap gap-1.5">
              {card.labels.map((label) => (
                <span
                  key={label}
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-semibold",
                    labelColors[label.toLowerCase()] || "bg-secondary text-muted-foreground border border-border",
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <button className="mt-6 flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
        <ExternalLink className="w-4 h-4" />
        Open in GitHub
      </button>
    </motion.div>
  )
}

function GmailSection({ card }: { card: IntegrationCard }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="border-t border-border pt-6">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-red-400">Gmail</span>
      </div>

      <h3 className="text-lg font-semibold mb-2">{card.title}</h3>

      {card.sender && <p className="text-sm text-muted-foreground mb-4">From: {card.sender}</p>}

      {card.preview && (
        <div className="p-4 bg-secondary rounded-lg">
          <p className="text-sm leading-relaxed">{card.preview}</p>
        </div>
      )}

      <button className="mt-6 flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
        <ExternalLink className="w-4 h-4" />
        Open in Gmail
      </button>
    </motion.div>
  )
}

function NotionSection({ card }: { card: IntegrationCard }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="border-t border-border pt-6">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">Notion</span>
      </div>

      <h3 className="text-lg font-semibold mb-2">{card.title}</h3>

      {card.workspace && <p className="text-sm text-muted-foreground mb-4">Workspace: {card.workspace}</p>}

      {card.description && (
        <div className="p-4 bg-secondary rounded-lg">
          <p className="text-sm leading-relaxed">{card.description}</p>
        </div>
      )}

      <button className="mt-6 flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
        <ExternalLink className="w-4 h-4" />
        Open in Notion
      </button>
    </motion.div>
  )
}
