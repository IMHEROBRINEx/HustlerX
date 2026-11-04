'use client';

import * as React from 'react';
import { AlertTriangle, Compass, Lightbulb, ShieldCheck, Sparkles, Target, TrendingUp } from 'lucide-react';
import type { Analysis } from '@/types';

type SignalTone = 'strong' | 'watch' | 'risk';

interface StrategicSignal {
  id: 'network-quality' | 'conversation-traction' | 'engagement-cadence' | 'opportunity-velocity';
  title: string;
  score: number;
  detail: string;
  nextMove: string;
  tone: SignalTone;
}

interface StrategicRisk {
  severity: 'watch' | 'risk';
  title: string;
  detail: string;
}

interface StrategicModel {
  strategicIndex: number;
  executiveSummary: string;
  usefulShare: number;
  conversationRatio: number;
  signals: StrategicSignal[];
  risks: StrategicRisk[];
  weeklyPriorities: string[];
}

interface StrategicInsightsPanelProps {
  analysis: Analysis | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toneFromScore(score: number): SignalTone {
  if (score >= 72) return 'strong';
  if (score >= 50) return 'watch';
  return 'risk';
}

function toneClasses(tone: SignalTone): string {
  switch (tone) {
    case 'strong':
      return 'border-emerald-300/55 bg-emerald-100/90 text-emerald-800 dark:border-emerald-300/25 dark:bg-emerald-500/10 dark:text-emerald-100';
    case 'watch':
      return 'border-amber-300/60 bg-amber-100/95 text-amber-800 dark:border-amber-300/25 dark:bg-amber-500/10 dark:text-amber-100';
    default:
      return 'border-red-300/60 bg-red-100/95 text-red-800 dark:border-red-300/25 dark:bg-red-500/10 dark:text-red-100';
  }
}

function computeStrategicModel(analysis: Analysis): StrategicModel {
  const metrics = analysis.metrics;
  const classified = analysis.classifiedConnections ?? [];
  const totalClassified = classified.length;
  const usefulCount = classified.filter((item) => item.classification === 'useful').length;

  const usefulShare = totalClassified > 0
    ? usefulCount / totalClassified
    : clamp((metrics.connections - Math.max(0, metrics.connections * 0.42)) / Math.max(1, metrics.connections), 0, 1);

  const outbound = metrics.messagesSent + metrics.connectionRequestsSent;
  const inbound = metrics.messagesReceived + metrics.connectionRequestsReceived;
  const conversationRatio = inbound / Math.max(1, outbound);

  const engagementActions =
    metrics.likesGiven +
    metrics.commentsMade +
    metrics.shares +
    metrics.postsCreated;

  const networkQuality = clamp(
    Math.round(usefulShare * 100 + (metrics.connections >= 500 ? 5 : 0)),
    0,
    100,
  );

  const conversationTraction = clamp(
    Math.round(conversationRatio * 68),
    0,
    100,
  );

  const engagementCadence = clamp(
    Math.round((engagementActions / Math.max(1, metrics.connections)) * 120),
    0,
    100,
  );

  const opportunityVelocity = clamp(
    Math.round(
      metrics.jobsApplied * 3 +
      inbound * 0.55 +
      metrics.postsCreated * 2.5,
    ),
    0,
    100,
  );

  const signals: StrategicSignal[] = [
    {
      id: 'network-quality',
      title: 'Network Quality',
      score: networkQuality,
      detail: `${Math.round(usefulShare * 100)}% of classified relationships are tagged useful for high-context outreach.`,
      nextMove: 'Deepen touchpoints with the top 20 useful connections this week.',
      tone: toneFromScore(networkQuality),
    },
    {
      id: 'conversation-traction',
      title: 'Conversation Traction',
      score: conversationTraction,
      detail: `Inbound/outbound conversation ratio is ${conversationRatio.toFixed(2)}x.`,
      nextMove: 'Prioritize follow-up loops over new cold outreach until reply cadence improves.',
      tone: toneFromScore(conversationTraction),
    },
    {
      id: 'engagement-cadence',
      title: 'Engagement Cadence',
      score: engagementCadence,
      detail: `${engagementActions} total engagement actions detected across your imported activity.`,
      nextMove: 'Block 20-minute daily engagement windows to build consistency.',
      tone: toneFromScore(engagementCadence),
    },
    {
      id: 'opportunity-velocity',
      title: 'Opportunity Velocity',
      score: opportunityVelocity,
      detail: 'Signal combines inbound activity, applications, and content output momentum.',
      nextMove: 'Convert active conversations into referrals, intros, or interviews in 7-day sprints.',
      tone: toneFromScore(opportunityVelocity),
    },
  ];

  const strategicIndex = clamp(
    Math.round(
      networkQuality * 0.34 +
      conversationTraction * 0.31 +
      engagementCadence * 0.2 +
      opportunityVelocity * 0.15,
    ),
    0,
    100,
  );

  const risks: StrategicRisk[] = [];

  if (conversationTraction < 46) {
    risks.push({
      severity: 'risk',
      title: 'Low reply momentum',
      detail: 'Outbound volume is outpacing inbound conversation. Shift from volume to relevance.',
    });
  }

  if (networkQuality < 52) {
    risks.push({
      severity: 'watch',
      title: 'Weak strategic density',
      detail: 'A larger share of your graph is not yet classified as high-fit for goals.',
    });
  }

  if (engagementCadence < 40) {
    risks.push({
      severity: 'watch',
      title: 'Engagement inconsistency',
      detail: 'Your visible activity signal is likely too sparse to compound profile discovery.',
    });
  }

  if (risks.length === 0) {
    risks.push({
      severity: 'watch',
      title: 'No critical blockers detected',
      detail: 'Current strategy is healthy; focus on compounding the strongest signals weekly.',
    });
  }

  const weakestSignals = [...signals]
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);

