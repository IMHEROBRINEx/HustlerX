'use client';

import * as React from 'react';
import { Clock3, Flame, Link2, RefreshCcw, Sparkles, Trash2, UserCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrussConnectAccountStatus, TrussConnectCandidate, TrussConnectSendResult } from '@/types';
import { loadUserPageState, saveUserPageState } from '@/lib/page-state-client';

interface TrussConnectDashboardProps {
  candidates: TrussConnectCandidate[];
  onRemoveCandidate: (candidateId: string) => void;
  onClearCandidates: () => void;
}

interface UnipileConfigurationPayload {
  configured: boolean;
  missing: string[];
  baseUrl?: string;
  setupHint?: string;
}

interface AccountStatusResponse {
  success: boolean;
  accountStatus?: TrussConnectAccountStatus;
  configuration?: UnipileConfigurationPayload;
  warning?: string;
  error?: string;
}

interface HostedLinkResponse {
  success: boolean;
  url?: string;
  expiresOn?: string;
  configuration?: UnipileConfigurationPayload;
  error?: string;
}

interface SendRequestsResponse {
  success: boolean;
  results?: TrussConnectSendResult[];
  summary?: {
    requested: number;
    sent: number;
    failed: number;
    skipped: number;
    dailyLimit: number;
    remainingDailyQuota: number;
  };
  configuration?: UnipileConfigurationPayload;
  error?: string;
}

interface PersonalizedMessagesResponse {
  success: boolean;
  mode?: 'ai' | 'fallback';
  warning?: string;
  messages?: Array<{
    candidateId: string;
    fullName: string;
    message: string;
  }>;
  error?: string;
}

interface TrussConnectPersistedState {
  messageTemplate?: string;
  candidateMessages?: Record<string, string>;
  sendResults?: TrussConnectSendResult[];
  sendSummary?: SendRequestsResponse['summary'] | null;
}

function getCandidateFirstName(candidate: TrussConnectCandidate): string {
  if (candidate.firstName?.trim()) {
    return candidate.firstName.trim();
  }

  const first = candidate.fullName.trim().split(/\s+/)[0] || 'there';
  return first;
}

function applyTemplateToCandidate(template: string, candidate: TrussConnectCandidate): string {
  const firstName = getCandidateFirstName(candidate);

  return template
    .replace(/\{\{\s*name\s*\}\}/gi, firstName)
    .replace(/\{\{\s*company\s*\}\}/gi, candidate.company || 'your team')
    .replace(/\{\{\s*role\s*\}\}/gi, candidate.title || 'your role')
    .replace(/\{\{\s*location\s*\}\}/gi, candidate.location || 'your region')
    .replace(/\s+/g, ' ')
    .trim();
}

function fallbackPersonalizedMessage(candidate: TrussConnectCandidate, template?: string): string {
  if (template && template.trim()) {
    return applyTemplateToCandidate(template, candidate);
  }

  const firstName = getCandidateFirstName(candidate);
  const roleSegment = candidate.title ? ` as ${candidate.title}` : '';
  const companySegment = candidate.company ? ` at ${candidate.company}` : '';

  return `Hi ${firstName}, I came across your profile${roleSegment}${companySegment} and would love to connect and exchange ideas.`;
}

