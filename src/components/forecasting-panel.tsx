'use client';

import * as React from 'react';
import { CalendarClock, LineChart as LineChartIcon, Radar, Sparkles, TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Analysis, TimelineData } from '@/types';

interface ForecastingPanelProps {
  analysis: Analysis | null;
}

type ForecastPoint = {
  monthKey: string;
  label: string;
  connectionsActual: number | null;
  connectionsProjected: number | null;
  conversationsActual: number | null;
  conversationsProjected: number | null;
  engagementActual: number | null;
  engagementProjected: number | null;
};

type MonthlySeries = {
  monthKey: string;
  connections: number;
  conversations: number;
  engagement: number;
  opportunities: number;
};

interface ForecastModel {
  points: ForecastPoint[];
  projectedQuarterConnections: number;
  projectedQuarterConversations: number;
  projectedQuarterEngagement: number;
  projectedQuarterOpportunities: number;
  confidence: number;
  assumptions: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = average(values);
  const variance = average(values.map((value) => Math.pow(value - mean, 2)));
  return Math.sqrt(variance);
}

function monthKeyToDate(monthKey: string): Date {
  const [yearPart, monthPart] = monthKey.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return new Date();
  }

  return new Date(year, month - 1, 1);
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function addMonths(monthKey: string, months: number): string {
  const base = monthKeyToDate(monthKey);
  return toMonthKey(new Date(base.getFullYear(), base.getMonth() + months, 1));
}

