'use client';

import * as React from 'react';
import Papa from 'papaparse';
import { BarChart3, Check, ChevronDown, ChevronRight, ExternalLink, Eye, FileText, Search, Sparkles, X } from 'lucide-react';
import { UploadZone } from '@/components/upload-zone';
import { MetricsCards } from '@/components/metrics-cards';
import { ChatWidget } from '@/components/chat-widget';
import { ConnectionGraphPanel } from '@/components/connection-graph-panel';
import { NetworkHealthPanel } from '@/components/network-health-panel';
import { StrategicInsightsPanel } from '@/components/strategic-insights-panel';
import { ForecastingPanel } from '@/components/forecasting-panel';
import { Analysis, ExaResult, ClassifiedConnection, LinkedInMetrics } from '@/types';
import { loadUserPageState, saveUserPageState } from '@/lib/page-state-client';

type InsightDashboardView =
  | 'linkedin-data'
  | 'connection-graph'
  | 'network-health'
  | 'strategic-insights'
  | 'forecasting';

interface UploadedCsvFile {
  name: string;
  size: number;
  headers: string[];
  rows: Record<string, string>[];
  parseError?: string;
}

interface MainDashboardPersistedState {
  activeView?: InsightDashboardView;
  analysis?: Analysis | null;
  selectedGoalId?: string | null;
  searchResults?: ExaResult[];
  uploadedCsvFiles?: UploadedCsvFile[];
}

const CSV_PAGE_SIZE = 25;
const EMPTY_METRICS: LinkedInMetrics = {
  connections: 0,
  messagesSent: 0,
  messagesReceived: 0,
  jobsApplied: 0,
  likesGiven: 0,
  commentsMade: 0,
  shares: 0,
  postsCreated: 0,
  connectionRequestsSent: 0,
  connectionRequestsReceived: 0,
};

interface ClassifiedConnectionsCategoryProps {
  title: string;
  classification: ClassifiedConnection['classification'];
  items: ClassifiedConnection[];
}

