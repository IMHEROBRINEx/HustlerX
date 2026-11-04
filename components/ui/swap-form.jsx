"use client";;
import { AnimatePresence, motion } from "motion/react";
import { FaGoogle, FaApple } from "react-icons/fa";

const DEFAULT_TEXTS = {
    signInTitle: "Sign In",
    signUpTitle: "Create Account",
    signInSubtitle: "Hey friend, welcome back!",
    signUpSubtitle: "Just one more step to get started!",
    signInButton: "Get Sign In Code",
    signUpButton: "Create Account",
    footerSignIn: "Don't have account?",
    footerSignUp: "Already have account?",
    footerSignInCta: "Create Account",
    footerSignUpCta: "Sign In",
};

export const SwapForm = ({
    isSignIn,
    onModeChange,
    texts = {},
}) => {
    const mergedTexts = { ...DEFAULT_TEXTS, ...texts };

    const variants = {
        initial: {
            opacity: 0,
            y: 12,
            scale: 0.98,
            filter: "blur(4px)",
        },
        animate: {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
        },
        exit: {
            opacity: 0,
            y: -12,
            scale: 0.98,
            filter: "blur(4px)",
        },
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={isSignIn ? "signin" : "signup"}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{
                    type: "spring",
                    stiffness: 220,
                    damping: 26,
                    mass: 0.9,
                }}
                className="w-full max-w-sm bg-[#1f1b19]/90 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden border border-ember/10">
                <div
                    className="p-8 pb-10 border-b border-ember/10 bg-[#1f1b19]/50 rounded-t-2xl">
                    <h2
                        className="text-3xl font-bold text-[#eae1dd] mb-2 text-center">
                        {isSignIn
                            ? mergedTexts.signInTitle
                            : mergedTexts.signUpTitle}
                    </h2>

                    <p
                        className="text-[#eae1dd]/60 text-sm mb-6 text-center">
                        {isSignIn
                            ? mergedTexts.signInSubtitle
                            : mergedTexts.signUpSubtitle}
                    </p>

                    <div className="space-y-3">
                        <button
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-ember/20 rounded-xl font-medium text-[#eae1dd] bg-ember/10 hover:bg-ember/20 transition-colors text-sm">
                            <FaGoogle className="text-lg" />
                            Continue with Google
                        </button>

                        <button
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-ember/20 rounded-xl font-medium text-[#eae1dd] bg-ember/10 hover:bg-ember/20 transition-colors text-sm">
                            <FaApple className="text-xl" />
                            Continue with Apple
                        </button>
                    </div>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div
                                className="w-full h-px bg-gradient-to-r from-transparent via-ember/20 to-transparent" />
                        </div>
                        <div className="relative flex justify-center">
                            <span
                                className="bg-[#1f1b19] text-ember/40 text-xs px-2 uppercase tracking-wider">
                                OR
                            </span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label
                                className="block text-sm font-medium text-[#eae1dd] mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                placeholder="name@example.com"
                                className="w-full px-4 py-3 rounded-xl border border-ember/20 bg-[#131313]/50 focus:ring-1 focus:ring-ember outline-none text-[#eae1dd] placeholder:text-[#eae1dd]/40" />
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.015 }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className="w-full py-4 bg-ember text-[#131313] rounded-xl font-semibold shadow-lg text-base font-bold">
                            {isSignIn
                                ? mergedTexts.signInButton
                                : mergedTexts.signUpButton}
                        </motion.button>
                    </div>
                </div>

                <div className="bg-[#1f1b19]/30 py-4 text-center rounded-b-2xl">
                    <p className="text-[#eae1dd]/60 text-sm">
                        {isSignIn
                            ? mergedTexts.footerSignIn
                            : mergedTexts.footerSignUp}
                        <button
                            onClick={() => onModeChange(!isSignIn)}
                            className="ml-1 font-bold text-ember hover:text-ember/80">
                            {isSignIn
                                ? mergedTexts.footerSignInCta
                                : mergedTexts.footerSignUpCta}
                        </button>
                    </p>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