function formatMonthLabel(monthKey: string): string {
  const date = monthKeyToDate(monthKey);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function normalizeTimelinePoint(point: TimelineData): MonthlySeries {
  return {
    monthKey: point.date,
    connections: point.connections,
    conversations: point.messages,
    engagement: point.likes + point.comments + point.shares + point.posts,
    opportunities: point.jobApplications,
  };
}

function historyFromAnalysis(analysis: Analysis): MonthlySeries[] {
  const timeline = Array.isArray(analysis.timeline) ? analysis.timeline : [];
  const mapped = timeline
    .map((point) => normalizeTimelinePoint(point))
    .filter((point) => Boolean(point.monthKey))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  if (mapped.length > 0) {
    return mapped.slice(-8);
  }

  const now = new Date();
  const syntheticMonth = toMonthKey(new Date(now.getFullYear(), now.getMonth(), 1));

  return [
    {
      monthKey: syntheticMonth,
      connections: Math.max(1, Math.round(analysis.metrics.connections / 12)),
      conversations: Math.max(1, Math.round((analysis.metrics.messagesSent + analysis.metrics.messagesReceived) / 12)),
      engagement: Math.max(
        1,
        Math.round(
          (analysis.metrics.likesGiven + analysis.metrics.commentsMade + analysis.metrics.shares + analysis.metrics.postsCreated) / 12,
        ),
      ),
      opportunities: Math.max(0, Math.round(analysis.metrics.jobsApplied / 12)),
    },
  ];
}

function buildForecastModel(analysis: Analysis): ForecastModel {
  const history = historyFromAnalysis(analysis);
  const tail = history.slice(-3);
  const last = history[history.length - 1];
  const previous = history.length > 1 ? history[history.length - 2] : last;

  const avgConnections = Math.max(1, Math.round(average(tail.map((item) => item.connections))));
  const avgConversations = Math.max(1, Math.round(average(tail.map((item) => item.conversations))));
  const avgEngagement = Math.max(1, Math.round(average(tail.map((item) => item.engagement))));
  const avgOpportunities = Math.max(0, Math.round(average(tail.map((item) => item.opportunities))));

  const connectionsTrend = last.connections - previous.connections;
  const conversationsTrend = last.conversations - previous.conversations;
  const engagementTrend = last.engagement - previous.engagement;
  const opportunitiesTrend = last.opportunities - previous.opportunities;

  const classified = analysis.classifiedConnections ?? [];
  const usefulCount = classified.filter((item) => item.classification === 'useful').length;
  const usefulShare = classified.length > 0 ? usefulCount / classified.length : 0.5;

  const outbound = analysis.metrics.messagesSent + analysis.metrics.connectionRequestsSent;
  const inbound = analysis.metrics.messagesReceived + analysis.metrics.connectionRequestsReceived;
  const responseRatio = inbound / Math.max(1, outbound);

  const growthLift = clamp(
    (responseRatio - 0.85) * 0.09 + (usefulShare - 0.5) * 0.07,
    -0.08,
    0.14,
  );

  let nextConnections = Math.max(last.connections, avgConnections);
  let nextConversations = Math.max(last.conversations, avgConversations);
  let nextEngagement = Math.max(last.engagement, avgEngagement);
  let nextOpportunities = Math.max(last.opportunities, avgOpportunities);

  const forecastMonths: MonthlySeries[] = [];

  for (let i = 1; i <= 6; i += 1) {
    const monthKey = addMonths(last.monthKey, i);

    const projectedConnections = clamp(
      Math.round(nextConnections + connectionsTrend * 0.45 + avgConnections * (0.1 + growthLift)),
      0,
      Math.max(8, Math.round(nextConnections * 1.35 + 15)),
    );

    const projectedConversations = clamp(
      Math.round(nextConversations + conversationsTrend * 0.42 + avgConversations * (0.11 + growthLift * 0.9)),
      0,
      Math.max(6, Math.round(nextConversations * 1.38 + 12)),
    );

    const projectedEngagement = clamp(
      Math.round(nextEngagement + engagementTrend * 0.38 + avgEngagement * (0.1 + growthLift * 0.7)),
      0,
      Math.max(10, Math.round(nextEngagement * 1.35 + 16)),
    );

    const projectedOpportunities = clamp(
      Math.round(nextOpportunities + opportunitiesTrend * 0.4 + avgOpportunities * (0.09 + growthLift * 0.6)),
      0,
      Math.max(4, Math.round(nextOpportunities * 1.4 + 4)),
    );

    forecastMonths.push({
      monthKey,
      connections: projectedConnections,
      conversations: projectedConversations,
      engagement: projectedEngagement,
      opportunities: projectedOpportunities,
    });

    nextConnections = projectedConnections;
    nextConversations = projectedConversations;
    nextEngagement = projectedEngagement;
    nextOpportunities = projectedOpportunities;
  }

  const points: ForecastPoint[] = [
    ...history.map((point) => ({
      monthKey: point.monthKey,
      label: formatMonthLabel(point.monthKey),
      connectionsActual: point.connections,
      connectionsProjected: null,
      conversationsActual: point.conversations,
      conversationsProjected: null,
      engagementActual: point.engagement,
      engagementProjected: null,
    })),
    ...forecastMonths.map((point) => ({
      monthKey: point.monthKey,
      label: formatMonthLabel(point.monthKey),
      connectionsActual: null,
      connectionsProjected: point.connections,
      conversationsActual: null,
      conversationsProjected: point.conversations,
      engagementActual: null,
      engagementProjected: point.engagement,
    })),
  ];

  const quarter = forecastMonths.slice(0, 3);

  const volatilityBase = history.slice(-6).map((point) => point.connections);
  const volatility = standardDeviation(volatilityBase) / Math.max(1, average(volatilityBase));
  const depthFactor = clamp(history.length / 8, 0, 1);
  const stabilityFactor = clamp(1 - volatility, 0, 1);
  const confidence = clamp(
    Math.round((0.45 + depthFactor * 0.35 + stabilityFactor * 0.2) * 100),
    35,
    92,
  );

  const assumptions = [
    `Forecast uses the last ${Math.min(history.length, 3)} month baseline and current response momentum.` ,
    `Growth lift is adjusted by reply ratio (${responseRatio.toFixed(2)}x) and useful-connection density (${Math.round(usefulShare * 100)}%).`,
    'Values are directional planning estimates, not guaranteed outcomes.',
  ];

  return {
    points,
    projectedQuarterConnections: quarter.reduce((sum, point) => sum + point.connections, 0),
    projectedQuarterConversations: quarter.reduce((sum, point) => sum + point.conversations, 0),
    projectedQuarterEngagement: quarter.reduce((sum, point) => sum + point.engagement, 0),
    projectedQuarterOpportunities: quarter.reduce((sum, point) => sum + point.opportunities, 0),
    confidence,
    assumptions,
  };
}

export function ForecastingPanel({ analysis }: ForecastingPanelProps) {
  const model = React.useMemo(() => {
    if (!analysis) return null;
    return buildForecastModel(analysis);
  }, [analysis]);

  if (!analysis || !model) {
    return (
      <section className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-6">
        <div className="rounded-xl border border-outline-variant/20 bg-hearth-ash p-8 text-center">
          <LineChartIcon className="mx-auto h-10 w-10 text-ember-soft" />
          <h3 className="mt-4 font-[Epilogue] text-lg font-bold uppercase tracking-tight text-parchment">
            Forecasting Pending
          </h3>
          <p className="mt-2 text-sm text-warm-muted">
            Upload and analyze your LinkedIn data first. Forecasting will then project the next 6 months of momentum.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-[Epilogue] text-lg font-bold uppercase tracking-tight text-parchment">Forecasting</h3>
          <p className="mt-1 text-sm text-warm-muted">
            Project next-quarter network growth and conversation momentum from your current behavior trends.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-ember/30 bg-ember/10 px-3 py-1.5 text-[10px] font-[Epilogue] font-bold uppercase tracking-[0.2em] text-ember">
          <Sparkles className="h-3.5 w-3.5" />
          Confidence {model.confidence}%
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-outline-variant/25 bg-hearth-ash p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-warm-faint">90-day Connections</p>
          <p className="mt-2 font-[Epilogue] text-3xl font-black text-ember-soft">{model.projectedQuarterConnections}</p>
        </div>
        <div className="rounded-xl border border-outline-variant/25 bg-hearth-ash p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-warm-faint">90-day Conversations</p>
          <p className="mt-2 font-[Epilogue] text-3xl font-black text-ember-soft">{model.projectedQuarterConversations}</p>
        </div>
        <div className="rounded-xl border border-outline-variant/25 bg-hearth-ash p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-warm-faint">90-day Engagement</p>
          <p className="mt-2 font-[Epilogue] text-3xl font-black text-ember-soft">{model.projectedQuarterEngagement}</p>
        </div>
        <div className="rounded-xl border border-outline-variant/25 bg-hearth-ash p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-warm-faint">90-day Opportunities</p>
          <p className="mt-2 font-[Epilogue] text-3xl font-black text-ember-soft">{model.projectedQuarterOpportunities}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-outline-variant/25 bg-hearth-ash p-4">
        <div className="mb-3 flex items-center gap-2">
          <LineChartIcon className="h-4 w-4 text-ember-soft" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-warm-foreground">Observed vs Forecasted Trend</p>
        </div>

        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={model.points} margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(130, 108, 94, 0.22)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="rgba(130,108,94,0.85)" />
              <YAxis tick={{ fontSize: 11 }} stroke="rgba(130,108,94,0.85)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(20, 15, 12, 0.95)',
                  border: '1px solid rgba(255, 182, 146, 0.25)',
                  borderRadius: '10px',
                  color: '#f7ece2',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="connectionsActual" name="Connections (actual)" stroke="#ffb692" strokeWidth={2.2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="connectionsProjected" name="Connections (projected)" stroke="#ff6d00" strokeDasharray="6 4" strokeWidth={2.2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="conversationsActual" name="Conversations (actual)" stroke="#7dd3fc" strokeWidth={2} dot={{ r: 2.5 }} />
              <Line type="monotone" dataKey="conversationsProjected" name="Conversations (projected)" stroke="#38bdf8" strokeDasharray="6 4" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section className="space-y-3 rounded-xl border border-outline-variant/25 bg-hearth-ash p-4 xl:col-span-7">
          <div className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-ember-soft" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-warm-foreground">Model Assumptions</p>
          </div>
          <ul className="space-y-2 text-sm text-warm-foreground">
            {model.assumptions.map((assumption, index) => (
              <li key={`assumption-${index}`} className="rounded-md border border-outline-variant/20 bg-pit/60 px-2.5 py-2">
                {assumption}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3 rounded-xl border border-outline-variant/25 bg-hearth-ash p-4 xl:col-span-5">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-ember-soft" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-warm-foreground">Execution Focus</p>
          </div>
          <div className="space-y-2 text-sm text-warm-foreground">
            <div className="rounded-md border border-outline-variant/20 bg-pit/60 px-2.5 py-2">
              <p className="font-semibold text-parchment">Week 1-2</p>
              <p className="mt-1">Stabilize message follow-up cadence to protect projected conversation growth.</p>
            </div>
            <div className="rounded-md border border-outline-variant/20 bg-pit/60 px-2.5 py-2">
              <p className="font-semibold text-parchment">Week 3-4</p>
              <p className="mt-1">Prioritize high-fit useful contacts to convert forecasted activity into real opportunities.</p>
            </div>
            <div className="rounded-md border border-outline-variant/20 bg-pit/60 px-2.5 py-2">
              <p className="font-semibold text-parchment">Monthly Review</p>
              <p className="mt-1">Compare actuals against forecast and recalibrate growth assumptions.</p>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-3 rounded-xl border border-outline-variant/20 bg-hearth-ash p-3">
        <div className="flex items-start gap-2 text-xs text-warm-faint">
          <TrendingUp className="mt-0.5 h-3.5 w-3.5 text-warm-faint" />
          Forecasts are directional planning signals derived from imported history and current interaction ratios.
        </div>
      </div>
    </section>
  );
}
