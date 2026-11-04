'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { Activity, Building2, CalendarDays, ExternalLink, Link2, Network, Search, Sparkles } from 'lucide-react';
import type { ClassifiedConnection } from '@/types';

type ConnectionFilter = 'all' | ClassifiedConnection['classification'];

type GraphNode = {
  id: string;
  x: number;
  y: number;
  radius: number;
  fullName: string;
  label: string;
  classification: 'center' | ClassifiedConnection['classification'];
  title?: string;
  company?: string;
  reason?: string;
  connectedOn?: string;
  profileUrl?: string;
};

type GraphEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  kind: 'useful' | 'maybe_useful' | 'company';
};

interface ConnectionGraphPanelProps {
  connections: ClassifiedConnection[];
}

const GRAPH_WIDTH = 1080;
const GRAPH_HEIGHT = 640;
const GRAPH_CENTER_X = GRAPH_WIDTH / 2;
const GRAPH_CENTER_Y = GRAPH_HEIGHT / 2;
const MAX_GRAPH_CONNECTIONS = 300;

const FILTER_COPY: Array<{ id: ConnectionFilter; label: string }> = [
  { id: 'all', label: 'All connections' },
  { id: 'useful', label: 'Useful' },
  { id: 'maybe_useful', label: 'Maybe useful' },
];

type DragState = {
  nodeId: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
} | null;

