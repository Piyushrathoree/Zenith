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
  externalId?: string;
  link?: string;
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
  /** The server's original UniversalTask.externalId, untouched. The numeric
   * `id` above is only a display id / React key and may be a synthesised
   * fallback, so provenance sent back to the server must come from here. */
  externalId?: string;
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
  /** The server's original UniversalTask.externalId, untouched. The numeric
   * `id` above is only a display id / React key and may be a synthesised
   * fallback, so provenance sent back to the server must come from here. */
  externalId?: string;
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
  /** The server's original UniversalTask.externalId, untouched. */
  externalId?: string;
  /** The message's direct link, from UniversalTask.link. Gmail is the only
   * one of the four view types with no `url` field, so this is the place
   * to carry it instead of synthesising a link by hand elsewhere. */
  link?: string;
}

export interface NotionPage {
  id: string;
  title: string;
  icon?: string;
  workspace: string;
  lastEdited: string;
  url: string;
  /** The server's original UniversalTask.externalId, untouched. */
  externalId?: string;
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
