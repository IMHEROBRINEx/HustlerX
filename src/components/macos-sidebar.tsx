"use client";

import { SidebarLeftIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion, AnimatePresence } from "motion/react";
import { useState, type ReactNode } from "react";

export interface MacOSSidebarProps {
  items: string[];
  defaultOpen?: boolean;
  initialSelectedIndex?: number;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  headerAction?: ReactNode;
  brand?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function MacOSSidebar({
  items,
  defaultOpen = true,
  initialSelectedIndex = 0,
  selectedIndex,
  onSelectIndex,
  headerAction,
  brand,
  children,
  className = "",
}: MacOSSidebarProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [internalSelectedIndex, setInternalSelectedIndex] =
    useState<number>(initialSelectedIndex);
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  const currentSelectedIndex =
    typeof selectedIndex === "number" ? selectedIndex : internalSelectedIndex;

  const handleSelect = (index: number) => {
    if (typeof selectedIndex !== "number") {
      setInternalSelectedIndex(index);
    }

    onSelectIndex?.(index);
  };

  return (
    <div
      className={`relative flex w-full overflow-hidden rounded-3xl bg-canvas p-1.5 text-parchment ${className}`}
    >
      <motion.div
        animate={{
          width: isOpen ? 240 : 52,
        }}
        transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
        className={`p-2 rounded-2xl shrink-0 flex flex-col items-start transition-colors duration-900 ease-out ${
          isOpen
            ? "bg-hearth-ash border border-outline-variant/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            : "bg-transparent"
        }`}
      >
        <div
          className={`flex items-center w-full ${
            isOpen ? "justify-between items-start gap-2" : "justify-center"
          } p-2 shrink-0 text-warm-muted`}
        >
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="min-w-0 flex-1"
              >
                {headerAction ? (
                  headerAction
                ) : (
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/35 bg-pit/50 text-xs font-semibold text-ember">
                    P
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div
            layout
            className="shrink-0 flex items-center justify-center"
          >
            <HugeiconsIcon
              icon={SidebarLeftIcon}
              className="size-5 cursor-pointer text-warm-foreground transition-colors hover:text-ember"
              onClick={() => setIsOpen(!isOpen)}
            />
          </motion.div>
        </div>

        {isOpen && brand ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="mt-1 px-2"
          >
            {brand}
          </motion.div>
        ) : null}

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative z-10 mt-2 flex w-full flex-col gap-1.5 whitespace-nowrap"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {items.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="relative cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onClick={() => handleSelect(index)}
                >
                  <AnimatePresence>
                    {currentSelectedIndex === index && (
                      <motion.div
                        className="absolute inset-0 z-0 rounded-md border border-ember/30 bg-surface-container-high"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                    )}
                  </AnimatePresence>
                  <p
                    className={`relative z-10 px-5 py-3 tracking-tight ${
                      currentSelectedIndex === index
                        ? "font-semibold uppercase tracking-[0.12em] text-ember"
                        : "uppercase tracking-[0.12em] text-warm-faint"
                    }`}
                  >
                    {item}
                  </p>
                  <AnimatePresence>
                    {hoveredIndex === index && currentSelectedIndex !== index && (
                      <motion.span
                        layoutId="sidebar-hover-bg"
                        className="absolute inset-0 z-0 rounded-md bg-surface-raised/70"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 350,
                          damping: 30,
                        }}
                      />
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div
        className={`z-0 flex-1 h-full min-h-full overflow-y-auto transition-all duration-300 ${
          isOpen ? "pl-2 lg:pl-4" : "pl-0.5 lg:pl-1"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
