export interface Task {
  id: string;
  title: string;
  time?: string;
  duration: string;
  tag: 'work' | 'personal' | 'health';
  date: string;
  completed: boolean;
  notes?: string;
  source?: 'github' | 'gmail' | 'notion';
  sourceData?: GitHubIssue | GmailMessage | NotionPage;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  repository: string;
  author: string;
  authorAvatar?: string;
  createdAt: string;
  labels: { name: string; color: string }[];
  assignees: { login: string; avatar_url: string }[];
  url: string;
}

export interface GitHubPR {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  repository: string;
  author: string;
  authorAvatar?: string;
  createdAt: string;
  labels: { name: string; color: string }[];
  url: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromEmail: string;
  snippet: string;
  date: string;
  unread: boolean;
}

export interface NotionPage {
  id: string;
  title: string;
  icon?: string;
  workspace: string;
  lastEdited: string;
  url: string;
}

export interface DailyTask {
  id: string;
  title: string;
  time?: string;
  duration: string;
  completed: boolean;
  tag: 'work' | 'personal' | 'health';
}

export type IntegrationType = 'github' | 'gmail' | 'notion' | null;

export interface Column {
  id: string;
  date: Date;
  tasks: Task[];
}