export function TrussConnectDashboard({
  candidates,
  onRemoveCandidate,
  onClearCandidates,
}: TrussConnectDashboardProps) {
  const [accountStatus, setAccountStatus] = React.useState<TrussConnectAccountStatus | null>(null);
  const [statusError, setStatusError] = React.useState<string | null>(null);
  const [sendError, setSendError] = React.useState<string | null>(null);
  const [statusWarning, setStatusWarning] = React.useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = React.useState(false);
  const [isCreatingLink, setIsCreatingLink] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [isGeneratingMessages, setIsGeneratingMessages] = React.useState(false);
  const [isStreamingTemplate, setIsStreamingTemplate] = React.useState(false);
  const [messageTemplate, setMessageTemplate] = React.useState('');
  const [candidateMessages, setCandidateMessages] = React.useState<Record<string, string>>({});
  const [messageGenerationWarning, setMessageGenerationWarning] = React.useState<string | null>(null);
  const [sendResults, setSendResults] = React.useState<TrussConnectSendResult[]>([]);
  const [sendSummary, setSendSummary] = React.useState<SendRequestsResponse['summary'] | null>(null);
  const [configuration, setConfiguration] = React.useState<UnipileConfigurationPayload | null>(null);
  const [hasRestoredState, setHasRestoredState] = React.useState(false);
  const popupCleanupRef = React.useRef<(() => void) | null>(null);
  const isMountedRef = React.useRef(true);
  const templateStreamRunRef = React.useRef(0);

  React.useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      templateStreamRunRef.current += 1;
      popupCleanupRef.current?.();
      popupCleanupRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        const savedState = await loadUserPageState<TrussConnectPersistedState>('truss-connect');
        if (!cancelled && savedState) {
          if (typeof savedState.messageTemplate === 'string') {
            setMessageTemplate(savedState.messageTemplate);
          }

          if (savedState.candidateMessages && typeof savedState.candidateMessages === 'object') {
            setCandidateMessages(savedState.candidateMessages);
          }

          if (Array.isArray(savedState.sendResults)) {
            setSendResults(savedState.sendResults);
          }

          if (savedState.sendSummary !== undefined) {
            setSendSummary(savedState.sendSummary ?? null);
          }
        }
      } catch (error) {
        console.warn('Failed to restore HustlerX Connect state:', error);
      } finally {
        if (!cancelled) {
          setHasRestoredState(true);
        }
      }
    };

    void restore();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!hasRestoredState) return;

    const timeoutId = setTimeout(() => {
      void saveUserPageState<TrussConnectPersistedState>('truss-connect', {
        messageTemplate,
        candidateMessages,
        sendResults,
        sendSummary,
      }).catch((error) => {
        console.warn('Failed to persist HustlerX Connect state:', error);
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [candidateMessages, hasRestoredState, messageTemplate, sendResults, sendSummary]);

  React.useEffect(() => {
    setCandidateMessages((current) => {
      const allowedIds = new Set(candidates.map((candidate) => candidate.id));
      const next: Record<string, string> = {};

      Object.entries(current).forEach(([candidateId, message]) => {
        if (allowedIds.has(candidateId)) {
          next[candidateId] = message;
        }
      });

      const isSameSize = Object.keys(next).length === Object.keys(current).length;
      return isSameSize ? current : next;
    });
  }, [candidates]);

  const refreshStatus = React.useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    setIsCheckingStatus(true);
    setStatusError(null);
    setStatusWarning(null);

    try {
      const response = await fetch('/api/truss-connect/account-status');
      const data = (await response.json()) as AccountStatusResponse;

      if (!response.ok || !data.success || !data.accountStatus) {
        throw new Error(data.error || 'Unable to fetch account status');
      }

      if (!isMountedRef.current) {
        return;
      }

      setAccountStatus(data.accountStatus);
      setConfiguration(data.configuration || null);
      setSendError(null);
      if (data.warning) {
        setStatusWarning(data.warning);
      }
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }

      setStatusError(err instanceof Error ? err.message : 'Failed to load account status');
      setAccountStatus(null);
      setConfiguration(null);
    } finally {
      if (isMountedRef.current) {
        setIsCheckingStatus(false);
      }
    }
  }, []);

  React.useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const openCenteredPopup = (url: string): Window | null => {
    const width = 540;
    const height = 760;
    const left = Math.max(window.screenX + (window.outerWidth - width) / 2, 0);
    const top = Math.max(window.screenY + (window.outerHeight - height) / 2, 0);

    return window.open(
      url,
      'truss-connect-linkedin',
      `popup=yes,width=${width},height=${height},left=${Math.round(left)},top=${Math.round(top)},resizable=yes,scrollbars=yes`,
    );
  };

  const handleConnectLinkedIn = async () => {
    setIsCreatingLink(true);
    setStatusError(null);
    popupCleanupRef.current?.();
    popupCleanupRef.current = null;

    try {
      const response = await fetch('/api/unipile/hosted-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providers: ['LINKEDIN'],
          type: 'create',
        }),
      });

      const data = (await response.json()) as HostedLinkResponse;

      if (data.configuration) {
        setConfiguration(data.configuration);
      }

      if (!response.ok || !data.success || !data.url) {
        throw new Error(data.error || 'Failed to create hosted auth link');
      }

      const popup = openCenteredPopup(data.url);
      if (!popup) {
        // Popup blockers can prevent opening a window, so fall back to full redirect.
        window.location.href = data.url;
        return;
      }

      setStatusWarning('Complete LinkedIn authorization in the popup. Status will refresh automatically.');

      let pollIntervalId = 0;
      let cleanedUp = false;

      const handlePopupMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;
        }

        const payload = event.data as { type?: string; status?: string } | undefined;
        if (!payload || payload.type !== 'truss-connect-linkedin-complete') {
          return;
        }

        cleanup();
        if (isMountedRef.current) {
          void refreshStatus();
        }
      };

      const cleanup = () => {
        if (cleanedUp) {
          return;
        }

        cleanedUp = true;
        if (pollIntervalId) {
          window.clearInterval(pollIntervalId);
        }

        window.removeEventListener('message', handlePopupMessage);
        if (popupCleanupRef.current === cleanup) {
          popupCleanupRef.current = null;
        }
      };

      popupCleanupRef.current = cleanup;
      window.addEventListener('message', handlePopupMessage);

      const startTime = Date.now();
      pollIntervalId = window.setInterval(() => {
        const elapsed = Date.now() - startTime;

        if (popup.closed || elapsed > 180000) {
          cleanup();

          if (!isMountedRef.current) {
            return;
          }

          void refreshStatus();

          if (elapsed > 180000) {
            setStatusWarning('LinkedIn authorization timed out. Click Refresh Status after finishing sign-in.');
          }
        }
      }, 750);
    } catch (err) {
      if (isMountedRef.current) {
        setStatusError(err instanceof Error ? err.message : 'Unable to create hosted auth link');
      }
    } finally {
      if (isMountedRef.current) {
        setIsCreatingLink(false);
      }
    }
  };

  const handleSendRequests = async () => {
    if (candidates.length === 0 || isSending) return;

    setIsSending(true);
    setSendError(null);

    try {
      const personalizedMap = await requestPersonalizedMessages(true);

      const response = await fetch('/api/truss-connect/send-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: accountStatus?.accountId,
          recipients: candidates.map((candidate) => ({
            candidateId: candidate.id,
            fullName: candidate.fullName,
            profileUrl: candidate.profileUrl,
            message:
              personalizedMap?.[candidate.id]?.trim() ||
              fallbackPersonalizedMessage(candidate, messageTemplate),
          })),
        }),
      });

      const data = (await response.json()) as SendRequestsResponse;

      if (data.configuration) {
        setConfiguration(data.configuration);
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send connection requests');
      }

      setSendResults(data.results || []);
      setSendSummary(data.summary || null);
      await refreshStatus();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Send operation failed');
      setSendResults([]);
      setSendSummary(null);
    } finally {
      setIsSending(false);
    }
  };

  const requestPersonalizedMessages = React.useCallback(
    async (forceRegenerate: boolean): Promise<Record<string, string> | null> => {
      const targetCandidates = forceRegenerate
        ? candidates
        : candidates.filter((candidate) => !(candidateMessages[candidate.id] || '').trim());

      if (targetCandidates.length === 0) {
        return candidateMessages;
      }

      setIsGeneratingMessages(true);
      setMessageGenerationWarning(null);

      try {
        const response = await fetch('/api/truss-connect/personalized-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageTemplate: messageTemplate.trim() || undefined,
            recipients: targetCandidates.map((candidate) => ({
              candidateId: candidate.id,
              fullName: candidate.fullName,
              firstName: candidate.firstName,
              title: candidate.title,
              company: candidate.company,
              location: candidate.location,
            })),
          }),
        });

        const data = (await response.json()) as PersonalizedMessagesResponse;

        if (!response.ok || !data.success || !Array.isArray(data.messages)) {
          throw new Error(data.error || 'Failed to generate personalized messages');
        }

        const mergedMessages: Record<string, string> = {
          ...candidateMessages,
        };

        data.messages.forEach((item) => {
          const candidateId = item.candidateId?.trim();
          const message = item.message?.trim();

          if (!candidateId || !message) {
            return;
          }

          mergedMessages[candidateId] = message;
        });

        setCandidateMessages(mergedMessages);

        if (data.warning) {
          setMessageGenerationWarning(data.warning);
        }

        return mergedMessages;
      } catch (error) {
        setSendError(error instanceof Error ? error.message : 'Failed to generate personalized messages');
        return null;
      } finally {
        setIsGeneratingMessages(false);
      }
    },
    [candidateMessages, candidates, messageTemplate],
  );

  const streamIntoMainTemplate = React.useCallback(async (message: string) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }

    const runId = templateStreamRunRef.current + 1;
    templateStreamRunRef.current = runId;
    setIsStreamingTemplate(true);

    try {
      setMessageTemplate('');

      for (let index = 0; index < trimmedMessage.length; index += 5) {
        if (!isMountedRef.current || templateStreamRunRef.current !== runId) {
          return;
        }

        const nextIndex = Math.min(trimmedMessage.length, index + 5);
        setMessageTemplate(trimmedMessage.slice(0, nextIndex));

        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 14);
        });
      }
    } finally {
      if (isMountedRef.current && templateStreamRunRef.current === runId) {
        setIsStreamingTemplate(false);
      }
    }
  }, []);

  const handleGenerateMainTemplate = React.useCallback(async () => {
    if (candidates.length === 0 || isGeneratingMessages || isStreamingTemplate) {
      return;
    }

    const personalizedMap = await requestPersonalizedMessages(true);
    if (!personalizedMap) {
      return;
    }

    const firstCandidate = candidates[0];
    if (!firstCandidate) {
      return;
    }

    const generatedMessage =
      personalizedMap[firstCandidate.id]?.trim() || fallbackPersonalizedMessage(firstCandidate, messageTemplate);

    await streamIntoMainTemplate(generatedMessage);
  }, [
    candidates,
    isGeneratingMessages,
    isStreamingTemplate,
    messageTemplate,
    requestPersonalizedMessages,
    streamIntoMainTemplate,
  ]);

  const connected = accountStatus?.connected ?? false;
  const isUnipileConfigured = configuration?.configured ?? true;
  const pendingCount = candidates.length;
  const estimatedMinutes = Math.max(1, Math.ceil((pendingCount * 20) / 60));
  const systemOnline = connected && isUnipileConfigured;

  const recommendation = systemOnline
    ? accountStatus?.remainingToday !== undefined
      ? `You have ${accountStatus.remainingToday} requests left today. Trigger this batch now while the candidates are fresh and context-rich.`
      : 'Your LinkedIn bridge is stable. Run this batch while outreach intent is high to improve acceptance rates.'
    : 'Reconnect LinkedIn before sending. Once connected, run a small warm-up batch first, then escalate to full queue.';

  const initialsFromName = (fullName: string): string => {
    const parts = fullName
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2);

    if (parts.length === 0) {
      return 'NA';
    }

    return parts.map((part) => part[0]!.toUpperCase()).join('');
  };

  return (
    <section className="space-y-8 px-4 py-6 md:px-6">
      <section className="relative overflow-hidden rounded-xl border border-outline-variant/20 bg-hearth-ash p-8 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,182,146,0.08),transparent_60%)]" />
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <h1 className="font-[Epilogue] text-5xl font-black uppercase tracking-tight text-parchment md:text-6xl">
              HustlerX Connect
            </h1>
            <p className="max-w-xl font-[Newsreader] text-xl italic text-warm-foreground">
              Orchestrate outreach with human warmth and system-level precision.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-raised/60 px-4 py-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${systemOnline ? 'bg-ember-strong shadow-[0_0_10px_#ff6d00]' : 'bg-warm-faint/70'}`}
            />
            <span className="font-[Epilogue] text-xs font-bold uppercase tracking-widest text-ember">
              {systemOnline ? 'System Online' : 'System Attention'}
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-4">
          <section className="space-y-6 rounded-xl border border-outline-variant/15 bg-surface-container-low p-6">
            <h3 className="font-[Epilogue] text-xs font-bold uppercase tracking-[0.2em] text-warm-foreground">
              HustlerX Connect Status
            </h3>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-linkedin/10 text-linkedin">
                  <Link2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-[Epilogue] text-sm font-bold text-parchment">LinkedIn API</p>
                  <p className={`text-xs font-medium ${connected ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {connected ? 'Connected' : 'Session Expired'}
                  </p>
                </div>
              </div>
            </div>

            {configuration && !configuration.configured && (
              <div className="space-y-1 rounded-lg border border-amber-300/30 bg-amber-900/20 p-3 text-xs text-amber-100">
                <p className="font-semibold">Unipile setup is incomplete.</p>
                <p>Missing: {configuration.missing.join(', ')}</p>
                <p>{configuration.setupHint || 'Set missing env vars and refresh status.'}</p>
              </div>
            )}

            {statusWarning && <p className="text-xs text-amber-200">{statusWarning}</p>}
            {statusError && <p className="text-xs text-red-200">{statusError}</p>}

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => void handleConnectLinkedIn()}
                disabled={isCreatingLink || !isUnipileConfigured}
                className="h-12 bg-gradient-to-r from-ember to-ember-strong font-[Epilogue] text-sm font-black uppercase tracking-[0.12em] text-on-primary-soft hover:brightness-105"
              >
                <UserCheck className="mr-2 h-4 w-4" />
                {isCreatingLink ? 'Creating Link...' : connected ? 'Reconnect LinkedIn' : 'Connect LinkedIn'}
              </Button>

              <Button
                variant="outline"
                onClick={() => void refreshStatus()}
                disabled={isCheckingStatus}
                className="h-10 border-outline-variant/40 bg-surface-container-high text-parchment hover:bg-surface-raised"
              >
                <RefreshCcw className={`mr-2 h-4 w-4 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                Refresh Status
              </Button>
            </div>
          </section>

          <section className="space-y-6 rounded-xl border border-outline-variant/15 bg-surface-container-low p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-[Epilogue] text-xs font-bold uppercase tracking-[0.2em] text-warm-foreground">Candidate Queue</h3>
              <span className="font-[Epilogue] text-xs font-bold uppercase tracking-widest text-ember">
                {pendingCount} Pending
              </span>
            </div>

            {pendingCount === 0 ? (
              <p className="text-sm text-warm-muted">No candidates queued yet. Add profiles from HustlerX Intelligence.</p>
            ) : (
              <div className="max-h-72 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                {candidates.map((candidate) => (
                  <div key={candidate.id} className="group flex items-center gap-3 rounded-lg border border-outline-variant/20 bg-surface-container-high/55 p-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-surface-raised text-xs font-bold text-ember">
                      {initialsFromName(candidate.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-[Epilogue] text-sm font-bold text-parchment">{candidate.fullName}</p>
                      <p className="truncate text-[10px] uppercase tracking-tight text-warm-faint">
                        {candidate.title || 'Role Unknown'}
                        {candidate.company ? ` â€¢ ${candidate.company}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveCandidate(candidate.id)}
                      className="text-warm-foreground transition-colors hover:text-red-200"
                      title="Remove candidate"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onClearCandidates}
              disabled={pendingCount === 0}
              className="w-full border-outline-variant/40 bg-surface-container-high text-parchment hover:bg-surface-raised"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Queue
            </Button>
          </section>
        </div>

        <div className="space-y-8 lg:col-span-8">
          <section className="space-y-8 rounded-xl border border-outline-variant/15 bg-hearth-ash p-8 shadow-2xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="font-[Epilogue] text-2xl font-black uppercase tracking-tight text-ember">
                Send Connection Requests
                (PLS send One Due to Free Tier Limit)
              </h2>
              <div className="flex flex-wrap gap-2">
                <span className="rounded border border-outline-variant/20 bg-surface-raised px-3 py-1 text-[10px] font-[Epilogue] font-bold uppercase tracking-widest text-warm-foreground">
                  Bulk Mode
                </span>
                <span className="rounded border border-ember/20 bg-ember/10 px-3 py-1 text-[10px] font-[Epilogue] font-bold uppercase tracking-widest text-ember">
                  AI Optimized
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block font-[Epilogue] text-xs font-bold uppercase tracking-[0.2em] text-warm-foreground">
                Custom Note Template (Optional)
              </label>

              <div className="group relative">
                <textarea
                  value={messageTemplate}
                  onChange={(event) => {
                    templateStreamRunRef.current += 1;
                    setIsStreamingTemplate(false);
                    setMessageTemplate(event.target.value);
                  }}
                  rows={6}
                  className="w-full resize-none rounded-lg bg-pit p-6 font-[Newsreader] text-lg leading-relaxed text-parchment placeholder:text-warm-faint/60 focus:outline-none focus:ring-0"
                  placeholder="Hello {{name}}, I noticed your work at {{company}} and was impressed by your approach..."
                />
                <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-ember-soft to-transparent opacity-0 transition-opacity group-focus-within:opacity-100" />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleGenerateMainTemplate()}
                  disabled={pendingCount === 0 || isGeneratingMessages || isStreamingTemplate}
                  className="h-7 border-ember-soft/25 bg-ember-soft/8 px-3 text-[10px] font-[Epilogue] font-bold uppercase tracking-widest text-ember-soft hover:bg-ember-soft/14"
                >
                  <Sparkles className={`mr-1 h-3.5 w-3.5 ${isGeneratingMessages || isStreamingTemplate ? 'animate-pulse' : ''}`} />
                  {isGeneratingMessages ? 'Generating...' : isStreamingTemplate ? 'Streaming...' : 'Generate AI Messages'}
                </Button>
              </div>

              {messageGenerationWarning ? (
                <p className="text-xs text-amber-200">{messageGenerationWarning}</p>
              ) : null}

              {pendingCount > 1 ? (
                <p className="text-[11px] text-warm-faint">
                  The streamed draft is based on the first queued candidate. Final send still personalizes messages for each candidate.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-6 border-t border-outline-variant/20 pt-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="font-[Epilogue] text-xs font-bold uppercase tracking-[0.18em] text-warm-foreground">Total Batch</span>
                  <span className="font-[Epilogue] text-2xl font-black text-parchment">
                    {pendingCount} <span className="text-sm font-normal text-warm-faint">profiles</span>
                  </span>
                </div>

                <div className="h-10 w-px bg-outline-variant/30" />

                <div className="flex flex-col">
                  <span className="font-[Epilogue] text-xs font-bold uppercase tracking-[0.18em] text-warm-foreground">Estimated Time</span>
                  <span className="font-[Epilogue] text-2xl font-black text-parchment">
                    {estimatedMinutes} <span className="text-sm font-normal text-warm-faint">min</span>
                  </span>
                </div>
              </div>

              <Button
                onClick={() => void handleSendRequests()}
                disabled={isSending || pendingCount === 0 || !connected || !isUnipileConfigured}
                className="h-14 rounded-lg bg-gradient-to-r from-ember to-ember-strong px-8 font-[Epilogue] text-sm font-black uppercase tracking-[0.2em] text-on-primary-soft shadow-[0_10px_30px_rgba(255,109,0,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105"
              >
                {isSending ? (
                  <RefreshCcw className="mr-3 h-4 w-4 animate-spin" />
                ) : (
                  <Flame className="mr-3 h-4 w-4" />
                )}
                {isSending ? 'Sending...' : 'Ignite Outreach'}
              </Button>
            </div>

            {!connected && <p className="text-xs text-warm-muted">Connect LinkedIn account before sending requests.</p>}
            {!isUnipileConfigured && <p className="text-xs text-warm-muted">Complete Unipile env setup before sending requests.</p>}
            {sendError && <p className="text-sm text-red-200">{sendError}</p>}

            {sendSummary && (
              <div className="rounded-lg border border-outline-variant/25 bg-pit/65 p-4 text-xs text-warm-muted">
                <p>Requested: {sendSummary.requested}</p>
                <p>Sent: {sendSummary.sent}</p>
                <p>Failed: {sendSummary.failed}</p>
                <p>Skipped: {sendSummary.skipped}</p>
                <p>Remaining quota: {sendSummary.remainingDailyQuota} / {sendSummary.dailyLimit}</p>
              </div>
            )}

            {sendResults.length > 0 && (
              <div className="max-h-72 overflow-y-auto rounded-lg border border-outline-variant/20 bg-pit/55 custom-scrollbar">
                {sendResults.map((result, index) => (
                  <div key={`${result.recipientKey}-${result.status}-${index}`} className="border-b border-outline-variant/20 p-3 text-sm last:border-b-0">
                    <p className="font-[Epilogue] font-semibold text-parchment">{result.fullName}</p>
                    <p className="text-xs text-warm-muted">
                      Status: {result.status}
                      {result.reason ? ` â€¢ ${result.reason}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="flex items-start gap-5 rounded-xl border border-outline-variant/15 bg-surface-container-low p-8">
            <div className="rounded-full bg-ember-soft/10 p-3 text-ember-soft">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h4 className="font-[Epilogue] font-bold uppercase tracking-wider text-parchment">Hearth Recommendation</h4>
              <p className="font-[Newsreader] text-lg italic leading-relaxed text-warm-muted">
                {recommendation}
              </p>
              <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-warm-faint">
                <Clock3 className="h-3.5 w-3.5" />
                Live guidance updates with status refresh
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

