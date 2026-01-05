import { Task, GitHubIssue, GitHubPR, GmailMessage, NotionPage, DailyTask } from '@/types';
import { addDays, format } from 'date-fns';

const today = new Date();

export const mockGitHubIssues: GitHubIssue[] = [
  {
    id: 1,
    number: 78,
    title: 'Add script for test cases',
    body: `Phase 1: Unit Tests (Do these first)
Priority order:

pkg/cluster/discovery_test.go - Core logic, most important

Test cluster discovery
Test WDS filtering
Test error handling

pkg/cmd/get_test.go - Main command that works

Test resource routing
Test output formatting
Test flag parsing`,
    state: 'open',
    repository: 'kubestellar/kubectl-multi-plugin',
    author: 'Rupam-It',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rupam',
    createdAt: '2025-10-20T10:00:00Z',
    labels: [{ name: 'help wanted', color: '008672' }],
    assignees: [{ login: 'Piyushrathoree', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Piyush' }],
    url: 'https://github.com/kubestellar/kubectl-multi-plugin/issues/78',
  },
  {
    id: 2,
    number: 2141,
    title: '[Bug]: Unable to create the context and no websocket connection',
    body: 'The websocket connection fails when trying to create a new context in the dashboard.',
    state: 'open',
    repository: 'kubestellar/ui',
    author: 'alokdangre',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alok',
    createdAt: '2025-10-15T14:30:00Z',
    labels: [
      { name: 'bug', color: 'd73a4a' },
      { name: 'help wanted', color: '008672' },
    ],
    assignees: [],
    url: 'https://github.com/kubestellar/ui/issues/2141',
  },
  {
    id: 3,
    number: 456,
    title: '[Feature] implementing a root level testing script',
    body: 'We need a comprehensive testing script at the root level.',
    state: 'open',
    repository: 'OpsiMate/OpsiMate',
    author: 'Piyushrathoree',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Piyush',
    createdAt: '2025-09-28T09:00:00Z',
    labels: [{ name: 'enhancement', color: 'a2eeef' }],
    assignees: [],
    url: 'https://github.com/OpsiMate/OpsiMate/issues/456',
  },
  {
    id: 4,
    number: 452,
    title: 'Test – Add end-to-end tests for complete user workflows',
    body: 'Implement E2E tests for the main user workflows.',
    state: 'open',
    repository: 'OpsiMate/OpsiMate',
    author: 'idanlodzki',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=idan',
    createdAt: '2025-09-25T16:00:00Z',
    labels: [
      { name: 'bug', color: 'd73a4a' },
      { name: 'good first issue', color: '7057ff' },
    ],
    assignees: [],
    url: 'https://github.com/OpsiMate/OpsiMate/issues/452',
  },
  {
    id: 5,
    number: 73,
    title: 'improve usage_guide docs',
    body: 'The usage guide needs better examples and clearer explanations.',
    state: 'open',
    repository: 'kubestellar/kubectl-multi-plugin',
    author: 'Rupam-It',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rupam',
    createdAt: '2025-09-20T11:00:00Z',
    labels: [
      { name: 'good first issue', color: '7057ff' },
      { name: 'help wanted', color: '008672' },
    ],
    assignees: [],
    url: 'https://github.com/kubestellar/kubectl-multi-plugin/issues/73',
  },
];

export const mockGitHubPRs: GitHubPR[] = [
  {
    id: 101,
    number: 85,
    title: 'feat: add comprehensive test suite',
    body: 'This PR adds unit and integration tests for the core modules.',
    state: 'open',
    repository: 'kubestellar/kubectl-multi-plugin',
    author: 'Piyushrathoree',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Piyush',
    createdAt: '2025-11-25T10:00:00Z',
    labels: [{ name: 'enhancement', color: 'a2eeef' }],
    url: 'https://github.com/kubestellar/kubectl-multi-plugin/pull/85',
  },
  {
    id: 102,
    number: 2150,
    title: 'fix: resolve websocket connection issues',
    body: 'Fixes the websocket connection bug reported in #2141.',
    state: 'open',
    repository: 'kubestellar/ui',
    author: 'alokdangre',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alok',
    createdAt: '2025-11-24T15:30:00Z',
    labels: [{ name: 'bug', color: 'd73a4a' }],
    url: 'https://github.com/kubestellar/ui/pull/2150',
  },
];

export const mockGmailMessages: GmailMessage[] = [
  {
    id: 'g1',
    threadId: 't1',
    subject: 'Weekly Team Standup Notes',
    from: 'Sarah Chen',
    fromEmail: 'sarah.chen@company.com',
    snippet: 'Hi team, here are the notes from today\'s standup meeting. Please review the action items...',
    date: '2025-11-28T09:00:00Z',
    unread: true,
  },
  {
    id: 'g2',
    threadId: 't2',
    subject: 'Re: Project Deadline Update',
    from: 'Mike Johnson',
    fromEmail: 'mike.j@company.com',
    snippet: 'Thanks for the update. I\'ve adjusted the timeline accordingly and will...',
    date: '2025-11-28T08:30:00Z',
    unread: true,
  },
  {
    id: 'g3',
    threadId: 't3',
    subject: 'New Feature Request: Dashboard Analytics',
    from: 'Product Team',
    fromEmail: 'product@company.com',
    snippet: 'We\'d like to propose adding analytics to the main dashboard. The requirements are...',
    date: '2025-11-27T16:00:00Z',
    unread: false,
  },
];

export const mockNotionPages: NotionPage[] = [
  {
    id: 'n1',
    title: 'Q4 Product Roadmap',
    icon: '🗺️',
    workspace: 'Product Team',
    lastEdited: '2025-11-28T10:00:00Z',
    url: 'https://notion.so/q4-roadmap',
  },
  {
    id: 'n2',
    title: 'Sprint Planning Notes',
    icon: '📝',
    workspace: 'Engineering',
    lastEdited: '2025-11-27T14:30:00Z',
    url: 'https://notion.so/sprint-planning',
  },
  {
    id: 'n3',
    title: 'Design System Documentation',
    icon: '🎨',
    workspace: 'Design',
    lastEdited: '2025-11-26T09:00:00Z',
    url: 'https://notion.so/design-system',
  },
];

export const generateTasks = (): Task[] => {
  return [
    {
      id: 't1',
      title: '3 dsa questions',
      time: '9:00 am',
      duration: '1:00',
      tag: 'work',
      date: format(today, 'yyyy-MM-dd'),
      completed: false,
    },
    {
      id: 't2',
      title: '3 hours on project',
      time: '10:00 am',
      duration: '3:00',
      tag: 'work',
      date: format(today, 'yyyy-MM-dd'),
      completed: false,
      notes: 'Focus on the authentication module',
    },
    {
      id: 't3',
      title: 'Add script for test cases',
      time: '11:00 am',
      duration: '1:00',
      tag: 'work',
      date: format(today, 'yyyy-MM-dd'),
      completed: false,
      source: 'github',
      sourceData: mockGitHubIssues[0],
    },
    {
      id: 't4',
      title: 'Review PR #85',
      time: '2:00 pm',
      duration: '0:30',
      tag: 'work',
      date: format(addDays(today, 1), 'yyyy-MM-dd'),
      completed: false,
    },
    {
      id: 't5',
      title: 'Gym session',
      time: '6:00 pm',
      duration: '1:30',
      tag: 'health',
      date: format(addDays(today, 1), 'yyyy-MM-dd'),
      completed: false,
    },
  ];
};

export const mockDailyTasks: DailyTask[] = [
  {
    id: 'd1',
    title: 'Morning meditation',
    time: '7:00 am',
    duration: '0:15',
    completed: true,
    tag: 'health',
  },
  {
    id: 'd2',
    title: 'Review daily goals',
    time: '8:00 am',
    duration: '0:10',
    completed: false,
    tag: 'personal',
  },
  {
    id: 'd3',
    title: 'Check emails',
    time: '9:00 am',
    duration: '0:20',
    completed: false,
    tag: 'work',
  },
];
