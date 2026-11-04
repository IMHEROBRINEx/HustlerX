import { LinkedInMetrics, CSVData } from '@/types';
import {
  normalizeConnections,
  normalizeMessages,
  normalizeJobs,
  normalizeActivities,
  normalizeInvitations,
  classifyActivityKind,
} from './csv-parser';

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

export interface MetricsResult {
  metrics: LinkedInMetrics;
  timeline: TimelineData[];
  summary: string;
}

export function extractMetrics(csvData: CSVData): MetricsResult {
  const connections = normalizeConnections(csvData.connections);
  const messages = normalizeMessages(csvData.messages);
  const jobs = normalizeJobs(csvData.jobs);
  const activities = normalizeActivities(csvData.activities);
  const invitations = normalizeInvitations(csvData.invitations);

  const metrics: LinkedInMetrics = {
    connections: connections.total,
    messagesSent: messages.sent,
    messagesReceived: messages.received,
    jobsApplied: jobs.applied,
    likesGiven: activities.likes,
    commentsMade: activities.comments,
    shares: activities.shares,
    postsCreated: activities.posts,
    connectionRequestsSent: invitations.sent,
    connectionRequestsReceived: invitations.received,
  };

  const timeline = generateTimeline(csvData);

  const summary = generateSummary(metrics);

  return { metrics, timeline, summary };
}

function generateTimeline(csvData: CSVData): TimelineData[] {
  const monthMap = new Map<string, TimelineData>();

  csvData.connections.forEach((row) => {
    const dateStr = (row['Connected On'] || row['connected_on'] || row['Date']) as string;
    if (!dateStr) return;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return;

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthMap.get(monthKey) || createEmptyTimelineData(monthKey);
    existing.connections++;
    monthMap.set(monthKey, existing);
  });

  csvData.messages.forEach((row) => {
    const dateStr = (row['Date'] || row['date'] || row['Timestamp']) as string;
    if (!dateStr) return;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return;

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthMap.get(monthKey) || createEmptyTimelineData(monthKey);
    existing.messages++;
    monthMap.set(monthKey, existing);
  });

  csvData.activities.forEach((row) => {
    const dateStr = (row['Date'] || row['date'] || row['Timestamp']) as string;
    if (!dateStr) return;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return;

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthMap.get(monthKey) || createEmptyTimelineData(monthKey);

    const activityKind = classifyActivityKind(row);
    if (activityKind === 'like') {
      existing.likes += 1;
    } else if (activityKind === 'comment') {
      existing.comments += 1;
    } else if (activityKind === 'share') {
      existing.shares += 1;
    } else if (activityKind === 'post') {
      existing.posts += 1;
    }

    monthMap.set(monthKey, existing);
  });

  csvData.jobs.forEach((row) => {
    const dateStr = (row['Date Applied'] || row['date'] || row['Date']) as string;
    if (!dateStr) return;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return;

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthMap.get(monthKey) || createEmptyTimelineData(monthKey);
    existing.jobApplications++;
    monthMap.set(monthKey, existing);
  });

  const sortedTimeline = Array.from(monthMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return sortedTimeline.slice(-12);
}

function createEmptyTimelineData(monthKey: string): TimelineData {
  return {
    date: monthKey,
    connections: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    posts: 0,
    messages: 0,
    jobApplications: 0,
  };
}

function generateSummary(metrics: LinkedInMetrics): string {
  const totalEngagement = metrics.likesGiven + metrics.commentsMade + metrics.shares;
  const connectionRate =
    metrics.connections > 0
      ? Math.round((metrics.connectionRequestsReceived / metrics.connections) * 100)
      : 0;

  return `You have ${metrics.connections} connections with ${totalEngagement} total engagements. You've sent ${metrics.messagesSent} messages and applied to ${metrics.jobsApplied} jobs. Your connection acceptance rate appears to be around ${connectionRate}%.`;
}