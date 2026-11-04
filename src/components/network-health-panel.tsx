'use client';

import * as React from 'react';
import { Activity, AlertTriangle, Building2, Clock3, MessagesSquare, ShieldCheck, UsersRound } from 'lucide-react';
import type { Analysis, ClassifiedConnection } from '@/types';

interface NetworkHealthPanelProps {
  analysis: Analysis | null;
}

type HealthStatus = 'excellent' | 'healthy' | 'needs-attention' | 'at-risk';

type HealthAlert = {
  severity: 'good' | 'watch' | 'risk';
  title: string;
  detail: string;
  action: string;
};

type CompanyBreakdown = {
  name: string;
  count: number;
  share: number;
};

type HealthModel = {
  totalClassified: number;
  totalConnections: number;
  usefulCount: number;
  maybeUsefulCount: number;
  recentCount: number;
  warmingCount: number;
  staleCount: number;
  unknownDateCount: number;
  freshnessScore: number;
  reciprocityScore: number;
  diversityScore: number;
  completenessScore: number;
  activityScore: number;
  overallScore: number;
  status: HealthStatus;
  topCompanyShare: number;
  topCompanies: CompanyBreakdown[];
  alerts: HealthAlert[];
  weeklyPlan: string[];
};

const DAY_IN_MS = 1000 * 60 * 60 * 24;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseConnectionDate(value?: string): Date | null {
  if (!value) return null;

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const dayMonthYear = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dayMonthYear) {
    const day = Number(dayMonthYear[1]);
    const month = Number(dayMonthYear[2]);
    let year = Number(dayMonthYear[3]);

    if (year < 100) {
      year += 2000;
    }

    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function calculateCompanyDiversity(companies: string[]): {
  score: number;
  topCompanyShare: number;
  topCompanies: CompanyBreakdown[];
} {
  if (companies.length === 0) {
    return { score: 0, topCompanyShare: 0, topCompanies: [] };
  }

  const counts = new Map<string, number>();
  companies.forEach((company) => {
    const key = company.trim();
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
  if (total === 0) {
    return { score: 0, topCompanyShare: 0, topCompanies: [] };
  }

  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, share: count / total }));

  const topCompanyShare = sorted[0]?.share ?? 0;

  const entropy = sorted.reduce((sum, company) => {
    return sum - company.share * Math.log(company.share);
  }, 0);

  const maxEntropy = sorted.length > 1 ? Math.log(sorted.length) : 1;
  const normalizedEntropy = sorted.length > 1 ? entropy / maxEntropy : 0;
  const score = clamp(Math.round(normalizedEntropy * 100), 0, 100);

  return {
    score,
    topCompanyShare,
    topCompanies: sorted.slice(0, 6),
  };
}

function statusFromScore(score: number): HealthStatus {
  if (score >= 80) return 'excellent';
  if (score >= 65) return 'healthy';
  if (score >= 50) return 'needs-attention';
  return 'at-risk';
}

function statusLabel(status: HealthStatus): string {
  switch (status) {
    case 'excellent':
      return 'Excellent';
    case 'healthy':
      return 'Healthy';
    case 'needs-attention':
      return 'Needs Attention';
    default:
      return 'At Risk';
  }
}

function statusClasses(status: HealthStatus): string {
  switch (status) {
    case 'excellent':
      return 'border-emerald-300/60 bg-emerald-100/90 text-emerald-800 dark:border-emerald-300/30 dark:bg-emerald-500/15 dark:text-emerald-100';
    case 'healthy':
      return 'border-cyan-300/60 bg-cyan-100/90 text-cyan-800 dark:border-cyan-300/30 dark:bg-cyan-500/15 dark:text-cyan-100';
    case 'needs-attention':
      return 'border-amber-300/60 bg-amber-100/90 text-amber-800 dark:border-amber-300/30 dark:bg-amber-500/15 dark:text-amber-100';
    default:
      return 'border-red-300/60 bg-red-100/90 text-red-800 dark:border-red-300/30 dark:bg-red-500/15 dark:text-red-100';
  }
}

