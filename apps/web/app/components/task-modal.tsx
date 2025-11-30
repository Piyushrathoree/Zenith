"use client"

import type React from "react"
import { useState } from "react"
import { X, Calendar, Clock, Hash, ChevronLeft, ChevronRight } from "lucide-react"
import type { Task } from "@/lib/types"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateTask: (task: Omit<Task, "id">) => void
}

const tags = [
  { id: "work", label: "work", color: "bg-amber-500/20 text-amber-500 border border-amber-500/30" },
  { id: "personal", label: "personal", color: "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30" },
  { id: "meetings", label: "meetings", color: "bg-blue-500/20 text-blue-500 border border-blue-500/30" },
  { id: "projects", label: "projects", color: "bg-purple-500/20 text-purple-500 border border-purple-500/30" },
]

const tagColorMap: Record<string, string> = {
  "bg-amber-500/20 text-amber-500 border border-amber-500/30": "text-amber-500",
  "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30": "text-emerald-500",
  "bg-blue-500/20 text-blue-500 border border-blue-500/30": "text-blue-500",
  "bg-purple-500/20 text-purple-500 border border-purple-500/30": "text-purple-500",
}

export default function TaskModal({ isOpen, onClose, onCreateTask }: TaskModalProps) {
  const [title, setTitle] = useState("")
  const [selectedTag, setSelectedTag] = useState(tags[0])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState("09:00")
  const [duration, setDuration] = useState("1:00")
  const [showCalendar, setShowCalendar] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  if (!isOpen) return null

  const formatDate = (date: Date) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return `${months[date.getMonth()]} ${date.getDate()}`
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":")
    const h = Number.parseInt(hours)
    const ampm = h >= 12 ? "pm" : "am"
    const hour12 = h % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isTomorrow = (date: Date) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return date.toDateString() === tomorrow.toDateString()
  }

  const getDateLabel = () => {
    if (isToday(selectedDate)) return "Today"
    if (isTomorrow(selectedDate)) return "Tomorrow"
    return formatDate(selectedDate)
  }

  const handleSubmit = () => {
    if (!title.trim()) return
    onCreateTask({
      title: title.trim(),
      time: formatTime(selectedTime),
      duration,
      tag: `#${selectedTag.label}`,
      tagColor:
        selectedTag.label === "work"
          ? "orange"
          : selectedTag.label === "personal"
            ? "green"
            : selectedTag.label === "meetings"
              ? "blue"
              : "purple",
      date: selectedDate.toISOString(),
    })
    setTitle("")
    setSelectedDate(new Date())
    setSelectedTime("09:00")
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleSubmit()
    }
    if (e.key === "Escape") {
      onClose()
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    return { daysInMonth, startingDay }
  }

  const { daysInMonth, startingDay } = getDaysInMonth(calendarMonth)
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full sm:w-[520px] bg-card rounded-t-lg sm:rounded-lg overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-14 px-6 flex items-center justify-between bg-secondary border-b border-border">
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowTagPicker(!showTagPicker)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-colors hover:bg-primary/10"
              >
                <Hash className="w-4 h-4 text-accent" />
                <span className={selectedTag.color.split(" ").slice(1, 3).join(" ")}>{selectedTag.label}</span>
              </button>

              {showTagPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 mt-2 bg-card border border-border rounded-lg shadow-xl py-2 z-10 min-w-[140px]"
                >
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setSelectedTag(tag)
                        setShowTagPicker(false)
                      }}
                      className={cn(
                        "w-full px-4 py-2 text-sm text-left hover:bg-secondary/50 transition-colors flex items-center gap-2",
                        selectedTag.id === tag.id && "bg-primary/10",
                      )}
                    >
                      <Hash className="w-3.5 h-3.5" />
                      {tag.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What do you want to do?"
            className="w-full text-xl font-semibold bg-transparent outline-none placeholder:text-muted-foreground"
            autoFocus
          />

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Date picker */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowCalendar(!showCalendar)
                    setShowTimePicker(false)
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-150",
                    showCalendar ? "bg-primary/15 text-primary" : "bg-secondary hover:bg-secondary/80 text-foreground",
                  )}
                >
                  <Calendar className="w-4 h-4" />
                  {getDateLabel()}
                </button>

                {showCalendar && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-full left-0 mt-2 bg-card border border-border rounded-lg shadow-2xl p-4 z-20 w-[300px]"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() =>
                          setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))
                        }
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-semibold">
                        {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                      </span>
                      <button
                        onClick={() =>
                          setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))
                        }
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-2 mb-3">
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                        <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-4">
                      {Array.from({ length: startingDay }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1
                        const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)
                        const isSelected = selectedDate.toDateString() === date.toDateString()
                        const isTodayDate = new Date().toDateString() === date.toDateString()

                        return (
                          <motion.button
                            key={day}
                            whileHover={{ scale: 1.05 }}
                            onClick={() => {
                              setSelectedDate(date)
                              setShowCalendar(false)
                            }}
                            className={cn(
                              "w-9 h-9 text-sm rounded-lg font-medium transition-all duration-150 flex items-center justify-center",
                              isSelected && "bg-primary text-primary-foreground",
                              !isSelected && isTodayDate && "bg-accent text-accent-foreground",
                              !isSelected && !isTodayDate && "hover:bg-secondary text-foreground",
                            )}
                          >
                            {day}
                          </motion.button>
                        )
                      })}
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-border">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        onClick={() => {
                          setSelectedDate(new Date())
                          setShowCalendar(false)
                        }}
                        className="flex-1 py-2 text-xs font-semibold bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                      >
                        Today
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        onClick={() => {
                          const tomorrow = new Date()
                          tomorrow.setDate(tomorrow.getDate() + 1)
                          setSelectedDate(tomorrow)
                          setShowCalendar(false)
                        }}
                        className="flex-1 py-2 text-xs font-semibold bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                      >
                        Tomorrow
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Time picker */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowTimePicker(!showTimePicker)
                    setShowCalendar(false)
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-150",
                    showTimePicker
                      ? "bg-primary/15 text-primary"
                      : "bg-secondary hover:bg-secondary/80 text-foreground",
                  )}
                >
                  <Clock className="w-4 h-4" />
                  {formatTime(selectedTime)}
                </button>

                {showTimePicker && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-full left-0 mt-2 bg-card border border-border rounded-lg shadow-2xl p-4 z-20 w-[240px]"
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-2 block">Time</label>
                        <input
                          type="time"
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-2 block">Duration</label>
                        <select
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="0:15">15 minutes</option>
                          <option value="0:30">30 minutes</option>
                          <option value="0:45">45 minutes</option>
                          <option value="1:00">1 hour</option>
                          <option value="1:30">1.5 hours</option>
                          <option value="2:00">2 hours</option>
                          <option value="3:00">3 hours</option>
                        </select>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setShowTimePicker(false)}
                        className="w-full py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Done
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-secondary/30 flex items-center justify-end gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={!title.trim()}
            className={cn(
              "px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-150",
              title.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-muted-foreground cursor-not-allowed",
            )}
          >
            Create task
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
