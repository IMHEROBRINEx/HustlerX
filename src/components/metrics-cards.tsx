'use client';

import * as React from 'react';
import { Users, MessageSquare, ThumbsUp, Handshake } from 'lucide-react';
import { LinkedInMetrics } from '@/types';
import { formatNumber } from '@/lib/utils';

interface MetricsCardsProps {
  metrics: LinkedInMetrics;
}

interface MetricValueProps {
  value: number;
  delayMs?: number;
  className?: string;
}

const metricConfig = [
  { key: 'connections', label: 'Connections', icon: Users, iconTone: 'text-ember-strong', valueTone: 'text-ember-strong coal-glow', emphasize: true },
  { key: 'messagesSent', label: 'Messages Sent', icon: MessageSquare, iconTone: 'text-ember-soft', valueTone: 'text-parchment', emphasize: false },
  { key: 'messagesReceived', label: 'Messages Received', icon: MessageSquare, iconTone: 'text-ember-soft', valueTone: 'text-parchment', emphasize: false },
  { key: 'likesGiven', label: 'Likes Given', icon: ThumbsUp, iconTone: 'text-ember', valueTone: 'text-parchment', emphasize: false },
  { key: 'commentsMade', label: 'Comments', icon: MessageSquare, iconTone: 'text-ember', valueTone: 'text-parchment', emphasize: false },
  { key: 'connectionRequestsReceived', label: 'Requests Received', icon: Handshake, iconTone: 'text-ember-soft', valueTone: 'text-ember coal-glow', emphasize: false },
] as const;

function MetricValue({ value, delayMs = 0, className }: MetricValueProps) {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    const target = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

    if (typeof window === 'undefined') {
      setDisplayValue(target);
      return;
    }

    const durationMs = 1400;
    const totalFrames = 54;
    const startValue = 0;
    let rafId = 0;
    let timeoutId = 0;
    let frame = 0;

    const startAnimation = () => {
      const frameDuration = durationMs / totalFrames;
      let lastFrameTs = performance.now();

      const step = (now: number) => {
        if (now - lastFrameTs >= frameDuration) {
          frame += 1;
          lastFrameTs = now;

          const progress = Math.min(frame / totalFrames, 1);
          const eased = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
          const nextValue = Math.round(startValue + (target - startValue) * eased);

          setDisplayValue(nextValue);
        }

        if (frame < totalFrames) {
          rafId = window.requestAnimationFrame(step);
        } else {
          setDisplayValue(target);
        }
      };

      rafId = window.requestAnimationFrame(step);
    };

    setDisplayValue(startValue);
    timeoutId = window.setTimeout(startAnimation, delayMs);

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [delayMs, value]);

  return <p className={className}>{formatNumber(displayValue)}</p>;
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {metricConfig.map((config, index) => {
        const rawValue = (metrics as unknown as Record<string, unknown>)[config.key];
        const value = typeof rawValue === 'number' ? rawValue : Number(rawValue) || 0;
        const Icon = config.icon;

        return (
          <div
            key={config.key}
            className={`flex aspect-square flex-col justify-between rounded-xl p-6 transition-colors ${
              config.emphasize
                ? 'border-l-4 border-ember-strong bg-surface-container-high'
                : 'border border-outline-variant/20 bg-surface-container-low hover:bg-surface-container-high'
            }`}
          >
            <div className="flex items-start justify-between">
              <Icon className={`h-7 w-7 ${config.iconTone}`} />
              {config.emphasize ? (
                <span className="text-[10px] font-[Epilogue] font-bold uppercase tracking-[0.14em] text-warm-faint">
                  Core Signal
                </span>
              ) : null}
            </div>

            <div>
              <MetricValue
                value={value}
                delayMs={index * 90}
                className={`font-[Epilogue] text-4xl font-black tracking-tight md:text-5xl ${config.valueTone}`}
              />
              <p className="mt-2 font-[Epilogue] text-[10px] font-bold uppercase tracking-[0.2em] text-warm-muted">
                {config.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
