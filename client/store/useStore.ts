
import { create } from 'zustand';
import { toast } from 'sonner';
import { Task, Column, DailyTask, IntegrationType, GitHubIssue, GitHubPR, GmailMessage, NotionPage } from '@/types';
import { mockGitHubIssues, mockGitHubPRs, mockGmailMessages, mockNotionPages } from '@/lib/mockData';
import { addDays, format, startOfDay } from 'date-fns';
import { FilterTag, FilterStatus } from '@/components/dashboard/kanban/FilterDropdown';
import { ApiRequestError } from '@/lib/api/client';
import {
    createTask,
    deleteTaskRequest,
    getAllChannels,
    getAllTasks,
    createChannelRequest,
    getTodaysPlan,
    updateDailyPlanner,
    updateTaskRequest,
    ServerChannel,
} from '@/lib/api/planner';
import {
    mapCompletedToStatusPayload,
    mapToClientDailyTask,
    mapToClientTask,
    mapToCreateDailyServerTaskPayload,
    mapToCreateServerTaskPayload,
    mapToUpdateServerTaskPayload,
    mergeServerTaskUpdate,
} from '@/lib/api/plannerMapping';

export type ViewMode = 'board' | 'calendar';

/**
 * Weekly rituals (goals + top priorities) shown in WeeklyRitualsPanel.tsx.
 * There is no backend "rituals" model yet, so this is intentionally a
 * client-only slice of the store - it keeps the panel's state consistent
 * within a session and across remounts (it used to be a local useState in
 * the panel component, which reset every time the panel unmounted), but it
 * does not survive a full page reload or sync across devices. Durable
 * persistence needs a future backend model (e.g. a WeeklyRitual document
 * keyed by week + userId) plus matching planner-style service/mapping
 * functions; flagged here as a follow up, not implemented in this pass.
 */
export interface WeeklyGoal {
    id: string;
    title: string;
    progress: number;
    target: number;
}

export type IntegrationDetailType =
    | { type: 'github-issue'; data: GitHubIssue }
    | { type: 'github-pr'; data: GitHubPR }
    | { type: 'gmail'; data: GmailMessage }
    | { type: 'notion'; data: NotionPage }
    | null;

// The client's tag chips double as the server's task channels - see the
// mapping decisions documented at the top of lib/api/plannerMapping.ts.
const DEFAULT_CHANNEL_NAMES: Task['tag'][] = ['work', 'personal', 'health'];

function todayDateKey(): string {
    return format(new Date(), 'yyyy-MM-dd');
}

/** Extracts a human readable message out of whatever a failed request throws. */
function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiRequestError) return error.message || fallback;
    if (error instanceof Error) return error.message || fallback;
    return fallback;
}

/** Temp ids are used for optimistic rows that have not been persisted yet. */
function isTempId(id: string): boolean {
    return id.startsWith('temp-');
}

interface AppState {
    tasks: Task[];
    dailyTasks: DailyTask[];
    columns: Column[];
    channels: ServerChannel[];
    isPlannerLoading: boolean;
    plannerLoaded: boolean;
    plannerError: string | null;
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
    // Weekly rituals - client-only slice, see the WeeklyGoal comment above.
    weeklyGoals: WeeklyGoal[];
    weeklyPriorities: string[];

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
    /** Fetches tasks + channels + today's daily plan from the backend and hydrates the store. */
    loadInitialData: () => Promise<void>;
    addTask: (task: Omit<Task, 'id'>) => Promise<void>;
    updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    moveTask: (taskId: string, newDate: string) => Promise<void>;
    toggleDailyTask: (id: string) => Promise<void>;
    addDailyTask: (task: Omit<DailyTask, 'id'>) => Promise<void>;
    // Weekly rituals actions - client-only, see WeeklyGoal comment above.
    addWeeklyGoal: (title: string) => void;
    updateWeeklyGoalProgress: (id: string, increment: number) => void;
    addWeeklyPriority: (text: string) => void;
    removeWeeklyPriority: (index: number) => void;
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
    // Planner data (tasks, daily tasks, channels) starts empty and is
    // populated by loadInitialData() once the user is authenticated - see
    // components/auth/RequireAuth.tsx. If the backend is unreachable this
    // simply stays empty rather than crashing the app (see loadInitialData).
    tasks: [],
    dailyTasks: [],
    columns: generateColumns(),
    channels: [],
    isPlannerLoading: false,
    plannerLoaded: false,
    plannerError: null,
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
    // Integration data stays mock backed - integrations are out of scope here.
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
    // Seeded with the same placeholder rituals the old local useState in
    // WeeklyRitualsPanel.tsx used to have, just lifted up into the store.
    weeklyGoals: [
        { id: '1', title: 'Complete project milestones', progress: 3, target: 5 },
        { id: '2', title: 'Exercise sessions', progress: 2, target: 4 },
        { id: '3', title: 'Read for 30 minutes', progress: 5, target: 7 },
    ],
    weeklyPriorities: [
        'Finish Q4 report',
        'Team sync meeting',
        'Review pull requests',
    ],

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