  const weeklyPriorities = [
    weakestSignals[0]?.nextMove || 'Maintain current operating cadence and review outcomes weekly.',
    weakestSignals[1]?.nextMove || 'Run one focused experiment to improve conversion quality.',
    analysis.goals?.[0]
      ? `Align this week around goal: ${analysis.goals[0].title}.`
      : 'Set one measurable growth objective for the next 7 days and track completion daily.',
  ];

  const executiveSummary = analysis.summary
    ? analysis.summary
    : strategicIndex >= 65
      ? 'Your network is producing healthy strategic signals. Focus now on consistency and conversion loops.'
      : 'Your network has real potential, but the strongest gains will come from improving conversation flow and targeted engagement.';

  return {
    strategicIndex,
    executiveSummary,
    usefulShare,
    conversationRatio,
    signals,
    risks,
    weeklyPriorities,
  };
}

function riskClasses(severity: 'watch' | 'risk'): string {
  return severity === 'risk'
    ? 'border-red-300/60 bg-red-100/95 text-red-800 dark:border-red-300/25 dark:bg-red-500/10 dark:text-red-100'
    : 'border-amber-300/60 bg-amber-100/95 text-amber-800 dark:border-amber-300/25 dark:bg-amber-500/10 dark:text-amber-100';
}