type HoverState = {
  nodeId: string;
  x: number;
  y: number;
} | null;

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeKey(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

function parseConnectionDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const directDate = new Date(value);
  if (!Number.isNaN(directDate.valueOf())) {
    return directDate;
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (!match) {
    return null;
  }

  const first = Number(match[1]);
  const second = Number(match[2]);
  const rawYear = Number(match[3]);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;

  const monthDayGuess = new Date(year, first - 1, second);
  if (
    monthDayGuess.getFullYear() === year &&
    monthDayGuess.getMonth() === first - 1 &&
    monthDayGuess.getDate() === second
  ) {
    return monthDayGuess;
  }

  const dayMonthGuess = new Date(year, second - 1, first);
  if (
    dayMonthGuess.getFullYear() === year &&
    dayMonthGuess.getMonth() === second - 1 &&
    dayMonthGuess.getDate() === first
  ) {
    return dayMonthGuess;
  }

  return null;
}

function connectionYearFromDate(value?: string): string | null {
  const parsed = parseConnectionDate(value);
  return parsed ? String(parsed.getFullYear()) : null;
}

function toSvgCoordinates(clientX: number, clientY: number, svgElement: SVGSVGElement) {
  const rect = svgElement.getBoundingClientRect();

  if (rect.width === 0 || rect.height === 0) {
    return { x: GRAPH_CENTER_X, y: GRAPH_CENTER_Y };
  }

  return {
    x: ((clientX - rect.left) * GRAPH_WIDTH) / rect.width,
    y: ((clientY - rect.top) * GRAPH_HEIGHT) / rect.height,
  };
}

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function jitterFromSeed(seed: string, amplitude: number): number {
  const normalized = (hashSeed(seed) % 1000) / 1000;
  return (normalized - 0.5) * 2 * amplitude;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

type EllipseBand = {
  minXRadius: number;
  maxXRadius: number;
  minYRadius: number;
  maxYRadius: number;
};

function computeBandPosition(index: number, total: number, seed: string, band: EllipseBand) {
  const safeTotal = Math.max(total, 1);
  const progress = Math.sqrt((index + 0.5) / safeTotal);
  const angle = index * GOLDEN_ANGLE + jitterFromSeed(`${seed}-angle`, 0.42);

  const xRadius = band.minXRadius + (band.maxXRadius - band.minXRadius) * progress;
  const yRadius = band.minYRadius + (band.maxYRadius - band.minYRadius) * progress;

  const x = clampValue(
    GRAPH_CENTER_X + Math.cos(angle) * xRadius + jitterFromSeed(`${seed}-x`, 8),
    26,
    GRAPH_WIDTH - 26,
  );
  const y = clampValue(
    GRAPH_CENTER_Y + Math.sin(angle) * yRadius + jitterFromSeed(`${seed}-y`, 6),
    26,
    GRAPH_HEIGHT - 26,
  );

  return { x, y };
}

function toShortLabel(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return parts[0] || 'Unknown';
  }

  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

function buildGraph(connections: ClassifiedConnection[]) {
  const allConnections = [...connections].sort((a, b) => {
    const leftName = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
    const rightName = `${b.firstName} ${b.lastName}`.trim().toLowerCase();
    return leftName.localeCompare(rightName);
  });
  const cappedConnections = allConnections.slice(0, MAX_GRAPH_CONNECTIONS);
  const useful = cappedConnections.filter((item) => item.classification === 'useful');
  const maybeUseful = cappedConnections.filter((item) => item.classification === 'maybe_useful');

  const usefulRadius = useful.length > 600 ? 6 : useful.length > 250 ? 8 : 11;
  const maybeUsefulRadius = maybeUseful.length > 600 ? 5 : maybeUseful.length > 250 ? 7 : 9;

  const centerNode: GraphNode = {
    id: 'you',
    x: GRAPH_CENTER_X,
    y: GRAPH_CENTER_Y,
    radius: 26,
    fullName: 'You',
    label: 'You',
    classification: 'center',
  };

  const usefulNodes: GraphNode[] = useful.map((item, index) => {
    const fullName = `${item.firstName} ${item.lastName}`.trim();
    const position = computeBandPosition(index, useful.length, fullName, {
      minXRadius: 90,
      maxXRadius: 255,
      minYRadius: 64,
      maxYRadius: 150,
    });

    return {
      id: `useful-${index}-${fullName}`,
      x: position.x,
      y: position.y,
      radius: usefulRadius,
      fullName,
      label: toShortLabel(fullName),
      classification: 'useful',
      title: item.title,
      company: item.company,
      reason: item.reason,
      connectedOn: item.connectedOn,
      profileUrl: item.profileUrl,
    };
  });

  const maybeUsefulNodes: GraphNode[] = maybeUseful.map((item, index) => {
    const fullName = `${item.firstName} ${item.lastName}`.trim();
    const position = computeBandPosition(index, maybeUseful.length, fullName, {
      minXRadius: 265,
      maxXRadius: 500,
      minYRadius: 160,
      maxYRadius: 288,
    });

    return {
      id: `maybe-${index}-${fullName}`,
      x: position.x,
      y: position.y,
      radius: maybeUsefulRadius,
      fullName,
      label: toShortLabel(fullName),
      classification: 'maybe_useful',
      title: item.title,
      company: item.company,
      reason: item.reason,
      connectedOn: item.connectedOn,
      profileUrl: item.profileUrl,
    };
  });

  const nodes = [centerNode, ...usefulNodes, ...maybeUsefulNodes];

  const radialEdges: GraphEdge[] = nodes
    .filter((node) => node.id !== 'you')
    .map((node) => ({
      id: `edge-you-${node.id}`,
      sourceId: 'you',
      targetId: node.id,
      kind: node.classification === 'useful' ? 'useful' : 'maybe_useful',
    }));

  const companyBuckets = new Map<string, GraphNode[]>();

  nodes.forEach((node) => {
    if (node.id === 'you' || !node.company) return;

    const key = node.company.toLowerCase().trim();
    if (!key) return;

    const bucket = companyBuckets.get(key) ?? [];
    bucket.push(node);
    companyBuckets.set(key, bucket);
  });

  const companyEdges: GraphEdge[] = [];
  companyBuckets.forEach((bucket, companyName) => {
    if (bucket.length < 2) return;

    for (let i = 0; i < bucket.length - 1; i += 1) {
      companyEdges.push({
        id: `edge-company-${companyName}-${i}`,
        sourceId: bucket[i].id,
        targetId: bucket[i + 1].id,
        kind: 'company',
      });
    }
  });

  return {
    nodes,
    edges: [...radialEdges, ...companyEdges],
    usefulCount: useful.length,
    maybeUsefulCount: maybeUseful.length,
  };
}

function edgePath(source: GraphNode, target: GraphNode, bend = 0.16) {
  const mx = (source.x + target.x) / 2;
  const my = (source.y + target.y) / 2;
  const dx = target.x - source.x;
  const dy = target.y - source.y;

  const cx = mx - dy * bend;
  const cy = my + dx * bend;

  return `M ${source.x} ${source.y} Q ${cx} ${cy} ${target.x} ${target.y}`;
}

function buildLinkedInProfileHref(node: GraphNode): string {
  if (node.profileUrl) {
    return node.profileUrl;
  }

  const searchTerms = [node.fullName, node.company]
    .filter(Boolean)
    .join(' ')
    .trim();

  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchTerms)}`;
}

export function ConnectionGraphPanel({ connections }: ConnectionGraphPanelProps) {
  const [activeFilter, setActiveFilter] = React.useState<ConnectionFilter>('all');
  const [searchValue, setSearchValue] = React.useState('');
  const [companyFilter, setCompanyFilter] = React.useState('all');
  const [yearFilter, setYearFilter] = React.useState('all');
  const [showCompanyEdges, setShowCompanyEdges] = React.useState(true);
  const graph = React.useMemo(() => buildGraph(connections), [connections]);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [nodePositions, setNodePositions] = React.useState<Record<string, { x: number; y: number }>>({});
  const [dragState, setDragState] = React.useState<DragState>(null);
  const [hoverState, setHoverState] = React.useState<HoverState>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const graphContainerRef = React.useRef<HTMLDivElement | null>(null);
  const dragMovedRef = React.useRef(false);

  React.useEffect(() => {
    setNodePositions((current) => {
      const next: Record<string, { x: number; y: number }> = {};

      graph.nodes.forEach((node) => {
        const existing = current[node.id];
        next[node.id] = existing ? existing : { x: node.x, y: node.y };
      });

      return next;
    });
  }, [graph.nodes]);

  React.useEffect(() => {
    if (graph.nodes.length <= 1) {
      setSelectedNodeId(null);
      return;
    }

    if (!selectedNodeId || !graph.nodes.some((node) => node.id === selectedNodeId)) {
      const firstPersonNode = graph.nodes.find((node) => node.id !== 'you');
      setSelectedNodeId(firstPersonNode?.id ?? null);
    }
  }, [graph.nodes, selectedNodeId]);

  React.useEffect(() => {
    if (!dragState) return;

    const endDrag = () => setDragState(null);

    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    return () => {
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, [dragState]);

  const positionedNodes = React.useMemo(() => {
    return graph.nodes.map((node) => {
      const positioned = nodePositions[node.id];
      if (!positioned) return node;

      return {
        ...node,
        x: positioned.x,
        y: positioned.y,
      };
    });
  }, [graph.nodes, nodePositions]);

  const positionedNodeMap = React.useMemo(() => {
    const map = new Map<string, GraphNode>();
    positionedNodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [positionedNodes]);

  const companyOptions = React.useMemo(() => {
    const buckets = new Map<string, { label: string; count: number }>();

    graph.nodes.forEach((node) => {
      if (node.id === 'you' || !node.company) return;

      const key = normalizeKey(node.company);
      if (!key) return;

      const existing = buckets.get(key);
      if (existing) {
        existing.count += 1;
        return;
      }

      buckets.set(key, {
        label: node.company,
        count: 1,
      });
    });

    return Array.from(buckets.entries())
      .map(([key, value]) => ({
        key,
        label: value.label,
        count: value.count,
      }))
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }

        return a.label.localeCompare(b.label);
      });
  }, [graph.nodes]);

  const yearOptions = React.useMemo(() => {
    const yearSet = new Set<string>();
    let unknownCount = 0;

    graph.nodes.forEach((node) => {
      if (node.id === 'you') return;

      const year = connectionYearFromDate(node.connectedOn);
      if (year) {
        yearSet.add(year);
      } else {
        unknownCount += 1;
      }
    });

    const sortedYears = Array.from(yearSet).sort((a, b) => Number(b) - Number(a));
    return {
      years: sortedYears,
      unknownCount,
    };
  }, [graph.nodes]);

  React.useEffect(() => {
    if (companyFilter === 'all') {
      return;
    }

    if (!companyOptions.some((option) => option.key === companyFilter)) {
      setCompanyFilter('all');
    }
  }, [companyFilter, companyOptions]);

  React.useEffect(() => {
    if (yearFilter === 'all') {
      return;
    }

    if (yearFilter === 'unknown') {
      if (yearOptions.unknownCount === 0) {
        setYearFilter('all');
      }
      return;
    }

    if (!yearOptions.years.includes(yearFilter)) {
      setYearFilter('all');
    }
  }, [yearFilter, yearOptions]);

  const normalizedSearch = searchValue.trim().toLowerCase();

  const visibleNodes = React.useMemo(() => {
    return positionedNodes.filter((node) => {
      if (node.id === 'you') {
        return true;
      }

      if (activeFilter !== 'all' && node.classification !== activeFilter) {
        return false;
      }

      if (companyFilter !== 'all' && normalizeKey(node.company) !== companyFilter) {
        return false;
      }

      if (yearFilter !== 'all') {
        const nodeYear = connectionYearFromDate(node.connectedOn);

        if (yearFilter === 'unknown') {
          if (nodeYear) {
            return false;
          }
        } else if (nodeYear !== yearFilter) {
          return false;
        }
      }

      if (normalizedSearch) {
        const searchable = `${node.fullName} ${node.title ?? ''} ${node.company ?? ''} ${node.reason ?? ''}`.toLowerCase();
        if (!searchable.includes(normalizedSearch)) {
          return false;
        }
      }

      return true;
    });
  }, [activeFilter, companyFilter, normalizedSearch, positionedNodes, yearFilter]);

  const visibleNodeMap = React.useMemo(() => {
    const map = new Map<string, GraphNode>();
    visibleNodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [visibleNodes]);

  const visibleEdges = React.useMemo(() => {
    return graph.edges.filter((edge) => {
      if (!showCompanyEdges && edge.kind === 'company') {
        return false;
      }

      return visibleNodeMap.has(edge.sourceId) && visibleNodeMap.has(edge.targetId);
    });
  }, [graph.edges, showCompanyEdges, visibleNodeMap]);

  const totalConnectionCount = Math.max(graph.nodes.length - 1, 0);
  const visibleConnectionCount = Math.max(visibleNodes.length - 1, 0);
  const isGraphCapped = connections.length > MAX_GRAPH_CONNECTIONS;

  React.useEffect(() => {
    if (visibleNodes.length <= 1) {
      setSelectedNodeId(null);
      return;
    }

    if (!selectedNodeId || !visibleNodes.some((node) => node.id === selectedNodeId)) {
      const firstPersonNode = visibleNodes.find((node) => node.id !== 'you');
      setSelectedNodeId(firstPersonNode?.id ?? null);
    }
  }, [selectedNodeId, visibleNodes]);

  const selectedNode = selectedNodeId ? visibleNodeMap.get(selectedNodeId) ?? null : null;
  const selectedNodeProfileHref = selectedNode ? buildLinkedInProfileHref(selectedNode) : '';
  const hoveredNode = hoverState ? visibleNodeMap.get(hoverState.nodeId) ?? null : null;

  React.useEffect(() => {
    if (!hoverState) return;

    if (!visibleNodeMap.has(hoverState.nodeId)) {
      setHoverState(null);
    }
  }, [hoverState, visibleNodeMap]);

  const updateHoverState = React.useCallback((nodeId: string, clientX: number, clientY: number) => {
    const graphContainer = graphContainerRef.current;
    if (!graphContainer) return;

    const rect = graphContainer.getBoundingClientRect();

    setHoverState({
      nodeId,
      x: clientX - rect.left + 14,
      y: clientY - rect.top + 14,
    });
  }, []);

  const handleNodePointerDown = React.useCallback(
    (event: React.PointerEvent<SVGGElement>, node: GraphNode) => {
      if (node.id === 'you') {
        return;
      }

      const svgElement = svgRef.current;
      if (!svgElement) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const pointer = toSvgCoordinates(event.clientX, event.clientY, svgElement);
      const currentPosition = nodePositions[node.id] ?? { x: node.x, y: node.y };

      dragMovedRef.current = false;
      setSelectedNodeId(node.id);
      updateHoverState(node.id, event.clientX, event.clientY);

      setDragState({
        nodeId: node.id,
        pointerId: event.pointerId,
        offsetX: pointer.x - currentPosition.x,
        offsetY: pointer.y - currentPosition.y,
      });

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Ignore capture errors for unsupported browsers.
      }
    },
    [nodePositions, updateHoverState]
  );

  const handleSvgPointerMove = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      const svgElement = svgRef.current;
      const draggedNode = positionedNodeMap.get(dragState.nodeId);
      if (!svgElement || !draggedNode) {
        return;
      }

      const pointer = toSvgCoordinates(event.clientX, event.clientY, svgElement);
      const margin = draggedNode.radius + 8;

      const nextX = clampValue(pointer.x - dragState.offsetX, margin, GRAPH_WIDTH - margin);
      const nextY = clampValue(pointer.y - dragState.offsetY, margin, GRAPH_HEIGHT - margin);

      setNodePositions((current) => {
        const existing = current[dragState.nodeId];
        if (existing && existing.x === nextX && existing.y === nextY) {
          return current;
        }

        return {
          ...current,
          [dragState.nodeId]: {
            x: nextX,
            y: nextY,
          },
        };
      });

      dragMovedRef.current = true;
      updateHoverState(dragState.nodeId, event.clientX, event.clientY);
    },
    [dragState, positionedNodeMap, updateHoverState]
  );

  const handleSvgPointerUp = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      setDragState(null);
    },
    [dragState]
  );

  const handleSvgPointerLeave = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      setDragState(null);
    },
    [dragState]
  );

  const sameCompanyNodes = React.useMemo(() => {
    if (!selectedNode || !selectedNode.company) {
      return [] as GraphNode[];
    }

    const lowerCompany = selectedNode.company.toLowerCase().trim();
    return graph.nodes.filter(
      (node) =>
        node.id !== selectedNode.id &&
        node.id !== 'you' &&
        (node.company ?? '').toLowerCase().trim() === lowerCompany
    );
  }, [graph.nodes, selectedNode]);

  return (
    <section className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-[Epilogue] text-lg font-bold uppercase tracking-tight text-parchment">Connection Graph</h3>
          <p className="mt-1 text-sm text-warm-muted">
            Explore relationship clusters with classification-weighted links, hover nodes for quick info, and drag nodes to reshape clusters.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-100/85 px-3 py-1.5 text-[10px] font-[Epilogue] font-bold uppercase tracking-[0.2em] text-amber-800 dark:border-outline-variant/30 dark:bg-pit/70 dark:text-warm-faint">
          <Activity className="h-3.5 w-3.5 text-amber-700 dark:text-ember-soft" />
          Live graph
        </div>
      </div>

      {connections.length === 0 ? (
        <div className="mt-6 rounded-xl border border-outline-variant/20 bg-hearth-ash p-8 text-center">
          <Network className="mx-auto h-10 w-10 text-ember-soft" />
          <h4 className="mt-4 font-[Epilogue] text-base font-semibold uppercase tracking-wide text-parchment">
            No connection nodes yet
          </h4>
          <p className="mt-2 text-sm text-warm-muted">
            Upload and analyze LinkedIn data first, then this graph auto-populates with classified nodes.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-12">
          <section className="xl:col-span-8">
            <div className="flex flex-wrap items-center gap-2">
              {FILTER_COPY.map((filterItem) => {
                const isActive = activeFilter === filterItem.id;
                return (
                  <button
                    key={filterItem.id}
                    type="button"
                    onClick={() => setActiveFilter(filterItem.id)}
                    className={`rounded-full border px-3 py-1.5 text-[10px] font-[Epilogue] font-bold uppercase tracking-[0.18em] transition-colors ${
                      isActive
                        ? 'border-amber-300/60 bg-amber-100/85 text-amber-800 dark:border-ember/40 dark:bg-ember/20 dark:text-ember-soft'
                        : 'border-outline-variant/30 bg-hearth-ash text-slate-700 hover:bg-surface-container-high dark:text-warm-faint'
                    }`}
                  >
                    {filterItem.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-warm-faint" />
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search name, role, company"
                  className="h-9 w-full rounded-lg border border-outline-variant/35 bg-pit/75 pl-9 pr-3 text-xs text-parchment placeholder:text-warm-faint focus:border-ember-soft/70 focus:outline-none"
                />
              </label>

              <label className="relative block">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-warm-faint" />
                <select
                  value={companyFilter}
                  onChange={(event) => setCompanyFilter(event.target.value)}
                  className="h-9 w-full rounded-lg border border-outline-variant/35 bg-pit/75 pl-9 pr-3 text-xs text-parchment focus:border-ember-soft/70 focus:outline-none"
                >
                  <option value="all">All companies</option>
                  {companyOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label} ({option.count})
                    </option>
                  ))}
                </select>
              </label>

              <label className="relative block">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-warm-faint" />
                <select
                  value={yearFilter}
                  onChange={(event) => setYearFilter(event.target.value)}
                  className="h-9 w-full rounded-lg border border-outline-variant/35 bg-pit/75 pl-9 pr-3 text-xs text-parchment focus:border-ember-soft/70 focus:outline-none"
                >
                  <option value="all">All connection years</option>
                  {yearOptions.years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                  {yearOptions.unknownCount > 0 ? (
                    <option value="unknown">Unknown date ({yearOptions.unknownCount})</option>
                  ) : null}
                </select>
              </label>

              <div className="flex items-center gap-2">
                <label className="inline-flex flex-1 items-center gap-2 rounded-lg border border-outline-variant/35 bg-pit/75 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-warm-foreground">
                  <input
                    type="checkbox"
                    checked={showCompanyEdges}
                    onChange={(event) => setShowCompanyEdges(event.target.checked)}
                    className="h-3.5 w-3.5"
                  />
                  Company Links
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter('all');
                    setSearchValue('');
                    setCompanyFilter('all');
                    setYearFilter('all');
                    setShowCompanyEdges(true);
                  }}
                  className="rounded-lg border border-outline-variant/35 bg-hearth-ash px-3 py-2 text-[10px] font-[Epilogue] font-bold uppercase tracking-[0.16em] text-warm-faint transition-colors hover:bg-surface-container-high hover:text-warm-foreground"
                >
                  Reset
                </button>
              </div>
            </div>

            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-warm-faint">
              Showing {visibleConnectionCount} of {totalConnectionCount} connections. Hover for details, drag nodes to rearrange, click to pin profile.
            </p>
            {isGraphCapped ? (
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-amber-700 dark:text-amber-200">
                Graph display capped at {MAX_GRAPH_CONNECTIONS} connections.
              </p>
            ) : null}

            <div
              ref={graphContainerRef}
              className={`relative mt-4 overflow-hidden rounded-2xl border border-outline-variant/30 bg-pit/80 ${
                dragState ? 'cursor-grabbing' : ''
              }`}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,145,92,0.2),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(99,102,241,0.15),transparent_42%),radial-gradient(circle_at_50%_85%,rgba(34,197,94,0.1),transparent_48%)]" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-size-[34px_34px] opacity-35" />

              <svg
                ref={svgRef}
                viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
                className="relative z-10 h-140 w-full"
                style={{ touchAction: 'none' }}
                onPointerMove={handleSvgPointerMove}
                onPointerUp={handleSvgPointerUp}
                onPointerCancel={handleSvgPointerUp}
                onPointerLeave={handleSvgPointerLeave}
              >
                <defs>
                  <linearGradient id="edgeUseful" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#F97316" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#FB923C" stopOpacity="0.8" />
                  </linearGradient>
                  <linearGradient id="edgeMaybe" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#64748B" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.75" />
                  </linearGradient>
                  <linearGradient id="edgeCompany" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.8" />
                  </linearGradient>
                </defs>

                {visibleEdges.map((edge) => {
                  const source = visibleNodeMap.get(edge.sourceId);
                  const target = visibleNodeMap.get(edge.targetId);
                  if (!source || !target) return null;

                  const stroke =
                    edge.kind === 'useful'
                      ? 'url(#edgeUseful)'
                      : edge.kind === 'maybe_useful'
                        ? 'url(#edgeMaybe)'
                        : 'url(#edgeCompany)';

                  return (
                    <motion.path
                      key={edge.id}
                      d={edgePath(source, target, edge.kind === 'company' ? 0.09 : 0.16)}
                      stroke={stroke}
                      strokeWidth={edge.kind === 'company' ? 1.15 : 1.8}
                      strokeDasharray={edge.kind === 'company' ? '3 8' : '6 9'}
                      strokeLinecap="round"
                      fill="none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, strokeDashoffset: [0, -24] }}
                      transition={{
                        opacity: { duration: 0.5 },
                        strokeDashoffset: {
                          duration: edge.kind === 'company' ? 7.2 : 5.8,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: 'linear',
                        },
                      }}
                    />
                  );
                })}

                {visibleNodes.map((node) => {
                  const isCenter = node.id === 'you';
                  const isSelected = node.id === selectedNodeId;

                  const fill = isCenter
                    ? '#F97316'
                    : node.classification === 'useful'
                      ? '#FB923C'
                      : '#64748B';

                  const stroke = isCenter
                    ? '#FED7AA'
                    : node.classification === 'useful'
                      ? '#FDBA74'
                      : '#CBD5E1';

                  return (
                    <motion.g
                      key={node.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={isCenter ? undefined : { scale: 1.06 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                      onPointerDown={(event) => handleNodePointerDown(event, node)}
                      onPointerEnter={(event) => {
                        if (isCenter) return;
                        updateHoverState(node.id, event.clientX, event.clientY);
                      }}
                      onPointerMove={(event) => {
                        if (isCenter) return;
                        updateHoverState(node.id, event.clientX, event.clientY);
                      }}
                      onPointerLeave={() => {
                        setHoverState((current) => (current?.nodeId === node.id ? null : current));
                      }}
                      onClick={() => {
                        if (isCenter) {
                          return;
                        }

                        if (dragMovedRef.current) {
                          dragMovedRef.current = false;
                          return;
                        }

                        setSelectedNodeId(node.id);
                      }}
                      className={isCenter ? '' : 'cursor-grab'}
                    >
                      {!isCenter && (
                        <motion.circle
                          cx={node.x}
                          cy={node.y}
                          r={node.radius + 7}
                          fill={fill}
                          opacity={0.08}
                          animate={{ opacity: [0.04, 0.16, 0.04] }}
                          transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                        />
                      )}

                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.radius}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={isSelected ? 2.8 : 1.6}
                      />

                      {isCenter ? (
                        <text
                          x={node.x}
                          y={node.y + 4}
                          textAnchor="middle"
                          className="fill-black text-[10px] font-black uppercase tracking-[0.18em]"
                        >
                          YOU
                        </text>
                      ) : (
                        <text
                          x={node.x}
                          y={node.y - node.radius - 10}
                          textAnchor="middle"
                          className="fill-warm-foreground text-[11px] font-semibold"
                        >
                          {node.label}
                        </text>
                      )}
                    </motion.g>
                  );
                })}
              </svg>

              {hoveredNode && hoverState ? (
                <div
                  className="pointer-events-none absolute z-20 max-w-64 rounded-lg border border-outline-variant/35 bg-hearth-ash/95 px-3 py-2 text-xs text-warm-foreground shadow-xl backdrop-blur-sm"
                  style={{
                    left: clampValue(
                      hoverState.x,
                      8,
                      Math.max(8, (graphContainerRef.current?.clientWidth ?? GRAPH_WIDTH) - 220)
                    ),
                    top: clampValue(
                      hoverState.y,
                      8,
                      Math.max(8, (graphContainerRef.current?.clientHeight ?? GRAPH_HEIGHT) - 110)
                    ),
                  }}
                >
                  <p className="font-[Epilogue] text-xs font-semibold uppercase tracking-[0.14em] text-parchment">
                    {hoveredNode.fullName}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-warm-faint">
                    {hoveredNode.classification === 'useful' ? 'Useful' : 'Maybe useful'}
                  </p>
                  <p className="mt-1 text-[11px] text-warm-foreground">
                    {hoveredNode.title || 'Unknown role'}
                    {hoveredNode.company ? ` @ ${hoveredNode.company}` : ''}
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <aside className="xl:col-span-4">
            <div className="rounded-2xl border border-outline-variant/30 bg-hearth-ash p-5">
              <h4 className="flex items-center gap-2 font-[Epilogue] text-sm font-bold uppercase tracking-[0.18em] text-parchment">
                <Link2 className="h-4 w-4 text-ember-soft" />
                Connection profile
              </h4>

              {selectedNode ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-[Epilogue] text-xl font-semibold text-parchment">{selectedNode.fullName}</p>
                      <a
                        href={selectedNodeProfileHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-amber-300/60 bg-amber-100/85 px-2.5 py-1 text-[10px] font-[Epilogue] font-bold uppercase tracking-[0.16em] text-amber-800 transition-colors hover:bg-amber-200/80 dark:border-outline-variant/30 dark:bg-pit/70 dark:text-ember-soft dark:hover:bg-surface-container-high"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {selectedNode.profileUrl ? 'Open profile' : 'Search'}
                      </a>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-600 dark:text-warm-faint">
                      {selectedNode.classification === 'useful' ? 'Useful connection' : 'Maybe useful connection'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-sm text-warm-foreground">
                    <div className="rounded-lg border border-outline-variant/25 bg-pit/70 px-3 py-2">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-warm-faint">Role</span>
                      <p className="mt-1">{selectedNode.title || 'Unknown'}</p>
                    </div>
                    <div className="rounded-lg border border-outline-variant/25 bg-pit/70 px-3 py-2">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-warm-faint">Company</span>
                      <p className="mt-1">{selectedNode.company || 'Unknown'}</p>
                    </div>
                    <div className="rounded-lg border border-outline-variant/25 bg-pit/70 px-3 py-2">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-warm-faint">Connected on</span>
                      <p className="mt-1">{selectedNode.connectedOn || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-outline-variant/25 bg-pit/70 px-3 py-2">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-warm-faint">Classification rationale</span>
                    <p className="mt-1 text-sm text-warm-foreground">
                      {selectedNode.reason || 'No reason available for this connection.'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600 dark:text-warm-faint">Nearby same-company nodes</p>
                    {sameCompanyNodes.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {sameCompanyNodes.slice(0, 6).map((node) => (
                          <button
                            key={node.id}
                            type="button"
                            onClick={() => setSelectedNodeId(node.id)}
                            className="rounded-full border border-outline-variant/30 bg-surface-container-high px-2.5 py-1 text-[10px] font-[Epilogue] font-bold uppercase tracking-[0.16em] text-warm-foreground hover:bg-surface-raised"
                          >
                            {node.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-warm-muted">No same-company neighbors found.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-outline-variant/35 bg-pit/40 p-4 text-sm text-warm-muted">
                  Click a node to open its profile card.
                </div>
              )}

              <div className="mt-5 grid grid-cols-1 gap-2 text-xs">
                <div className="rounded-lg border border-amber-300/60 bg-amber-100/85 px-3 py-2 text-amber-800 dark:border-ember/25 dark:bg-ember/10 dark:text-ember-soft">
                  Useful nodes: <span className="font-bold">{graph.usefulCount}</span>
                </div>
                <div className="rounded-lg border border-slate-300/70 bg-slate-100/90 px-3 py-2 text-slate-800 dark:border-slate-300/25 dark:bg-slate-500/10 dark:text-slate-200">
                  Maybe useful nodes: <span className="font-bold">{graph.maybeUsefulCount}</span>
                </div>
                <div className="rounded-lg border border-cyan-300/60 bg-cyan-100/85 px-3 py-2 text-cyan-800 dark:border-cyan-300/25 dark:bg-cyan-500/10 dark:text-cyan-100">
                  Company links: <span className="font-bold">{graph.edges.filter((edge) => edge.kind === 'company').length}</span>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-outline-variant/25 bg-pit/70 px-3 py-2 text-xs text-warm-muted">
                <Sparkles className="mb-1 h-3.5 w-3.5 text-ember-soft" />
                Tip: filter by classification to isolate high-priority outreach clusters.
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
