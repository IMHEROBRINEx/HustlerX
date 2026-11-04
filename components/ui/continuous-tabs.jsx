"use client";;
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

    const handleChange = (id) => {
        setActive(id);
        onChange?.(id);
    };

    if (!isMounted) return null;

    return (
        <LayoutGroup>
            <nav
                className="relative flex items-center gap-0.5 sm:gap-1 p-1 sm:p-1.5 rounded-full bg-transparent border-transparent shadow-none transition-all duration-300">
                {tabs.map((tab) => {
                    const isActive = active === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleChange(tab.id)}
                            className="relative px-4 py-2 sm:px-6 sm:py-3 rounded-full outline-none">
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
                                    className="absolute inset-0 rounded-full bg-parchment/95 dark:bg-ember/10 shadow-[0_6px_20px_rgba(0,0,0,0.25)]" />
                            )}
                            {/* Text */}
                            <motion.span
                                layout="position"
                                className={`relative z-10 text-sm sm:text-base font-semibold transition-colors duration-200 ${isActive ? "text-ember" : "text-parchment/70 hover:text-parchment"}`}>
                                {tab.label}
                            </motion.span>
                        </button>
                    );
                })}
            </nav>
        </LayoutGroup>
    );
};