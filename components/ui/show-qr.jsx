"use client";;
import { X, Link } from "lucide-react";
import { IoQrCodeOutline } from "react-icons/io5";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import useMeasure from "react-use-measure";

export const ShowQr = ({
  value,
  buttonLabel = "Show QR Code",
  onCopy
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const [ref, bounds] = useMeasure();

  useEffect(() => {
    if (isCopied) {
      const t = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(t);
    }
  }, [isCopied]);

  const springConfig = {
    type: "spring",
    bounce: 0.25,
    visualDuration: 0.35,
  };

  const collapsedTransition = {
    type: "spring",
    bounce: 0.15,
    visualDuration: 0.35,
  };

  return (
    <div
      className="flex w-full items-center justify-center overflow-hidden bg-transparent transition-colors">
      <MotionConfig transition={isExpanded ? springConfig : collapsedTransition}>
        <motion.div
          initial={{
            width: 200,
          }}
          animate={{
            width: isExpanded ? 250 : 200,
            height: isExpanded ? bounds.height : 48,
          }}
          className="overflow-hidden rounded-[32px] bg-hearth-ash/80 backdrop-blur-xl border border-ember/10">
          <div ref={ref} className="">
            <AnimatePresence mode="popLayout" initial={false}>
              {!isExpanded ? (
                <motion.div
                  key="collapsed"
                  className="flex cursor-pointer items-center justify-center gap-2 px-4 py-3 font-bold text-ember"
                  onClick={() => setIsExpanded(true)}
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(4px)" }}>
                  <IoQrCodeOutline className="size-6 text-ember" />
                  <span>{buttonLabel}</span>
                </motion.div>
              ) : (
                <motion.div
                  key="expanded"
                  className="flex flex-col items-center gap-2 p-4 text-parchment"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{
                    opacity: 0,
                    transition: {
                      duration: 0.2,
                      ease: "easeOut",
                    },
                  }}>
                  <motion.div
                    className="flex h-[220px] w-[220px] items-center justify-center rounded-3xl border border-ember/20 bg-obsidian p-4"
                    initial={{ opacity: 0, y: 60, scale: 1.2 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}>
                    <QRCodeSVG
                      value={value}
                      size={200}
                      level="H"
                      fgColor="#ffb692"
                      bgColor="transparent"
                      className="h-full w-full text-ember" />
                  </motion.div>

                  <div className="flex w-full items-center gap-2">
                    <motion.div
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-full border border-ember/20 bg-hearth-ash p-2 text-sm font-bold text-ember"
                      onClick={() => {
                        navigator.clipboard.writeText(value);
                        setIsCopied(true);
                        onCopy?.();
                      }}
                      layout>
                      <motion.div layout>
                        <Link className="text-ember w-4 h-4" />
                      </motion.div>
                      <AnimatedText from="Copy" to="Copied" isCopied={isCopied} />
                      <motion.span layout className="text-parchment">Link</motion.span>
                    </motion.div>

                    <div
                      className="flex cursor-pointer items-center justify-center rounded-full border border-ember/20 bg-hearth-ash p-2"
                      onClick={() => {
                        setIsExpanded(false);
                        setIsCopied(false);
                      }}>
                      <X className="text-parchment w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </MotionConfig>
    </div>
  );
};

const AnimatedText = ({
  from,
  to,
  isCopied
}) => {
  const activeText = isCopied ? to : from;

  return (
    <div className="flex text-base tracking-tight will-change-transform">
      <AnimatePresence mode="popLayout" initial={false}>
        {activeText.split("").map((char, index) => {
          const displayChar = char === " " ? "\u00A0" : char;

          return (
            <motion.span
              key={char + index}
              layout
              initial={{ opacity: 0, y: 5, scale: 0.7 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                  delay: 0.03 * index,
                },
              }}
              exit={{ opacity: 0, y: -5, scale: 0.7 }}>
              {displayChar}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
};