    loadInitialData: async () => {
        if (get().isPlannerLoading) return;
        set({ isPlannerLoading: true, plannerError: null });

        try {
            // Make sure the three tag channels exist server side. Failures here
            // are non fatal - the board still works purely off `due`/`status`
            // even if the Channel documents themselves could not be created.
            let channels: ServerChannel[] = [];
            try {
                channels = await getAllChannels();
                const existingNames = new Set(channels.map((c) => c.name));
                const missing = DEFAULT_CHANNEL_NAMES.filter((name) => !existingNames.has(name));
                if (missing.length > 0) {
                    const created = await Promise.allSettled(
                        missing.map((name) => createChannelRequest({ name }))
                    );
                    const newChannels = created
                        .filter((r): r is PromiseFulfilledResult<ServerChannel> => r.status === 'fulfilled')
                        .map((r) => r.value);
                    channels = [...channels, ...newChannels];
                }
            } catch {
                // Channel bootstrapping is best effort - swallow and continue.
                channels = [];
            }

            const serverTasks = await getAllTasks();

            let dailyTasks: DailyTask[] = [];
            try {
                const plan = await getTodaysPlan();
                dailyTasks = plan.tasks.map(mapToClientDailyTask);
            } catch (error) {
                // 404 just means no plan exists for today yet - that is not an
                // error state, the daily planner starts empty until the user
                // adds a ritual (which upserts the plan).
                if (!(error instanceof ApiRequestError && error.statusCode === 404)) {
                    throw error;
                }
                dailyTasks = [];
            }

            set({
                tasks: serverTasks.map(mapToClientTask),
                dailyTasks,
                channels,
                isPlannerLoading: false,
                plannerLoaded: true,
                plannerError: null,
            });
        } catch (error) {
            const message = getErrorMessage(error, 'Could not load your planner data');
            set({ isPlannerLoading: false, plannerLoaded: true, plannerError: message });
            toast.error(`${message}. Showing an empty board until the connection is restored.`);
        }
    },

    addTask: async (task) => {
        const tempId = `temp-${Date.now()}`;
        const optimisticTask: Task = { ...task, id: tempId };
        set((state) => ({ tasks: [...state.tasks, optimisticTask] }));

        // mapToCreateServerTaskPayload now also forwards duration/startTime
        // (from task.duration / task.time), so a task created with a chosen
        // duration/time (see CreateTaskModal.tsx) persists across reload
        // instead of resetting to a hardcoded default - see plannerMapping.ts.
        const { channel, payload } = mapToCreateServerTaskPayload(task);
        try {
            const created = await createTask(channel, payload);
            const mapped = mapToClientTask(created);
            set((state) => ({
                tasks: state.tasks.map((t) => (t.id === tempId ? mapped : t)),
            }));
        } catch (error) {
            set((state) => ({ tasks: state.tasks.filter((t) => t.id !== tempId) }));
            toast.error(getErrorMessage(error, 'Could not create task'));
        }
    },