function computeHealthModel(analysis: Analysis): HealthModel {
  const connections = analysis.classifiedConnections ?? [];
  const totalClassified = connections.length;
  const totalConnections = Math.max(analysis.metrics.connections, totalClassified);
  const usefulCount = connections.filter((connection) => connection.classification === 'useful').length;
  const maybeUsefulCount = totalClassified - usefulCount;

  let recentCount = 0;
  let warmingCount = 0;
  let staleCount = 0;
  let unknownDateCount = 0;

  let completenessPoints = 0;
  const completenessMax = totalClassified * 4;
  const companyValues: string[] = [];

  const nowMs = Date.now();

  connections.forEach((connection) => {
    if (connection.company?.trim()) {
      completenessPoints += 1;
      companyValues.push(connection.company.trim());
    }

    if (connection.title?.trim()) {
      completenessPoints += 1;
    }

    if (connection.email?.trim()) {
      completenessPoints += 1;
    }

    if (connection.connectedOn?.trim()) {
      completenessPoints += 1;
    }

    const parsedDate = parseConnectionDate(connection.connectedOn);
    if (!parsedDate) {
      unknownDateCount += 1;
      return;
    }

    const ageInDays = Math.floor((nowMs - parsedDate.getTime()) / DAY_IN_MS);

    if (ageInDays <= 90) {
      recentCount += 1;
    } else if (ageInDays <= 365) {
      warmingCount += 1;
    } else {
      staleCount += 1;
    }
  });

  const datedConnections = recentCount + warmingCount + staleCount;
  const freshnessScore = datedConnections === 0
    ? 35
    : clamp(
        Math.round(((recentCount + warmingCount * 0.65 + staleCount * 0.2) / datedConnections) * 100),
        0,
        100
      );

  const outbound = analysis.metrics.messagesSent + analysis.metrics.connectionRequestsSent;
  const inbound = analysis.metrics.messagesReceived + analysis.metrics.connectionRequestsReceived;
  const reciprocityScore = clamp(Math.round((inbound / Math.max(1, outbound)) * 100), 0, 100);

  const engagementActions =
    analysis.metrics.likesGiven +
    analysis.metrics.commentsMade +
    analysis.metrics.shares +
    analysis.metrics.postsCreated;

  const activityPerConnection = engagementActions / Math.max(1, totalConnections);
  const activityScore = clamp(Math.round(activityPerConnection * 130), 0, 100);

  const completenessScore = completenessMax === 0
    ? 0
    : clamp(Math.round((completenessPoints / completenessMax) * 100), 0, 100);

  const companyDiversity = calculateCompanyDiversity(companyValues);
  const diversityScore = companyDiversity.score;

  const overallScore = clamp(
    Math.round(
      freshnessScore * 0.32 +
        reciprocityScore * 0.26 +
        diversityScore * 0.18 +
        completenessScore * 0.14 +
        activityScore * 0.1
    ),
    0,
    100
  );

  const status = statusFromScore(overallScore);

  const staleShare = totalClassified > 0 ? staleCount / totalClassified : 0;
  const usefulShare = totalClassified > 0 ? usefulCount / totalClassified : 0;

  const alerts: HealthAlert[] = [];

  if (staleShare > 0.4) {
    alerts.push({
      severity: 'risk',
      title: 'Relationship decay is high',
      detail: `${Math.round(staleShare * 100)}% of classified connections are stale (>365 days).`,
      action: 'Create a weekly reactivation batch and message 10 stale but useful contacts.',
    });
  }

  if (reciprocityScore < 40) {
    alerts.push({
      severity: 'watch',
      title: 'Reciprocity is low',
      detail: 'Inbound conversation is trailing your outbound activity.',
      action: 'Shift from cold outreach to context-first follow-ups with warm contacts.',
    });
  }

  if (companyDiversity.topCompanyShare > 0.38) {
    alerts.push({
      severity: 'watch',
      title: 'Company concentration risk',
      detail: `${Math.round(companyDiversity.topCompanyShare * 100)}% of known-company contacts are from one company cluster.`,
      action: 'Diversify by adding contacts from at least 2 adjacent industries this week.',
    });
  }

  if (completenessScore < 50) {
    alerts.push({
      severity: 'watch',
      title: 'Profile metadata is thin',
      detail: 'Many contacts are missing role/company/email or connected date fields.',
      action: 'Enrich your top 50 contacts so segmentation and recommendations improve.',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      severity: 'good',
      title: 'Network baseline is strong',
      detail: 'Core health indicators are in a solid range.',
      action: 'Keep cadence steady and test one new outreach channel for incremental gains.',
    });
  }

  const weeklyPlan: string[] = [
    staleCount > 0
      ? `Reactivate ${Math.min(12, staleCount)} stale contacts, prioritizing useful classifications.`
      : 'Maintain contact freshness with weekly check-ins to your highest-value connections.',
    reciprocityScore < 55
      ? 'Run a follow-up sprint with personalized context to improve inbound reply rate.'
      : 'Convert active conversations into 1:1 calls or referrals to preserve momentum.',
    companyDiversity.topCompanyShare > 0.35
      ? 'Add at least 8 new contacts outside your dominant company cluster.'
      : 'Deepen relationships across your top 3 company clusters with focused outreach.',
  ];

  return {
    totalClassified,
    totalConnections,
    usefulCount,
    maybeUsefulCount,
    recentCount,
    warmingCount,
    staleCount,
    unknownDateCount,
    freshnessScore,
    reciprocityScore,
    diversityScore,
    completenessScore,
    activityScore,
    overallScore,
    status,
    topCompanyShare: companyDiversity.topCompanyShare,
    topCompanies: companyDiversity.topCompanies,
    alerts,
    weeklyPlan,
  };
}

