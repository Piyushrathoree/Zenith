import type { KanbanData, IntegrationCard } from "./types"

function generateColumns(): KanbanData["columns"] {
  const columns: KanbanData["columns"] = []
  const today = new Date()

  for (let i = 0; i < 14; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)

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

    columns.push({
      id: `col-${i}`,
      dayName: dayNames[date.getDay()],
      date: `${monthNames[date.getMonth()]} ${date.getDate()}`,
      fullDate: date,
      tasks: [],
    })
  }

  // Add sample tasks to first few days
  columns[0].tasks = [
    {
      id: "task-1",
      title: "3 dsa questions",
      time: "9:00 am",
      duration: "1:00",
      tag: "#work",
      tagColor: "orange",
    },
    {
      id: "task-2",
      title: "3 hours on project",
      time: "10:00 am",
      duration: "1:00",
      tag: "#work",
      tagColor: "orange",
    },
    {
      id: "task-3",
      title: "Add script for test cases",
      time: "11:00 am",
      duration: "1:00",
      tag: "#work",
      tagColor: "orange",
      integration: "github",
    },
  ]

  columns[1].tasks = [
    {
      id: "task-4",
      title: "Code review session",
      time: "2:00 pm",
      duration: "1:30",
      tag: "#work",
      tagColor: "orange",
    },
  ]

  columns[2].tasks = [
    {
      id: "task-5",
      title: "Read technical book",
      time: "10:00 am",
      duration: "2:00",
      tag: "#personal",
      tagColor: "green",
    },
  ]

  return columns
}

export const initialKanbanData: KanbanData = {
  columns: generateColumns(),
}

export const integrationCards: IntegrationCard[] = [
  {
    id: "int-1",
    source: "github",
    title: "Add script for test cases",
    repository: "kubestellar/kubectl-multi-plugin",
    issueNumber: 78,
    timestamp: "a month ago",
    author: "Rupam-It",
    labels: ["help wanted"],
    dueDate: "Today",
    status: "open",
    createdAt: "Oct 20, 2025",
    avatarUrl: "/diverse-avatars.png",
    description: `Phase 1: Unit Tests (Do these first)
Priority order:

pkg/cluster/discovery_test.go - Core logic, most important

Test cluster discovery
Test WDS filtering
Test error handling

pkg/cmd/get_test.go - Main command that works

Test resource routing
Test output formatting
Test flag parsing

pkg/cmd/root_test.go - CLI setup

Test command initialization
Test global flags

Other cmd tests - For the commands that are implemented:

describe_test.go
logs_test.go
deploy_test.go
etc.

Phase 2: E2E Tests (Do after unit tests)
Create test/e2e/ directory:

Setup kind clusters
Test actual commands end-to-end
Test multi-cluster scenarios`,
    assignees: ["Piyushrathoree"],
  },
  {
    id: "int-2",
    source: "github",
    title: "[Bug]: Unable to create the context and no websocket connection",
    repository: "kubestellar/ui",
    issueNumber: 2141,
    timestamp: "a month ago",
    author: "alokdangre",
    labels: ["bug", "help wanted", "hacktoberfest"],
    status: "open",
    avatarUrl: "/diverse-group-avatars.png",
    assignees: ["Piyushrathoree"],
  },
  {
    id: "int-3",
    source: "github",
    title: "[Feature] implementing a root level testing script",
    repository: "OpsiMate/OpsiMate",
    issueNumber: 456,
    timestamp: "2 months ago",
    author: "Piyushrathoree",
    labels: ["enhancement", "hacktoberfest", "hacktoberfest-accepted"],
    status: "open",
    avatarUrl: "/diverse-group-avatars.png",
    assignees: ["Piyushrathoree"],
  },
  {
    id: "int-4",
    source: "github",
    title: "Test – Add end-to-end tests for complete user workflows",
    repository: "OpsiMate/OpsiMate",
    issueNumber: 452,
    timestamp: "2 months ago",
    author: "idanlodzki",
    labels: ["bug", "good first issue", "Test", "hacktoberfest", "hacktoberfest-accepted"],
    status: "open",
    avatarUrl: "/diverse-group-avatars.png",
    assignees: ["Piyushrathoree"],
  },
  {
    id: "int-5",
    source: "github",
    title: "improve usage_guide docs",
    repository: "kubestellar/kubectl-multi-plugin",
    issueNumber: 73,
    timestamp: "2 months ago",
    author: "Rupam-It",
    labels: ["good first issue", "help wanted"],
    status: "open",
    avatarUrl: "/diverse-group-avatars.png",
    assignees: [],
  },
  {
    id: "int-6",
    source: "github",
    title: "dashboard overlapping when trying to switch language",
    repository: "kubestellar/ui",
    issueNumber: 1887,
    timestamp: "3 months ago",
    author: "MAVRICK-1",
    labels: ["bug", "good first issue"],
    status: "open",
    avatarUrl: "/diverse-group-avatars.png",
    assignees: [],
  },
  {
    id: "int-7",
    source: "gmail",
    title: "Q4 Planning Meeting Invitation",
    sender: "sarah.johnson@company.com",
    timestamp: "1 hour ago",
    preview:
      "Hi team, I wanted to schedule our Q4 planning meeting. Please review the attached agenda and let me know your availability for next week...",
    dueDate: "Dec 1",
  },
  {
    id: "int-8",
    source: "gmail",
    title: "Code Review Feedback",
    sender: "dev-lead@startup.io",
    timestamp: "3 hours ago",
    preview:
      "Thanks for submitting the PR! I've left some comments on the authentication flow. The main concern is around the token refresh logic...",
  },
  {
    id: "int-9",
    source: "notion",
    title: "Product Roadmap 2025",
    workspace: "Company Wiki",
    timestamp: "yesterday",
    description: "Strategic planning document outlining key initiatives and milestones for the upcoming year.",
  },
  {
    id: "int-10",
    source: "notion",
    title: "Engineering Best Practices",
    workspace: "Engineering",
    timestamp: "2 days ago",
    description: "Comprehensive guide covering code standards, review processes, and deployment procedures.",
  },
]
