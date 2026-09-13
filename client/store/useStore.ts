
import { create } from 'zustand';
import { toast } from 'sonner';
import { Task, Column, DailyTask, IntegrationType, GitHubIssue, GitHubPR, GmailMessage, NotionPage } from '@/types';
import { addDays, format, startOfDay, startOfWeek } from 'date-fns';
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
import {
    ConnectedIntegration,
    IntegrationFetchError,
    IntegrationProvider,
    ProviderInfo,
    disconnectIntegration as disconnectIntegrationRequest,
    getIntegrationItems,
    listConnectedIntegrations,
    listProviders,
    startProviderConnect,
} from '@/lib/api/integrations';
import { mapIntegrationItems } from '@/lib/api/integrationsMapping';

export type ViewMode = 'board' | 'calendar';

/**
 * Weekly rituals (goals + top priorities) shown in WeeklyRitualsPanel.tsx.
 * There is no backend rituals model yet, so this slice is client-only and
 * stored in localStorage for the current calendar week. When a new week
 * starts the list is emptied so last week's goals do not carry over.
 */
export interface WeeklyGoal {
    id: string;
    title: string;
    progress: number;
    target: number;
}

const WEEKLY_RITUALS_STORAGE_KEY = "zenith_weekly_rituals";

function currentWeekKey(): string {
    return format(startOfWeek(new Date()), "yyyy-MM-dd");
}

interface WeeklyRitualsSnapshot {
    weekKey: string;
    weeklyGoals: WeeklyGoal[];
    weeklyPriorities: string[];
}

function emptyWeeklyRituals(): WeeklyRitualsSnapshot {
    return {
        weekKey: currentWeekKey(),
        weeklyGoals: [],
        weeklyPriorities: [],
    };
}

function loadWeeklyRituals(): WeeklyRitualsSnapshot {
    const fresh = emptyWeeklyRituals();
    if (typeof window === "undefined") return fresh;
    try {
        const raw = window.localStorage.getItem(WEEKLY_RITUALS_STORAGE_KEY);
        if (!raw) return fresh;
        const parsed = JSON.parse(raw) as WeeklyRitualsSnapshot;
        if (parsed.weekKey !== fresh.weekKey) return fresh;
        return {
            weekKey: parsed.weekKey,
            weeklyGoals: Array.isArray(parsed.weeklyGoals) ? parsed.weeklyGoals : [],
            weeklyPriorities: Array.isArray(parsed.weeklyPriorities)
                ? parsed.weeklyPriorities
                : [],
        };
    } catch {
        return fresh;
    }
}

