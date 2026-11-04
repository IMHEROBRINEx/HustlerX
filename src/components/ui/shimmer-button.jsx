"use client";

import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

export function ShimmerButton({ children, className, ...props }) {
  const [bursts, setBursts] = useState([]);
  const [pulsing, setPulsing] = useState(false);
  const btnRef = useRef(null);
  const timeoutsRef = useRef([]);

  const { onClick, ...rest } = props;

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      timeoutsRef.current = [];
    };
  }, []);

  const scheduleTimeout = (callback, delay) => {
    const timeoutId = window.setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter((id) => id !== timeoutId);
      callback();
    }, delay);

    timeoutsRef.current.push(timeoutId);
  };

  const createBurst = (x, y) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setBursts((s) => [...s, { id, x, y }]);
    scheduleTimeout(() => setBursts((s) => s.filter((b) => b.id !== id)), 700);
  };

  const handleClick = (e) => {
    const el = btnRef.current;
    if (el && e && typeof e.clientX === 'number') {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      createBurst(x, y);
      setPulsing(true);
      scheduleTimeout(() => setPulsing(false), 420);
    }

    if (typeof onClick === 'function') onClick(e);
  };

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      className={cn(
        "relative overflow-hidden px-6 py-3 rounded-lg font-medium",
        "bg-primary text-primary-foreground",
        "hover:shadow-lg transition-shadow duration-300",
        "group",
        pulsing && "shimmer-button-pulse",
        className
      )}
      {...rest}
    >
      <span className="relative z-10">{children}</span>

      <div
        className={cn(
          "absolute inset-0 -translate-x-full",
          "bg-gradient-to-r from-transparent via-white/20 to-transparent",
          "group-hover:translate-x-full transition-transform duration-700"
        )}
      />

      {bursts.map((b) => (
        <span
          key={b.id}
          className="absolute pointer-events-none burst"
          style={{
            left: b.x,
            top: b.y,
            width: 14,
            height: 14,
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.18) 35%, transparent 60%)',
            borderRadius: 9999,
            animation: 'shimmer-burst 520ms ease-out forwards'
          }}
        />
      ))}
    </button>
  );
}
