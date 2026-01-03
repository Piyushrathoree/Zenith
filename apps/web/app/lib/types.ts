export interface Task {
  id: string
  title: string
  time: string
  duration: string
  tag?: string
  tagColor?: string
  isReminder?: boolean
  reminderColor?: string
  integration?: "github" | "gmail" | "notion"
  integrationData?: IntegrationCard
  date?: string
  notes?: string
  completed?: boolean
  plannedDuration?: string
  actualDuration?: string
}

export interface KanbanColumn {
  id: string
  dayName: string
  date: string
  fullDate: Date
  tasks: Task[]
}

export interface KanbanData {
  columns: KanbanColumn[]
}

export interface IntegrationCard {
  id: string
  source: "github" | "gmail" | "notion"
  title: string
  repository?: string
  issueNumber?: number
  timestamp: string
  author?: string
  labels?: string[]
  dueDate?: string
  avatarUrl?: string
  description?: string
  assignees?: string[]
  sender?: string
  preview?: string
  workspace?: string
  status?: "open" | "closed"
  createdAt?: string
}

export interface DailyPlannerTask {
  id: string
  title: string
  completed: boolean
  time?: string
}

export interface FocusSession {
  taskId: string
  taskTitle: string
  duration: number // in minutes
  remainingTime: number // in seconds
  isRunning: boolean
}
