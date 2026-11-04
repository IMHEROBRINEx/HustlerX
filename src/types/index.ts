export interface LinkedInMetrics {
  connections: number;
  messagesSent: number;
  messagesReceived: number;
  jobsApplied: number;
  likesGiven: number;
  commentsMade: number;
  shares: number;
  postsCreated: number;
  connectionRequestsSent: number;
  connectionRequestsReceived: number;
}

export interface TimelineData {
  date: string;
  connections: number;
  likes: number;
  comments: number;
  shares: number;
  posts: number;
  messages: number;
  jobApplications: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  searchQuery?: string;
}

export interface ClassifiedConnection {
  firstName: string;
  lastName: string;
  email?: string;
  profileUrl?: string;
  connectedOn?: string;
  company?: string;
  title?: string;
  classification: 'useful' | 'maybe_useful';
  reason?: string;
}

export interface ExaResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
  publishedDate?: string;
}

export interface Analysis {
  id: string;
  userId?: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metrics: LinkedInMetrics;
  timeline?: TimelineData[];
  summary?: string;
  goals: Goal[];
  classifiedConnections?: ClassifiedConnection[];
  rawConnections?: Record<string, unknown>[];
  rawSkills?: Record<string, unknown>[];
  rawPositions?: Record<string, unknown>[];
  rawJobs?: Record<string, unknown>[];
  rawActivities?: Record<string, unknown>[];
  rawInvitations?: Record<string, unknown>[];
  rawMessages?: Record<string, unknown>[];
  rawComments?: Record<string, unknown>[];
  rawMemberFollows?: Record<string, unknown>[];
  rawCompanyFollows?: Record<string, unknown>[];
  exaResults?: Record<string, { search: ExaResult[]; neural: ExaResult[] }>;
  createdAt: string;
  updatedAt?: string;
  error?: string;
}

export interface CSVData {
  connections: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  jobs: Record<string, unknown>[];
  activities: Record<string, unknown>[];
  invitations: Record<string, unknown>[];
}

export interface UploadResponse {
  success: boolean;
  files?: string[];
  analysisId?: string;
  error?: string;
}

export interface AnalyzeResponse {
  success: boolean;
  analysis?: Analysis;
  error?: string;
}

export interface ExaSearchResponse {
  success: boolean;
  results?: ExaResult[];
  error?: string;
}

export interface TrussConnectCandidate {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  profileUrl?: string;
  title?: string;
  company?: string;
  location?: string;
  selectedAt: string;
  source: 'truss-intelligence';
}

export interface TrussConnectAccountStatus {
  connected: boolean;
  userId: string;
  provider?: 'LINKEDIN';
  accountId?: string;
  status?: string;
  connectedAt?: string;
  updatedAt?: string;
  sentToday?: number;
  dailyLimit?: number;
  remainingToday?: number;
}

export interface TrussConnectSendResult {
  recipientKey: string;
  fullName: string;
  profileUrl?: string;
  status: 'sent' | 'failed' | 'skipped';
  reason?: string;
  externalRequestId?: string;
  sentAt?: string;
}
