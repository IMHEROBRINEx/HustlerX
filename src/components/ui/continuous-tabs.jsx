"use client";
import { useState, useEffect } from "react";
import { motion, LayoutGroup } from "framer-motion";

/* ---------- Defaults ---------- */
const DEFAULT_TABS = [
    { id: "home", label: "Home" },
    { id: "interactions", label: "Interactions" },
    { id: "resources", label: "Resources" },
    { id: "docs", label: "Docs" },
];

export const ContinuousTabs = ({
    tabs = DEFAULT_TABS,
    defaultActiveId = "home",
    onChange,
}) => {
    const [active, setActive] = useState(defaultActiveId);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        setActive(defaultActiveId);
    }, [defaultActiveId]);

    const handleChange = (id) => {
        setActive(id);
        onChange?.(id);
    };

    if (!isMounted) return null;

    return (
        <LayoutGroup>
            <nav
                role="tablist"
                aria-label="Primary navigation"
                className="relative flex items-center gap-0.5 sm:gap-1 p-1 sm:p-1.5 rounded-full bg-transparent border-transparent shadow-none transition-all duration-300">
                {tabs.map((tab) => {
                    const isActive = active === tab.id;

                    return (
                        <button
                            type="button"
                            key={tab.id}
                            onClick={() => handleChange(tab.id)}
                            role="tab"
                            id={`tab-${tab.id}`}
                            aria-selected={isActive}
                            tabIndex={isActive ? 0 : -1}
                            aria-controls={`panel-${tab.id}`}
                            className="relative px-4 py-2 sm:px-6 sm:py-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80 dark:focus-visible:ring-ember/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/30 dark:focus-visible:ring-offset-hearth-ash">
                            {/* Active pill */}
                            {isActive && (
                                <motion.div
                                    layoutId="active-pill"
                                    transition={{
                                        type: "spring",
                                        stiffness: 380,
                                        damping: 30,
                                        mass: 0.9,
                                    }}
                                    className="absolute inset-0 rounded-full border border-white/20 dark:border-ember/25 bg-white/12 dark:bg-ember/12 shadow-[0_6px_20px_rgba(0,0,0,0.25)]" />
                            )}
                            {/* Text */}
                            <motion.span
                                layout="position"
                                className={`relative z-10 text-sm sm:text-base font-semibold transition-colors duration-200 ${isActive ? "text-amber-50 dark:text-ember" : "text-amber-100/70 dark:text-parchment/70 hover:text-amber-50 dark:hover:text-parchment"}`}>
                                {tab.label}
                            </motion.span>
                        </button>
                    );
                })}
            </nav>

            <div className="sr-only">
                {tabs.map((tab) => {
                    const isActive = active === tab.id;

                    return (
                        <div
                            key={`${tab.id}-panel`}
                            id={`panel-${tab.id}`}
                            role="tabpanel"
                            aria-labelledby={`tab-${tab.id}`}
                            hidden={!isActive}>
                            {tab.content ?? tab.label}
                        </div>
                    );
                })}
            </div>
        </LayoutGroup>
    );
};
