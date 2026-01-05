
import { create } from 'zustand';
import { Task, Column, DailyTask, IntegrationType, GitHubIssue, GitHubPR, GmailMessage, NotionPage } from '@/types';
import { generateTasks, mockDailyTasks, mockGitHubIssues, mockGitHubPRs, mockGmailMessages, mockNotionPages } from '@/lib/mockData';
import { addDays, format, startOfDay } from 'date-fns';
import { FilterTag, FilterStatus } from '@/components/dashboard/kanban/FilterDropdown';

export type ViewMode = 'board' | 'calendar';

export type IntegrationDetailType =
    | { type: 'github-issue'; data: GitHubIssue }
    | { type: 'github-pr'; data: GitHubPR }
    | { type: 'gmail'; data: GmailMessage }
    | { type: 'notion'; data: NotionPage }
    | null;

interface AppState {
    tasks: Task[];
    dailyTasks: DailyTask[];
    columns: Column[];
    activeIntegration: IntegrationType;
    selectedTask: Task | null;
    showTaskModal: boolean;
    showCreateModal: boolean;
    showTodayPanel: boolean;
    showDailyPlanner: boolean;
    showWeeklyRituals: boolean;
    weeklyRitualType: 'planning' | 'review';
    focusMode: boolean;
    focusTask: Task | null;
    githubIssues: GitHubIssue[];
    githubPRs: GitHubPR[];
    gmailMessages: GmailMessage[];
    notionPages: NotionPage[];
    integrationTab: 'issues' | 'prs';
    viewMode: ViewMode;
    filterTags: FilterTag[];
    filterStatus: FilterStatus;
    selectedIntegrationDetail: IntegrationDetailType;
    showIntegrationModal: boolean;

    // Actions
    setActiveIntegration: (integration: IntegrationType) => void;
    setSelectedTask: (task: Task | null) => void;
    setShowTaskModal: (show: boolean) => void;
    setShowCreateModal: (show: boolean) => void;
    setShowTodayPanel: (show: boolean) => void;
    setShowDailyPlanner: (show: boolean) => void;
    setShowWeeklyRituals: (show: boolean, type?: 'planning' | 'review') => void;
    setFocusMode: (focus: boolean) => void;
    setFocusTask: (task: Task | null) => void;
    setIntegrationTab: (tab: 'issues' | 'prs') => void;
    setViewMode: (mode: ViewMode) => void;
    setFilterTags: (tags: FilterTag[]) => void;
    setFilterStatus: (status: FilterStatus) => void;
    setSelectedIntegrationDetail: (detail: IntegrationDetailType) => void;
    setShowIntegrationModal: (show: boolean) => void;
    openIntegrationDetail: (detail: IntegrationDetailType) => void;
    addTask: (task: Omit<Task, 'id'>) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;
    moveTask: (taskId: string, newDate: string) => void;
    toggleDailyTask: (id: string) => void;
    addDailyTask: (task: Omit<DailyTask, 'id'>) => void;
    // Selector-like helper
    getFilteredTasks: () => Task[];
}

function generateColumns(): Column[] {
    const columns: Column[] = [];
    const start = startOfDay(new Date());

    for (let i = 0; i < 14; i++) {
        const date = addDays(start, i);
        columns.push({
            id: format(date, 'yyyy-MM-dd'),
            date,
            tasks: [],
        });
    }

    return columns;
}

export const useStore = create<AppState>((set, get) => ({
    tasks: generateTasks(),
    dailyTasks: mockDailyTasks,
    columns: generateColumns(),
    activeIntegration: null,
    selectedTask: null,
    showTaskModal: false,
    showCreateModal: false,
    showTodayPanel: false,
    showDailyPlanner: false,
    showWeeklyRituals: false,
    weeklyRitualType: 'planning',
    focusMode: false,
    focusTask: null,
    githubIssues: mockGitHubIssues,
    githubPRs: mockGitHubPRs,
    gmailMessages: mockGmailMessages,
    notionPages: mockNotionPages,
    integrationTab: 'issues',
    viewMode: 'board',
    filterTags: ['all'],
    filterStatus: 'all',
    selectedIntegrationDetail: null,
    showIntegrationModal: false,

    setActiveIntegration: (integration) => set({ activeIntegration: integration }),
    setSelectedTask: (task) => set({ selectedTask: task }),
    setShowTaskModal: (show) => set({ showTaskModal: show }),
    setShowCreateModal: (show) => set({ showCreateModal: show }),
    setShowTodayPanel: (show) => set({ showTodayPanel: show }),
    setShowDailyPlanner: (show) => set({ showDailyPlanner: show }),
    setShowWeeklyRituals: (show, type) => set((state) => ({
        showWeeklyRituals: show,
        weeklyRitualType: type || state.weeklyRitualType
    })),
    setFocusMode: (focus) => set({ focusMode: focus }),
    setFocusTask: (task) => set({ focusTask: task }),
    setIntegrationTab: (tab) => set({ integrationTab: tab }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setFilterTags: (tags) => set({ filterTags: tags }),
    setFilterStatus: (status) => set({ filterStatus: status }),
    setSelectedIntegrationDetail: (detail) => set({ selectedIntegrationDetail: detail }),
    setShowIntegrationModal: (show) => set({ showIntegrationModal: show }),

    openIntegrationDetail: (detail) => {
        set({ selectedIntegrationDetail: detail, showIntegrationModal: true });
    },

    addTask: (task) => set((state) => {
        const newTask: Task = {
            ...task,
            id: `task-${Date.now()}`,
        };
        return { tasks: [...state.tasks, newTask] };
    }),

    updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map(task =>
            task.id === id ? { ...task, ...updates } : task
        )
    })),

    deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter(task => task.id !== id)
    })),

    moveTask: (taskId, newDate) => set((state) => ({
        tasks: state.tasks.map(task =>
            task.id === taskId ? { ...task, date: newDate } : task
        )
    })),

    toggleDailyTask: (id) => set((state) => ({
        dailyTasks: state.dailyTasks.map(task =>
            task.id === id ? { ...task, completed: !task.completed } : task
        )
    })),

    addDailyTask: (task) => set((state) => {
        const newTask: DailyTask = {
            ...task,
            id: `daily-${Date.now()}`,
        };
        return { dailyTasks: [...state.dailyTasks, newTask] };
    }),

    getFilteredTasks: () => {
        const { tasks, filterTags, filterStatus } = get();
        return tasks.filter(task => {
            const tagMatch = filterTags.includes('all') || filterTags.includes(task.tag as FilterTag);
            const statusMatch = filterStatus === 'all' ||
                (filterStatus === 'completed' && task.completed) ||
                (filterStatus === 'pending' && !task.completed);
            return tagMatch && statusMatch;
        });
    },
}));