function ClassifiedConnectionsCategory({ title, classification, items }: ClassifiedConnectionsCategoryProps) {
  const isUseful = classification === 'useful';
  const [nameSearch, setNameSearch] = React.useState('');
  const toneClasses = isUseful
    ? 'border-emerald-300/35 bg-emerald-500/10'
    : 'border-amber-300/35 bg-amber-500/10';
  const badgeClasses = isUseful
    ? 'border-emerald-300/35 bg-emerald-400/15 text-emerald-100'
    : 'border-amber-300/35 bg-amber-400/15 text-amber-100';

  const filteredItems = React.useMemo(() => {
    const query = nameSearch.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((item) => {
      const fullName = `${item.firstName} ${item.lastName}`.toLowerCase();
      return fullName.includes(query);
    });
  }, [items, nameSearch]);

  // Tilt + shine handlers for interactive card feel
  const MAX_ROT = 6; // degrees

  const handleCardMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = Math.max(0, Math.min(1, x / rect.width));
    const py = Math.max(0, Math.min(1, y / rect.height));

    const rotY = (px - 0.5) * MAX_ROT * 2;
    const rotX = -(py - 0.5) * MAX_ROT * 2;

    el.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02,1.02,1.02)`;
    el.style.transition = 'transform 120ms ease';

    const shine = el.querySelector('.tilt-shine') as HTMLElement | null;
    if (shine) {
      shine.style.opacity = '1';
      shine.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 30%, transparent 45%)`;
    }
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
    el.style.transition = 'transform 300ms cubic-bezier(.2,.9,.2,1)';

    const shine = el.querySelector('.tilt-shine') as HTMLElement | null;
    if (shine) {
      shine.style.opacity = '0';
    }
  };


  return (
    <div className={`rounded-lg border ${toneClasses}`}>
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <h4 className="font-semibold text-parchment">{title}</h4>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${badgeClasses}`}>
          {items.length}
        </span>
      </div>

      {items.length > 0 && (
        <div className="px-4 py-3 border-b border-white/10">
          <input
            type="text"
            value={nameSearch}
            onChange={(event) => setNameSearch(event.target.value)}
            placeholder={`Search names in ${title.toLowerCase()}...`}
            className="w-full h-9 rounded-md border border-ember/25 bg-obsidian/70 px-3 py-2 text-sm text-parchment placeholder:text-parchment/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/50"
          />
          {nameSearch.trim() && (
            <p className="mt-1 text-xs text-parchment/65">
              Showing {filteredItems.length} of {items.length}
            </p>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="px-4 py-4 text-sm text-parchment/70">No connections in this category.</p>
      ) : filteredItems.length === 0 ? (
        <p className="px-4 py-4 text-sm text-parchment/70">No matching names found.</p>
      ) : (
        <ul className="max-h-80 overflow-y-auto divide-y divide-white/10 custom-scrollbar">
          {filteredItems.map((item, index) => {
            const subtitle = [item.title, item.company ? `at ${item.company}` : '']
              .filter(Boolean)
              .join(' ');

            return (
                <li
                  key={`${item.firstName}-${item.lastName}-${index}`}
                  className="relative overflow-hidden rounded-md px-4 py-3 transition-colors tilt-card"
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.willChange = 'transform'; }}
                  style={{ transform: 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)' }}
                >
                  <div className="tilt-shine absolute inset-0 pointer-events-none rounded-md" style={{ opacity: 0, transition: 'opacity 180ms ease, background 120ms linear' }} />
                  <div className="relative z-10">
                    <p className="text-sm font-medium text-parchment">{item.firstName} {item.lastName}</p>
                    <p className="text-xs text-parchment/65">{subtitle || 'No role/company details available'}</p>
                  </div>
                </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

async function buildCsvData(file: File): Promise<UploadedCsvFile> {
  let content = await file.text();

  // LinkedIn connections export often includes metadata lines before headers.
  if (file.name.toLowerCase() === 'connections.csv') {
    const lines = content.split('\n');
    if (lines.length > 3) {
      content = lines.slice(3).join('\n');
    }
  }

  const parsed = Papa.parse<Record<string, unknown>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  });

  const headers = parsed.meta.fields || [];
  const rows = parsed.data.map((row) => {
    const safeRow: Record<string, string> = {};

    headers.forEach((header) => {
      const value = row[header];
      safeRow[header] = value === null || value === undefined ? '' : String(value);
    });

    return safeRow;
  });

  const parseError = parsed.errors.length > 0 && rows.length === 0
    ? 'Could not parse this CSV file.'
    : undefined;

  return {
    name: file.name,
    size: file.size,
    headers,
    rows,
    parseError,
  };
}

export function LinkedInInsightsDashboard() {
  const [activeView, setActiveView] = React.useState<InsightDashboardView>('linkedin-data');
  const [isLoading, setIsLoading] = React.useState(false);
  const [analysis, setAnalysis] = React.useState<Analysis | null>(null);
  const [selectedGoalId, setSelectedGoalId] = React.useState<string | null>(null);
  const [searchResults, setSearchResults] = React.useState<ExaResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [uploadedCsvFiles, setUploadedCsvFiles] = React.useState<UploadedCsvFile[]>([]);
  const [isCsvSectionOpen, setIsCsvSectionOpen] = React.useState(false);
  const [activeCsvIndex, setActiveCsvIndex] = React.useState<number | null>(null);
  const [csvPage, setCsvPage] = React.useState(1);
  const [hasRestoredState, setHasRestoredState] = React.useState(false);
  const csvModalTitleId = React.useId();
  const csvModalRef = React.useRef<HTMLDivElement | null>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  const activeCsv = activeCsvIndex !== null ? uploadedCsvFiles[activeCsvIndex] : null;
  const totalCsvPages = activeCsv ? Math.max(1, Math.ceil(activeCsv.rows.length / CSV_PAGE_SIZE)) : 1;
  const currentCsvPage = Math.min(csvPage, totalCsvPages);
  const csvStartIndex = (currentCsvPage - 1) * CSV_PAGE_SIZE;
  const csvEndIndex = csvStartIndex + CSV_PAGE_SIZE;
  const csvPageRows = activeCsv ? activeCsv.rows.slice(csvStartIndex, csvEndIndex) : [];
  const csvRangeStart = activeCsv && activeCsv.rows.length > 0 ? csvStartIndex + 1 : 0;
  const csvRangeEnd = activeCsv ? Math.min(csvEndIndex, activeCsv.rows.length) : 0;

  React.useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        const savedState = await loadUserPageState<MainDashboardPersistedState>('main-dashboard');

        if (!cancelled && savedState) {
          if (
            savedState.activeView === 'linkedin-data' ||
            savedState.activeView === 'connection-graph' ||
            savedState.activeView === 'network-health' ||
            savedState.activeView === 'strategic-insights' ||
            savedState.activeView === 'forecasting'
          ) {
            setActiveView(savedState.activeView);
          }

          if (savedState.analysis) {
            setAnalysis(savedState.analysis);
          }

          if (typeof savedState.selectedGoalId === 'string' || savedState.selectedGoalId === null) {
            setSelectedGoalId(savedState.selectedGoalId ?? null);
          }

          if (Array.isArray(savedState.searchResults)) {
            setSearchResults(savedState.searchResults);
          }

          if (Array.isArray(savedState.uploadedCsvFiles)) {
            setUploadedCsvFiles(savedState.uploadedCsvFiles);
          }
        }
      } catch (error) {
        console.warn('Failed to restore Main Dashboard state:', error);
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
      void saveUserPageState<MainDashboardPersistedState>('main-dashboard', {
        activeView,
        analysis,
        selectedGoalId,
        searchResults,
        uploadedCsvFiles,
      }).catch((error) => {
        console.warn('Failed to persist Main Dashboard state:', error);
      });
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [activeView, analysis, hasRestoredState, searchResults, selectedGoalId, uploadedCsvFiles]);

  const openCsvModal = React.useCallback((index: number) => {
    setActiveCsvIndex(index);
    setCsvPage(1);
  }, []);

  const closeCsvModal = React.useCallback(() => {
    setActiveCsvIndex(null);
  }, []);

  React.useEffect(() => {
    if (!activeCsv) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const modalElement = csvModalRef.current;
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusables = modalElement
      ? Array.from(modalElement.querySelectorAll<HTMLElement>(focusableSelector))
      : [];
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      modalElement?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCsvModal();
        return;
      }

      if (event.key !== 'Tab' || !modalElement) {
        return;
      }

      const modalFocusables = Array.from(
        modalElement.querySelectorAll<HTMLElement>(focusableSelector)
      );

      if (modalFocusables.length === 0) {
        event.preventDefault();
        modalElement.focus();
        return;
      }

      const first = modalFocusables[0];
      const last = modalFocusables[modalFocusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!active || active === first || !modalElement.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (!active || active === last || !modalElement.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [activeCsv, closeCsvModal]);

  const handleUpload = async (files: File[]) => {
    setIsLoading(true);
    setError(null);

    try {
      const csvFiles = await Promise.all(files.map((file) => buildCsvData(file)));
      setUploadedCsvFiles(csvFiles);
      setIsCsvSectionOpen(false);
      setActiveCsvIndex(null);
      setCsvPage(1);

      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || 'Failed to analyze data');
      }

      const data = (await response.json()) as { success?: boolean; analysis?: Analysis };

      if (!data.success || !data.analysis) {
        throw new Error('Analysis failed');
      }

      setAnalysis(data.analysis);
      if (data.analysis.goals?.length > 0) {
        setSelectedGoalId(data.analysis.goals[0].id);
      }
    } catch (err) {
      console.error('Upload/analysis error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setIsSearching(true);

    try {
      const response = await fetch(`/api/analyze?query=${encodeURIComponent(query)}`);
      const data = (await response.json()) as { success?: boolean; results?: ExaResult[] };

      if (data.success) {
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const metrics = analysis?.metrics ?? EMPTY_METRICS;
  const influenceScore = Math.min(100, Math.max(0, Math.round((metrics.connections / 12000) * 100)));
  const responseNumerator = metrics.messagesReceived + metrics.connectionRequestsReceived;
  const responseDenominator = Math.max(1, metrics.messagesSent + metrics.connectionRequestsSent);
  const responseVelocity = Math.min(100, Math.max(0, Math.round((responseNumerator / responseDenominator) * 50)));

  const insightText = analysis
    ? metrics.messagesReceived >= metrics.messagesSent
      ? 'Your network is pulling signal toward you. Inbound conversation is outpacing outbound effort, which indicates real social gravity around your profile.'
      : 'Your outbound effort is strong. Focus next on follow-up loops and better timing windows to convert more sends into warm inbound replies.'
    : 'Upload your LinkedIn export to reveal a narrative insight rooted in your own network behavior.';

  return (
    <section className="space-y-8 px-4 py-6 md:px-6">
      <section className="relative overflow-hidden rounded-xl border border-outline-variant/20 bg-hearth-ash p-8 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,182,146,0.08),transparent_65%)]" />
        <div className="relative z-10 space-y-4">
          <h1 className="font-[Epilogue] text-5xl font-black uppercase tracking-tight text-parchment md:text-7xl">
            Truss <span className="text-ember-strong">Metrics</span>
          </h1>
          <p className="max-w-3xl font-[Newsreader] text-xl italic text-warm-foreground md:text-2xl">
            Mapping the architecture of your professional network through the lens of primal data.
          </p>
        </div>
      </section>

      <div className="w-fit rounded-lg bg-pit p-1">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setActiveView('linkedin-data')}
            aria-current={activeView === 'linkedin-data' ? 'page' : undefined}
            className={`rounded px-6 py-2 font-[Epilogue] text-xs font-bold uppercase tracking-widest transition-colors ${
              activeView === 'linkedin-data'
                ? 'bg-surface-container-high text-ember'
                : 'text-warm-faint hover:bg-surface-container-high/60 hover:text-warm-foreground'
            }`}
          >
            LinkedIn Data
          </button>
          <button
            type="button"
            onClick={() => setActiveView('connection-graph')}
            aria-current={activeView === 'connection-graph' ? 'page' : undefined}
            className={`rounded px-6 py-2 font-[Epilogue] text-xs font-bold uppercase tracking-widest transition-colors ${
              activeView === 'connection-graph'
                ? 'bg-surface-container-high text-ember'
                : 'text-warm-faint hover:bg-surface-container-high/60 hover:text-warm-foreground'
            }`}
          >
            Connection Graph
          </button>
          <button
            type="button"
            onClick={() => setActiveView('strategic-insights')}
            aria-current={activeView === 'strategic-insights' ? 'page' : undefined}
            className={`rounded px-6 py-2 font-[Epilogue] text-xs font-bold uppercase tracking-widest transition-colors ${
              activeView === 'strategic-insights'
                ? 'bg-surface-container-high text-ember'
                : 'text-warm-faint hover:bg-surface-container-high/60 hover:text-warm-foreground'
            }`}
          >
            Strategic Insights
          </button>
          <button
            type="button"
            onClick={() => setActiveView('network-health')}
            aria-current={activeView === 'network-health' ? 'page' : undefined}
            className={`rounded px-6 py-2 font-[Epilogue] text-xs font-bold uppercase tracking-widest transition-colors ${
              activeView === 'network-health'
                ? 'bg-surface-container-high text-ember'
                : 'text-warm-faint hover:bg-surface-container-high/60 hover:text-warm-foreground'
            }`}
          >
            Network Health
          </button>
          <button
            type="button"
            onClick={() => setActiveView('forecasting')}
            aria-current={activeView === 'forecasting' ? 'page' : undefined}
            className={`rounded px-6 py-2 font-[Epilogue] text-xs font-bold uppercase tracking-widest transition-colors ${
              activeView === 'forecasting'
                ? 'bg-surface-container-high text-ember'
                : 'text-warm-faint hover:bg-surface-container-high/60 hover:text-warm-foreground'
            }`}
          >
            Forecasting
          </button>
        </div>
      </div>

      {activeView === 'connection-graph' ? (
        <ConnectionGraphPanel connections={analysis?.classifiedConnections ?? []} />
      ) : activeView === 'network-health' ? (
        <NetworkHealthPanel analysis={analysis} />
      ) : activeView === 'strategic-insights' ? (
        <StrategicInsightsPanel analysis={analysis} />
      ) : activeView === 'forecasting' ? (
        <ForecastingPanel analysis={analysis} />
      ) : (
        <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <section className="md:col-span-4 rounded-xl border border-outline-variant/15 bg-hearth-ash p-8">
          <div className="space-y-4">
            <h2 className="font-[Epilogue] text-2xl font-bold uppercase tracking-tight text-parchment">Ingest Data</h2>
            <p className="text-sm leading-relaxed text-warm-muted">
              Export your archive from LinkedIn settings and drop ONLY CSV files here, NOT ZIP FILE to ignite the analysis engine.
            </p>
          </div>

          <div className="mt-8">
            <UploadZone onUpload={handleUpload} isLoading={isLoading} />
            {error && (
              <div className="mt-4 rounded-lg border border-red-300/35 bg-red-900/20 p-4">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}
          </div>

          {analysis && analysis.status === 'completed' && (
            <div className="mt-6 inline-flex items-center gap-2 rounded border border-emerald-300/30 bg-emerald-900/20 px-3 py-2 text-xs uppercase tracking-widest text-emerald-200">
              <Check className="h-3.5 w-3.5" />
              Analysis complete
            </div>
          )}
        </section>

        <section className="md:col-span-8 rounded-xl border border-outline-variant/15 bg-surface-container-low p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-[Epilogue] text-lg font-bold uppercase tracking-tight text-parchment">Network Snapshot</h3>
            <span className="rounded border border-ember/20 bg-ember/10 px-3 py-1 text-[10px] font-[Epilogue] font-bold uppercase tracking-widest text-ember">
              {analysis ? 'Live Data' : 'Awaiting Data'}
            </span>
          </div>
          <MetricsCards metrics={metrics} />
          {!analysis && (
            <p className="mt-4 text-xs uppercase tracking-widest text-warm-faint">
              Upload files to replace placeholders with your real metrics.
            </p>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="relative overflow-hidden rounded-xl border border-outline-variant/20 bg-hearth-ash p-8 lg:col-span-7">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-pit to-transparent opacity-70" />
          <div className="relative z-10 space-y-6">
            <h3 className="font-[Epilogue] text-3xl font-black uppercase tracking-tight text-parchment">Strategic Pulse</h3>

            <div className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-warm-muted">
                  <span>Network Influence</span>
                  <span className="font-bold text-ember-strong">{influenceScore}/100</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                  <div className="h-full rounded-full bg-ember-strong" style={{ width: `${influenceScore}%` }} />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-warm-muted">
                  <span>Response Velocity</span>
                  <span className="font-bold text-ember-soft">{responseVelocity}/100</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                  <div className="h-full rounded-full bg-ember-soft" style={{ width: `${responseVelocity}%` }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-8 lg:col-span-5">
          <Sparkles className="mb-4 h-8 w-8 text-ember-strong" />
          <h4 className="mb-3 font-[Epilogue] text-2xl font-bold uppercase leading-tight text-parchment">
            Ancestral Insight:
            <br />
            The Connector
          </h4>
          <p className="font-[Newsreader] text-lg leading-relaxed text-warm-muted">{insightText}</p>
          <div className="mt-6 inline-flex rounded border border-outline-variant/30 bg-hearth-ash px-3 py-2 text-xs uppercase tracking-widest text-warm-faint">
            Inbound ratio: {(responseNumerator / responseDenominator).toFixed(2)}x
          </div>
        </section>
      </div>

      {uploadedCsvFiles.length > 0 && (
        <section className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-[Epilogue] text-lg font-bold uppercase tracking-tight text-parchment">
              <FileText className="h-5 w-5 text-ember-soft" />
              Uploaded CSV Files
            </h3>
            <button
              type="button"
              onClick={() => setIsCsvSectionOpen((open) => !open)}
              className="inline-flex items-center gap-1.5 rounded border border-outline-variant/35 bg-surface-container-high px-3 py-1.5 text-xs font-[Epilogue] font-bold uppercase tracking-widest text-warm-foreground transition-colors hover:bg-surface-raised"
            >
              {isCsvSectionOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {isCsvSectionOpen ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {isCsvSectionOpen && (
            <div className="mt-4 space-y-3">
              {uploadedCsvFiles.map((csvFile, index) => (
                <div key={`${csvFile.name}-${index}`} className="rounded-lg border border-outline-variant/25 bg-pit/65 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-[Epilogue] text-sm font-semibold text-parchment">{csvFile.name}</p>
                      <p className="text-xs text-warm-faint">
                        {formatFileSize(csvFile.size)}
                        {` â€¢ ${csvFile.rows.length} row${csvFile.rows.length === 1 ? '' : 's'}`}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openCsvModal(index)}
                      className="inline-flex items-center gap-1.5 rounded border border-outline-variant/35 bg-surface-container-high px-3 py-1.5 text-xs font-[Epilogue] font-bold uppercase tracking-widest text-warm-foreground transition-colors hover:bg-surface-raised"
                    >
                      <Eye className="h-4 w-4" />
                      Open Full Table
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeCsv && (
        <div
          className="fixed inset-0 z-50 bg-black/50 p-4"
          onClick={closeCsvModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby={csvModalTitleId}
        >
          <div
            ref={csvModalRef}
            tabIndex={-1}
            className="mx-auto flex h-[88vh] max-w-7xl flex-col rounded-lg border border-outline-variant/25 bg-hearth-ash text-parchment shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-outline-variant/25 px-4 py-3">
              <div>
                <h3 id={csvModalTitleId} className="font-[Epilogue] font-semibold">{activeCsv.name}</h3>
                <p className="text-xs text-warm-faint">
                  {formatFileSize(activeCsv.size)} â€¢ {activeCsv.rows.length} row{activeCsv.rows.length === 1 ? '' : 's'} â€¢ {activeCsv.headers.length} column{activeCsv.headers.length === 1 ? '' : 's'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCsvModal}
                className="inline-flex items-center gap-1 rounded border border-outline-variant/35 bg-surface-container-high px-2.5 py-1.5 text-xs font-[Epilogue] font-bold uppercase tracking-widest text-warm-foreground transition-colors hover:bg-surface-raised"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>

            <div className="flex flex-col gap-2 border-b border-outline-variant/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-warm-faint">
                {activeCsv.rows.length > 0
                  ? `Rows ${csvRangeStart}-${csvRangeEnd} of ${activeCsv.rows.length}`
                  : 'No rows found in this CSV file'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCsvPage((page) => Math.max(page - 1, 1))}
                  disabled={currentCsvPage <= 1}
                  className="rounded border border-outline-variant/35 bg-surface-container-high px-3 py-1.5 text-xs font-[Epilogue] font-bold uppercase tracking-widest text-warm-foreground transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="min-w-24 text-center text-xs text-warm-faint">
                  Page {currentCsvPage} of {totalCsvPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCsvPage((page) => Math.min(page + 1, totalCsvPages))}
                  disabled={currentCsvPage >= totalCsvPages}
                  className="rounded border border-outline-variant/35 bg-surface-container-high px-3 py-1.5 text-xs font-[Epilogue] font-bold uppercase tracking-widest text-warm-foreground transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {activeCsv.parseError ? (
                <p className="text-sm text-red-200">{activeCsv.parseError}</p>
              ) : activeCsv.headers.length === 0 ? (
                <p className="text-sm text-warm-faint">No tabular data available for this CSV file.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border border-outline-variant/25 bg-pit/65">
                  <table className="min-w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-hearth-ash">
                      <tr>
                        {activeCsv.headers.map((header) => (
                          <th key={header} className="whitespace-nowrap px-3 py-2 text-left font-semibold">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPageRows.map((row, rowIndex) => (
                        <tr key={`${activeCsv.name}-row-${csvStartIndex + rowIndex}`} className="border-t border-outline-variant/20 text-warm-foreground">
                          {activeCsv.headers.map((header) => (
                            <td key={`${activeCsv.name}-${csvStartIndex + rowIndex}-${header}`} className="px-3 py-2 align-top">
                              <span>{row[header] || '-'}</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {analysis && analysis.status === 'completed' && (
        <>
          <section className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-6">
            <h3 className="mb-4 font-[Epilogue] text-lg font-bold uppercase tracking-tight text-parchment">Actionable Goals</h3>
            <div className="space-y-4">
              {analysis.goals?.map((goal) => (
                <div
                  key={goal.id}
                  className={`cursor-pointer rounded-lg border p-4 transition-all ${
                    selectedGoalId === goal.id
                      ? 'border-ember-soft/40 bg-ember-soft/10'
                      : 'border-outline-variant/25 bg-pit/45 hover:border-ember-soft/30'
                  }`}
                  onClick={() => setSelectedGoalId(goal.id)}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="font-[Epilogue] font-semibold text-parchment">{goal.title}</h4>
                      <p className="mt-1 text-sm text-warm-muted">{goal.description}</p>
                    </div>
                    {goal.searchQuery && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleSearch(goal.searchQuery as string);
                        }}
                        className="inline-flex items-center gap-1 rounded bg-gradient-to-r from-ember to-ember-strong px-3 py-1.5 text-xs font-[Epilogue] font-black uppercase tracking-widest text-on-primary-soft"
                        disabled={isSearching}
                      >
                        <Search className="h-4 w-4" />
                        {isSearching ? 'Searching...' : 'Search'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {searchResults.length > 0 && (
            <section className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-6">
              <h3 className="mb-4 font-[Epilogue] text-lg font-bold uppercase tracking-tight text-parchment">Search Results</h3>
              <div className="space-y-4">
                {searchResults.map((result, index) => (
                  <div key={`${result.url}-${index}`} className="border-b border-outline-variant/20 pb-4 last:border-b-0">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-ember-soft hover:text-ember hover:underline"
                    >
                      <span className="font-[Epilogue] font-semibold">{result.title}</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <p className="mt-1 text-sm text-warm-muted">{result.snippet}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {analysis.classifiedConnections && analysis.classifiedConnections.length > 0 && (
            <section className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-6">
              <h3 className="mb-4 font-[Epilogue] text-lg font-bold uppercase tracking-tight text-parchment">Connection Classification</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <ClassifiedConnectionsCategory
                  title="Useful"
                  classification="useful"
                  items={analysis.classifiedConnections.filter((connection) => connection.classification === 'useful')}
                />
                <ClassifiedConnectionsCategory
                  title="Maybe Useful"
                  classification="maybe_useful"
                  items={analysis.classifiedConnections.filter((connection) => connection.classification === 'maybe_useful')}
                />
              </div>
            </section>
          )}

          <ChatWidget analysis={analysis} />
        </>
      )}

      {!analysis && !isLoading && (
        <section className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-outline-variant/25 bg-pit">
            <BarChart3 className="h-8 w-8 text-ember-soft" />
          </div>
          <h3 className="font-[Epilogue] text-lg font-semibold uppercase tracking-tight text-parchment">No Analysis Yet</h3>
          <p className="mt-2 text-warm-muted">Upload your LinkedIn export to get started.</p>
        </section>
      )}
        </>
      )}
    </section>
  );
}