    updateTask: async (id, updates) => {
        const previousTasks = get().tasks;
        set((state) => ({
            tasks: state.tasks.map((task) =>
                task.id === id ? { ...task, ...updates } : task
            )
        }));

        // Optimistic rows still waiting on their create request cannot be
        // persisted yet - the create response will already carry `updates`
        // worth of data once it lands, or the row will roll back if it fails.
        if (isTempId(id)) return;

        // mapToUpdateServerTaskPayload now forwards updates.tag as `channel`
        // and updates.duration/updates.time as `duration`/`startTime`, so a
        // tag change (moving a task between work/personal/health) or a
        // duration/time edit persists to the backend and survives reload,
        // using the same optimistic-then-reconcile / rollback-on-failure
        // flow already in place below. moveTask() (date drag and drop) goes
        // through this same path with { date: newDate }.
        const payload = mapToUpdateServerTaskPayload(updates);
        if (Object.keys(payload).length === 0) return;

        try {
            const updated = await updateTaskRequest(id, payload);
            set((state) => ({
                tasks: state.tasks.map((task) =>
                    task.id === id ? mergeServerTaskUpdate(task, updated) : task
                ),
            }));
        } catch (error) {
            set({ tasks: previousTasks });
            toast.error(getErrorMessage(error, 'Could not update task'));
        }
    },

    deleteTask: async (id) => {
        const previousTasks = get().tasks;
        set((state) => ({
            tasks: state.tasks.filter(task => task.id !== id)
        }));

        if (isTempId(id)) return;

        try {
            await deleteTaskRequest(id);
        } catch (error) {
            set({ tasks: previousTasks });
            toast.error(getErrorMessage(error, 'Could not delete task'));
        }
    },

    moveTask: async (taskId, newDate) => {
        await get().updateTask(taskId, { date: newDate });
    },

    toggleDailyTask: async (id) => {
        const previousDailyTasks = get().dailyTasks;
        const target = previousDailyTasks.find((task) => task.id === id);
        if (!target) return;

        const nextCompleted = !target.completed;
        set((state) => ({
            dailyTasks: state.dailyTasks.map(task =>
                task.id === id ? { ...task, completed: nextCompleted } : task
            )
        }));

        // Also reflect the toggle on the board if the same task is shown there
        // (dailyTasks ids are the underlying Task's server id - see
        // mapToClientDailyTask in plannerMapping.ts).
        set((state) => ({
            tasks: state.tasks.map((task) =>
                task.id === id ? { ...task, completed: nextCompleted } : task
            ),
        }));

        if (isTempId(id)) return;

        try {
            await updateTaskRequest(id, mapCompletedToStatusPayload(nextCompleted));
        } catch (error) {
            set({ dailyTasks: previousDailyTasks });
            toast.error(getErrorMessage(error, 'Could not update task'));
        }
    },

    addDailyTask: async (task) => {
        const tempId = `temp-daily-${Date.now()}`;
        const optimisticTask: DailyTask = { ...task, id: tempId };
        set((state) => ({ dailyTasks: [...state.dailyTasks, optimisticTask] }));

        const { channel, payload } = mapToCreateDailyServerTaskPayload(task);
        try {
            const createdTask = await createTask(channel, payload);
            const currentIds = get()
                .dailyTasks
                .map((t) => t.id)
                .filter((taskId) => taskId !== tempId && !isTempId(taskId));
            const plan = await updateDailyPlanner(todayDateKey(), {
                tasks: [...currentIds, createdTask._id],
            });
            set({ dailyTasks: plan.tasks.map(mapToClientDailyTask) });
        } catch (error) {
            set((state) => ({ dailyTasks: state.dailyTasks.filter((t) => t.id !== tempId) }));
            toast.error(getErrorMessage(error, 'Could not add daily task'));
        }
    },

    addWeeklyGoal: (title) => set((state) => ({
        weeklyGoals: [
            ...state.weeklyGoals,
            { id: `${Date.now()}`, title, progress: 0, target: 5 },
        ],
    })),

    updateWeeklyGoalProgress: (id, increment) => set((state) => ({
        weeklyGoals: state.weeklyGoals.map((goal) =>
            goal.id === id
                ? { ...goal, progress: Math.max(0, Math.min(goal.target, goal.progress + increment)) }
                : goal
        ),
    })),

    addWeeklyPriority: (text) => set((state) => ({
        weeklyPriorities: [...state.weeklyPriorities, text],
    })),

    removeWeeklyPriority: (index) => set((state) => ({
        weeklyPriorities: state.weeklyPriorities.filter((_, i) => i !== index),
    })),

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
