"use client";

import { Check, Link as LinkIcon, QrCode, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export const ShowQr = ({ value, buttonLabel = "Show QR code", onCopy }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [siteUrl, setSiteUrl] = useState(value || "");

  useEffect(() => {
    if (!value) setSiteUrl(window.location.origin);
  }, [value]);

  useEffect(() => {
    if (!isCopied) return undefined;
    const timeoutId = setTimeout(() => setIsCopied(false), 2000);
    return () => clearTimeout(timeoutId);
  }, [isCopied]);

  return (
    <div className="flex w-full justify-center">
      <AnimatePresence mode="wait" initial={false}>
        {!isExpanded ? (
          <motion.button
            key="collapsed"
            type="button"
            onClick={() => setIsExpanded(true)}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex min-h-11 items-center gap-2 rounded-[3px] bg-ink px-4 font-display text-[0.95rem] font-bold text-paper"
          >
            <QrCode className="h-4 w-4" aria-hidden="true" />
            {buttonLabel}
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-3"
          >
            <div className="rounded-[3px] bg-paper p-3 ring-2 ring-ink">
              <QRCodeSVG value={siteUrl} size={168} level="M" fgColor="#17181c" bgColor="transparent" />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(siteUrl);
                  setIsCopied(true);
                  onCopy?.();
                }}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-[3px] bg-paper-yellow px-3 text-sm font-bold text-ink"
              >
                {isCopied ? <Check className="h-4 w-4" aria-hidden="true" /> : <LinkIcon className="h-4 w-4" aria-hidden="true" />}
                {isCopied ? "Copied" : "Copy link"}
              </button>
              <button
                type="button"
                aria-label="Hide QR code"
                onClick={() => {
                  setIsExpanded(false);
                  setIsCopied(false);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[3px] text-ink ring-2 ring-inset ring-ink/70"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