function saveWeeklyRituals(snapshot: WeeklyRitualsSnapshot): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WEEKLY_RITUALS_STORAGE_KEY, JSON.stringify(snapshot));
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
    focusMinimized: boolean;
    focusTask: Task | null;
    focusTitle: string;
    focusTimeLeft: number;
    focusRunning: boolean;
    focusDurationMin: number;
    githubIssues: GitHubIssue[];
    githubPRs: GitHubPR[];
    gmailMessages: GmailMessage[];
    notionPages: NotionPage[];
    connectedIntegrations: ConnectedIntegration[];
    availableProviders: ProviderInfo[];
    integrationErrors: IntegrationFetchError[];
    isIntegrationsLoading: boolean;
    integrationsLoaded: boolean;
    integrationsError: string | null;
    isIntegrationsRefreshing: boolean;
    integrationTab: 'issues' | 'prs';
    viewMode: ViewMode;
    filterTags: FilterTag[];
    filterStatus: FilterStatus;
    selectedIntegrationDetail: IntegrationDetailType;
    showIntegrationModal: boolean;
    // Weekly rituals - client-only, keyed to the current calendar week.
    weeklyWeekKey: string;
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
    setFocusTitle: (title: string) => void;
    setFocusDurationMin: (minutes: number) => void;
    setFocusRunning: (running: boolean) => void;
    tickFocus: () => void;
    resetFocusTimer: () => void;
    minimizeFocus: () => void;
    exitFocus: () => void;
    setIntegrationTab: (tab: 'issues' | 'prs') => void;
    setViewMode: (mode: ViewMode) => void;
    setFilterTags: (tags: FilterTag[]) => void;
    setFilterStatus: (status: FilterStatus) => void;
    setSelectedIntegrationDetail: (detail: IntegrationDetailType) => void;
    setShowIntegrationModal: (show: boolean) => void;
    openIntegrationDetail: (detail: IntegrationDetailType) => void;
    /** Fetches tasks + channels + today's daily plan from the backend and hydrates the store. */
    loadInitialData: () => Promise<void>;
    /** Fetches providers + connected integrations + items from the backend and hydrates the store. */
    loadIntegrations: () => Promise<void>;
    /** Re-fetches items only, bypassing the server cache, for the panel's refresh button. */
    refreshIntegrationItems: () => Promise<void>;
    connectIntegration: (provider: IntegrationProvider) => Promise<void>;
    disconnectIntegration: (provider: IntegrationProvider) => Promise<void>;
    addTask: (task: Omit<Task, 'id'>) => Promise<void>;
    updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    moveTask: (taskId: string, newDate: string) => Promise<void>;
    toggleDailyTask: (id: string) => Promise<void>;
    addDailyTask: (task: Omit<DailyTask, 'id'>) => Promise<void>;
    // Weekly rituals actions - client-only, see WeeklyGoal comment above.
    addWeeklyGoal: (title: string) => void;
    removeWeeklyGoal: (id: string) => void;
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
    focusMinimized: false,
    focusTask: null,
    focusTitle: "",
    focusTimeLeft: 25 * 60,
    focusRunning: false,
    focusDurationMin: 25,
    // Integration data starts empty and is populated by loadIntegrations()
    // once the user is authenticated, the same way the planner slice above
    // is populated by loadInitialData() - see components/auth/RequireAuth.tsx.
    githubIssues: [],
    githubPRs: [],
    gmailMessages: [],
    notionPages: [],
    connectedIntegrations: [],
    availableProviders: [],
    integrationErrors: [],
    isIntegrationsLoading: false,
    integrationsLoaded: false,
    integrationsError: null,
    isIntegrationsRefreshing: false,
    integrationTab: 'issues',
    viewMode: 'board',
    filterTags: ['all'],
    filterStatus: 'all',
    selectedIntegrationDetail: null,
    showIntegrationModal: false,
    ...loadWeeklyRituals(),

    setActiveIntegration: (integration) => set({ activeIntegration: integration }),
    setSelectedTask: (task) => set({ selectedTask: task }),
    setShowTaskModal: (show) => set({ showTaskModal: show }),
    setShowCreateModal: (show) => set({ showCreateModal: show }),
    setShowTodayPanel: (show) => set({ showTodayPanel: show }),
    setShowDailyPlanner: (show) => set({ showDailyPlanner: show }),
    setShowWeeklyRituals: (show, type) => set((state) => {
        const weekKey = currentWeekKey();
        const weekChanged = state.weeklyWeekKey !== weekKey;
        const next = {
            showWeeklyRituals: show,
            weeklyRitualType: type || state.weeklyRitualType,
            ...(weekChanged
                ? { weeklyWeekKey: weekKey, weeklyGoals: [], weeklyPriorities: [] }
                : {}),
        };
        if (weekChanged) {
            saveWeeklyRituals({
                weekKey,
                weeklyGoals: [],
                weeklyPriorities: [],
            });
        }
        return next;
    }),
    setFocusMode: (focus) => set((state) => ({
        focusMode: focus,
        focusMinimized: focus ? false : state.focusRunning,
    })),
    setFocusTask: (task) => set({
        focusTask: task,
        focusTitle: task?.title ?? "",
    }),
    setFocusTitle: (title) => set({ focusTitle: title, focusTask: null }),
    setFocusDurationMin: (minutes) => set((state) => ({
        focusDurationMin: minutes,
        focusTimeLeft: state.focusRunning ? state.focusTimeLeft : minutes * 60,
        focusRunning: state.focusRunning ? state.focusRunning : false,
    })),
    setFocusRunning: (running) => set({ focusRunning: running }),
    tickFocus: () => set((state) => {
        if (!state.focusRunning) return state;
        if (state.focusTimeLeft <= 1) {
            return { focusTimeLeft: 0, focusRunning: false };
        }
        return { focusTimeLeft: state.focusTimeLeft - 1 };
    }),
    resetFocusTimer: () => set((state) => ({
        focusTimeLeft: state.focusDurationMin * 60,
        focusRunning: false,
    })),
    minimizeFocus: () => set({ focusMode: false, focusMinimized: true }),
    exitFocus: () => set((state) => ({
        focusMode: false,
        focusMinimized: false,
        focusRunning: false,
        focusTimeLeft: state.focusDurationMin * 60,
        focusTask: null,
        focusTitle: "",
    })),
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

    loadIntegrations: async () => {
        if (get().isIntegrationsLoading) return;
        set({ isIntegrationsLoading: true, integrationsError: null });

        // Promise.allSettled rather than Promise.all: a free plan user gets a
        // 403 back from all three of these endpoints, since the server gates
        // integrations behind Pro (see featureGate.middleware.ts). With
        // Promise.all only the first rejection is observed and the other two
        // become unhandled promise rejections logged to the console on every
        // free plan dashboard load, even though the outcome (an empty,
        // gated panel) is the same either way. Settling all three lets us
        // tell that normal gated case apart from a genuine failure, and lets
        // a partial success (e.g. providers and items load but the connected
        // list request drops) still render instead of being thrown away.
        const [providersResult, connectedResult, itemsResult] = await Promise.allSettled([
            listProviders(),
            listConnectedIntegrations(),
            getIntegrationItems(),
        ]);
        const results = [providersResult, connectedResult, itemsResult];

        const isForbidden = (result: PromiseSettledResult<unknown>) =>
            result.status === 'rejected' &&
            result.reason instanceof ApiRequestError &&
            result.reason.statusCode === 403;

        if (results.every(isForbidden)) {
            // Normal gated free plan state - renders as an empty integrations
            // panel with no toast, mirrors the 404 handling for a missing
            // daily plan in loadInitialData above.
            set({
                availableProviders: [],
                connectedIntegrations: [],
                integrationErrors: [],
                githubIssues: [],
                githubPRs: [],
                gmailMessages: [],
                notionPages: [],
                isIntegrationsLoading: false,
                integrationsLoaded: true,
                integrationsError: null,
            });
            return;
        }

        const genuineFailure = results.find(
            (result): result is PromiseRejectedResult => result.status === 'rejected' && !isForbidden(result)
        );

        if (genuineFailure) {
            const message = getErrorMessage(genuineFailure.reason, 'Could not load your integrations');
            set({ isIntegrationsLoading: false, integrationsLoaded: true, integrationsError: message });
            toast.error(`${message}. Showing an empty integrations panel until the connection is restored.`);
            return;
        }

        // Everything that did not succeed here is a gated 403, never a
        // genuine error - use whatever came back and treat the rest as
        // empty rather than discarding a partial result.
        const mapped = itemsResult.status === 'fulfilled'
            ? mapIntegrationItems(itemsResult.value.items)
            : { githubIssues: [], githubPRs: [], gmailMessages: [], notionPages: [] };

        set({
            availableProviders: providersResult.status === 'fulfilled' ? providersResult.value : [],
            connectedIntegrations: connectedResult.status === 'fulfilled' ? connectedResult.value : [],
            integrationErrors: itemsResult.status === 'fulfilled' ? itemsResult.value.errors : [],
            githubIssues: mapped.githubIssues,
            githubPRs: mapped.githubPRs,
            gmailMessages: mapped.gmailMessages,
            notionPages: mapped.notionPages,
            isIntegrationsLoading: false,
            integrationsLoaded: true,
            integrationsError: null,
        });
    },

    refreshIntegrationItems: async () => {
        set({ isIntegrationsRefreshing: true });

        try {
            const itemsResponse = await getIntegrationItems(true);
            const mapped = mapIntegrationItems(itemsResponse.items);
            set({
                githubIssues: mapped.githubIssues,
                githubPRs: mapped.githubPRs,
                gmailMessages: mapped.gmailMessages,
                notionPages: mapped.notionPages,
                integrationErrors: itemsResponse.errors,
            });
        } catch (error) {
            toast.error(getErrorMessage(error, 'Could not refresh your integrations'));
        } finally {
            set({ isIntegrationsRefreshing: false });
        }
    },

    connectIntegration: async (provider) => {
        // startProviderConnect() navigates the browser away to the provider's
        // consent screen on success, so there is nothing to set in state here.
        // If the request itself fails, that navigation never happens, so the
        // user needs a toast or they would otherwise see nothing at all.
        try {
            await startProviderConnect(provider);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Could not start the connection'));
        }
    },

    disconnectIntegration: async (provider) => {
        const previousConnectedIntegrations = get().connectedIntegrations;
        const previousGithubIssues = get().githubIssues;
        const previousGithubPRs = get().githubPRs;
        const previousGmailMessages = get().gmailMessages;
        const previousNotionPages = get().notionPages;

        set((state) => ({
            connectedIntegrations: state.connectedIntegrations.filter((c) => c.provider !== provider),
            githubIssues: provider === 'github' ? [] : state.githubIssues,
            githubPRs: provider === 'github' ? [] : state.githubPRs,
            gmailMessages: provider === 'gmail' ? [] : state.gmailMessages,
            notionPages: provider === 'notion' ? [] : state.notionPages,
        }));

        try {
            await disconnectIntegrationRequest(provider);
            toast.success(`Disconnected ${provider}`);
        } catch (error) {
            set({
                connectedIntegrations: previousConnectedIntegrations,
                githubIssues: previousGithubIssues,
                githubPRs: previousGithubPRs,
                gmailMessages: previousGmailMessages,
                notionPages: previousNotionPages,
            });
            toast.error(getErrorMessage(error, 'Could not disconnect the integration'));
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
        // Carry provenance through to the server so a task dragged in from
        // the integration panel keeps its origin after a reload instead of
        // looking like it was typed from scratch - purely additive, a task
        // with none of these fields sends exactly the payload it always did.
        if (task.source) payload.source = task.source;
        if (task.externalId) payload.externalId = task.externalId;
        if (task.link) payload.link = task.link;
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

    addWeeklyGoal: (title) => set((state) => {
        const weeklyGoals = [
            ...state.weeklyGoals,
            { id: `${Date.now()}`, title: title.trim(), progress: 0, target: 7 },
        ];
        saveWeeklyRituals({
            weekKey: state.weeklyWeekKey,
            weeklyGoals,
            weeklyPriorities: state.weeklyPriorities,
        });
        return { weeklyGoals };
    }),

    removeWeeklyGoal: (id) => set((state) => {
        const weeklyGoals = state.weeklyGoals.filter((goal) => goal.id !== id);
        saveWeeklyRituals({
            weekKey: state.weeklyWeekKey,
            weeklyGoals,
            weeklyPriorities: state.weeklyPriorities,
        });
        return { weeklyGoals };
    }),

    updateWeeklyGoalProgress: (id, increment) => set((state) => {
        const weeklyGoals = state.weeklyGoals.map((goal) =>
            goal.id === id
                ? { ...goal, progress: Math.max(0, Math.min(goal.target, goal.progress + increment)) }
                : goal
        );
        saveWeeklyRituals({
            weekKey: state.weeklyWeekKey,
            weeklyGoals,
            weeklyPriorities: state.weeklyPriorities,
        });
        return { weeklyGoals };
    }),

    addWeeklyPriority: (text) => set((state) => {
        const weeklyPriorities = [...state.weeklyPriorities, text.trim()];
        saveWeeklyRituals({
            weekKey: state.weeklyWeekKey,
            weeklyGoals: state.weeklyGoals,
            weeklyPriorities,
        });
        return { weeklyPriorities };
    }),

    removeWeeklyPriority: (index) => set((state) => {
        const weeklyPriorities = state.weeklyPriorities.filter((_, i) => i !== index);
        saveWeeklyRituals({
            weekKey: state.weeklyWeekKey,
            weeklyGoals: state.weeklyGoals,
            weeklyPriorities,
        });
        return { weeklyPriorities };
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