function scoreTone(score: number): string {
  if (score >= 75) return 'text-emerald-700 dark:text-emerald-100';
  if (score >= 55) return 'text-amber-700 dark:text-amber-100';
  return 'text-red-700 dark:text-red-100';
}

export function NetworkHealthPanel({ analysis }: NetworkHealthPanelProps) {
  const health = React.useMemo(() => {
    if (!analysis) return null;
    return computeHealthModel(analysis);
  }, [analysis]);

  if (!analysis || !health || health.totalClassified === 0) {
    return (
      <section className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-6">
        <div className="rounded-xl border border-outline-variant/20 bg-hearth-ash p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-ember-soft" />
          <h3 className="mt-4 font-[Epilogue] text-lg font-bold uppercase tracking-tight text-parchment">
            Network Health Pending
          </h3>
          <p className="mt-2 text-sm text-warm-muted">
            Run a LinkedIn analysis first. This tab then grades freshness, reciprocity, concentration risk, and metadata quality.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-[Epilogue] text-lg font-bold uppercase tracking-tight text-parchment">Network Health</h3>
          <p className="mt-1 text-sm text-warm-muted">
            Diagnose relationship strength, concentration risk, and interaction quality across your professional graph.
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-[Epilogue] font-bold uppercase tracking-[0.2em] ${statusClasses(health.status)}`}>
          <Activity className="h-3.5 w-3.5" />
          {statusLabel(health.status)}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-12">
        <section className="space-y-5 xl:col-span-8">
          <div className="rounded-xl border border-outline-variant/25 bg-hearth-ash p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-warm-faint">Overall Health Index</p>
                <div className="mt-1 flex items-end gap-2">
                  <span className={`font-[Epilogue] text-4xl font-black ${scoreTone(health.overallScore)}`}>
                    {health.overallScore}
                  </span>
                  <span className="pb-1 text-sm text-warm-faint">/ 100</span>
                </div>
                <p className="mt-1 text-xs text-warm-muted">
                  Based on {health.totalClassified} classified connections and {health.totalConnections} total imported connections.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-emerald-300/60 bg-emerald-100/85 px-3 py-2 text-emerald-800 dark:border-emerald-300/25 dark:bg-emerald-500/10 dark:text-emerald-100">
                  Useful: <span className="font-bold">{health.usefulCount}</span>
                </div>
                <div className="rounded-lg border border-slate-300/70 bg-slate-100/90 px-3 py-2 text-slate-800 dark:border-slate-300/25 dark:bg-slate-500/10 dark:text-slate-100">
                  Maybe: <span className="font-bold">{health.maybeUsefulCount}</span>
                </div>
                <div className="rounded-lg border border-cyan-300/60 bg-cyan-100/85 px-3 py-2 text-cyan-800 dark:border-cyan-300/25 dark:bg-cyan-500/10 dark:text-cyan-100">
                  Top company share: <span className="font-bold">{Math.round(health.topCompanyShare * 100)}%</span>
                </div>
                <div className="rounded-lg border border-amber-300/60 bg-amber-100/85 px-3 py-2 text-amber-800 dark:border-amber-300/25 dark:bg-amber-500/10 dark:text-amber-100">
                  Unknown dates: <span className="font-bold">{health.unknownDateCount}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-lg border border-outline-variant/25 bg-pit/65 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-warm-faint">Freshness</p>
                <p className="mt-1 text-sm font-semibold text-parchment">{health.freshnessScore}/100</p>
              </div>
              <div className="rounded-lg border border-outline-variant/25 bg-pit/65 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-warm-faint">Reciprocity</p>
                <p className="mt-1 text-sm font-semibold text-parchment">{health.reciprocityScore}/100</p>
              </div>
              <div className="rounded-lg border border-outline-variant/25 bg-pit/65 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-warm-faint">Diversity</p>
                <p className="mt-1 text-sm font-semibold text-parchment">{health.diversityScore}/100</p>
              </div>
              <div className="rounded-lg border border-outline-variant/25 bg-pit/65 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-warm-faint">Completeness</p>
                <p className="mt-1 text-sm font-semibold text-parchment">{health.completenessScore}/100</p>
              </div>
              <div className="rounded-lg border border-outline-variant/25 bg-pit/65 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-warm-faint">Activity</p>
                <p className="mt-1 text-sm font-semibold text-parchment">{health.activityScore}/100</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant/25 bg-hearth-ash p-5">
            <h4 className="flex items-center gap-2 font-[Epilogue] text-sm font-bold uppercase tracking-[0.18em] text-parchment">
              <Clock3 className="h-4 w-4 text-ember-soft" />
              Relationship Freshness
            </h4>

            <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-surface-raised">
              <div className="bg-emerald-400" style={{ width: `${(health.recentCount / Math.max(1, health.totalClassified)) * 100}%` }} />
              <div className="bg-amber-400" style={{ width: `${(health.warmingCount / Math.max(1, health.totalClassified)) * 100}%` }} />
              <div className="bg-rose-400" style={{ width: `${(health.staleCount / Math.max(1, health.totalClassified)) * 100}%` }} />
              <div className="bg-slate-500" style={{ width: `${(health.unknownDateCount / Math.max(1, health.totalClassified)) * 100}%` }} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div className="rounded-lg border border-emerald-300/60 bg-emerald-100/85 px-3 py-2 text-emerald-800 dark:border-emerald-300/25 dark:bg-emerald-500/10 dark:text-emerald-100">
                Recent (0-90d): <span className="font-bold">{health.recentCount}</span>
              </div>
              <div className="rounded-lg border border-amber-300/60 bg-amber-100/85 px-3 py-2 text-amber-800 dark:border-amber-300/25 dark:bg-amber-500/10 dark:text-amber-100">
                Warming (91-365d): <span className="font-bold">{health.warmingCount}</span>
              </div>
              <div className="rounded-lg border border-rose-300/60 bg-rose-100/85 px-3 py-2 text-rose-800 dark:border-rose-300/25 dark:bg-rose-500/10 dark:text-rose-100">
                Stale (365d+): <span className="font-bold">{health.staleCount}</span>
              </div>
              <div className="rounded-lg border border-slate-300/70 bg-slate-100/90 px-3 py-2 text-slate-800 dark:border-slate-300/25 dark:bg-slate-500/10 dark:text-slate-100">
                Unknown date: <span className="font-bold">{health.unknownDateCount}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant/25 bg-hearth-ash p-5">
            <h4 className="flex items-center gap-2 font-[Epilogue] text-sm font-bold uppercase tracking-[0.18em] text-parchment">
              <Building2 className="h-4 w-4 text-ember-soft" />
              Company Concentration
            </h4>

            {health.topCompanies.length === 0 ? (
              <p className="mt-3 text-sm text-warm-muted">No company metadata found in the classified connections.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {health.topCompanies.map((company) => (
                  <div key={company.name} className="rounded-lg border border-outline-variant/25 bg-pit/65 px-3 py-2">
                    <div className="flex items-center justify-between text-xs">
                      <p className="truncate pr-2 text-warm-foreground">{company.name}</p>
                      <p className="text-warm-faint">{Math.round(company.share * 100)}%</p>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                      <div className="h-full bg-cyan-300" style={{ width: `${company.share * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-5 xl:col-span-4">
          <div className="rounded-xl border border-outline-variant/25 bg-hearth-ash p-5">
            <h4 className="flex items-center gap-2 font-[Epilogue] text-sm font-bold uppercase tracking-[0.18em] text-parchment">
              <AlertTriangle className="h-4 w-4 text-ember-soft" />
              Risk Radar
            </h4>

            <div className="mt-3 space-y-2">
              {health.alerts.map((alert, index) => (
                <div
                  key={`${alert.title}-${index}`}
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    alert.severity === 'risk'
                      ? 'border-red-300/60 bg-red-100/90 text-red-800 dark:border-red-300/30 dark:bg-red-500/10 dark:text-red-100'
                      : alert.severity === 'watch'
                        ? 'border-amber-300/60 bg-amber-100/90 text-amber-800 dark:border-amber-300/30 dark:bg-amber-500/10 dark:text-amber-100'
                        : 'border-emerald-300/60 bg-emerald-100/90 text-emerald-800 dark:border-emerald-300/30 dark:bg-emerald-500/10 dark:text-emerald-100'
                  }`}
                >
                  <p className="font-semibold uppercase tracking-[0.14em]">{alert.title}</p>
                  <p className="mt-1 text-[11px]">{alert.detail}</p>
                  <p className="mt-1 text-[11px]">Action: {alert.action}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant/25 bg-hearth-ash p-5">
            <h4 className="flex items-center gap-2 font-[Epilogue] text-sm font-bold uppercase tracking-[0.18em] text-parchment">
              <UsersRound className="h-4 w-4 text-ember-soft" />
              This Week Plan
            </h4>

            <div className="mt-3 space-y-2 text-sm text-warm-foreground">
              {health.weeklyPlan.map((item, index) => (
                <div key={`plan-${index}`} className="rounded-lg border border-outline-variant/25 bg-pit/65 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.14em] text-warm-faint">Step {index + 1}</p>
                  <p className="mt-1">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant/25 bg-hearth-ash p-5">
            <h4 className="flex items-center gap-2 font-[Epilogue] text-sm font-bold uppercase tracking-[0.18em] text-parchment">
              <MessagesSquare className="h-4 w-4 text-ember-soft" />
              Reciprocity Snapshot
            </h4>
            <p className="mt-2 text-sm text-warm-muted">
              Balance inbound and outbound communication to strengthen relationship depth over time.
            </p>
            <div className="mt-3 rounded-lg border border-outline-variant/25 bg-pit/65 px-3 py-2 text-sm text-warm-foreground">
              Inbound: <span className="font-semibold">{analysis.metrics.messagesReceived + analysis.metrics.connectionRequestsReceived}</span>
              <span className="mx-2 text-warm-faint">|</span>
              Outbound: <span className="font-semibold">{analysis.metrics.messagesSent + analysis.metrics.connectionRequestsSent}</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