export function StrategicInsightsPanel({ analysis }: StrategicInsightsPanelProps) {
  const model = React.useMemo(() => {
    if (!analysis) return null;
    return computeStrategicModel(analysis);
  }, [analysis]);

  if (!analysis || !model) {
    return (
      <section className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-6">
        <div className="rounded-xl border border-outline-variant/20 bg-hearth-ash p-8 text-center">
          <Compass className="mx-auto h-10 w-10 text-ember-soft" />
          <h3 className="mt-4 font-[Epilogue] text-lg font-bold uppercase tracking-tight text-parchment">
            Strategic Insights Pending
          </h3>
          <p className="mt-2 text-sm text-warm-muted">
            Upload and analyze your LinkedIn export to unlock the strategic signal model.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-[Epilogue] text-lg font-bold uppercase tracking-tight text-parchment">Strategic Insights</h3>
          <p className="mt-1 text-sm text-warm-muted">
            Turn your activity metrics into operating priorities and near-term strategic decisions.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-ember/30 bg-ember/10 px-3 py-1.5 text-[10px] font-[Epilogue] font-bold uppercase tracking-[0.2em] text-ember">
          <Sparkles className="h-3.5 w-3.5" />
          Strategic Index {model.strategicIndex}/100
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-12">
        <section className="space-y-5 xl:col-span-8">
          <div className="rounded-xl border border-outline-variant/25 bg-hearth-ash p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-warm-faint">Executive Brief</p>
            <p className="mt-2 font-[Newsreader] text-lg leading-relaxed text-warm-foreground">
              {model.executiveSummary}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-lg border border-outline-variant/30 bg-pit/65 px-2.5 py-1 text-warm-muted">
                Useful Share: {Math.round(model.usefulShare * 100)}%
              </span>
              <span className="rounded-lg border border-outline-variant/30 bg-pit/65 px-2.5 py-1 text-warm-muted">
                Conversation Ratio: {model.conversationRatio.toFixed(2)}x
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {model.signals.map((signal) => (
              <div key={signal.id} className="rounded-xl border border-outline-variant/25 bg-hearth-ash p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-parchment">{signal.title}</p>
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${toneClasses(signal.tone)}`}>
                    {signal.score}
                  </span>
                </div>
                <p className="mt-2 text-xs text-warm-muted">{signal.detail}</p>
                <p className="mt-3 rounded-md border border-outline-variant/20 bg-pit/60 px-2.5 py-2 text-xs text-warm-foreground">
                  Next move: {signal.nextMove}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 xl:col-span-4">
          <div className="rounded-xl border border-outline-variant/25 bg-hearth-ash p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-ember-soft" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-warm-foreground">Weekly Priorities</p>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-warm-foreground">
              {model.weeklyPriorities.map((priority, index) => (
                <li key={`priority-${index}`} className="rounded-md border border-outline-variant/20 bg-pit/60 px-2.5 py-2">
                  {priority}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-outline-variant/25 bg-hearth-ash p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-200" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-warm-foreground">Risk Radar</p>
            </div>
            <div className="mt-3 space-y-2">
              {model.risks.map((risk, index) => (
                <div key={`risk-${index}`} className={`rounded-md border px-2.5 py-2 ${riskClasses(risk.severity)}`}>
                  <p className="text-xs font-semibold">{risk.title}</p>
                  <p className="mt-1 text-xs opacity-90">{risk.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant/25 bg-hearth-ash p-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-ember-soft" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-warm-foreground">Goal Alignment</p>
            </div>
            <div className="mt-3 space-y-2 text-xs text-warm-foreground">
              {(analysis.goals || []).slice(0, 3).map((goal) => (
                <div key={goal.id} className="rounded-md border border-outline-variant/20 bg-pit/60 px-2.5 py-2">
                  <p className="font-semibold text-parchment">{goal.title}</p>
                  <p className="mt-1 text-warm-muted">{goal.description}</p>
                </div>
              ))}
              {(analysis.goals || []).length === 0 ? (
                <p className="rounded-md border border-outline-variant/20 bg-pit/60 px-2.5 py-2">
                  Goals will appear here after analysis is complete.
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-5 rounded-xl border border-outline-variant/20 bg-hearth-ash p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-warm-faint">
          <TrendingUp className="h-3.5 w-3.5 text-ember-soft" />
          Strategic operating note
        </div>
        <p className="mt-2 text-sm text-warm-foreground">
          Highest leverage comes from improving your two weakest signals first, then compounding with a consistent weekly rhythm.
        </p>
      </div>

      <div className="mt-3 rounded-xl border border-outline-variant/20 bg-hearth-ash p-3">
        <div className="flex items-start gap-2 text-xs text-warm-faint">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 text-warm-faint" />
          Signals are directional and based only on imported LinkedIn data, not full-market context.
        </div>
      </div>
    </section>
  );
}
