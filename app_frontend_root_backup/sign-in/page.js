"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { SwapForm } from "@/components/ui/swap-form";

export default function SignIn() {
  const [isSignIn, setIsSignIn] = useState(true);

  return (
    <>
      <Navbar />
      <section className="relative flex items-center justify-center min-h-[100vh] pt-28 px-4">
        <div className="absolute inset-0 z-0">
          <img
            alt="Background"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida/ADBb0ugCoG-T5D0XPSU4ZQ2xqAWIX0RaMQXLNXMCQFo9FGNxQhUufbN7cPYsE3SQaD4wBWHHmm2yAv-x_c6eXlylOvvXGLzH_8IMpeYM9arguTtct2Z04XijZKhYfyBDmWE3fhfGlz2oq8nMx_fX-gHAXMu-zdR8Y1NGU_1I_Ul2vdYcB_f9zkAjVPubNpjRYuQI8cZz7USumpZeGZKhMJ5HKZ9ibbhydX94BRjzaKKlfwcvnPgO_1yEXUm2kUERyd0tUvsRQfTDqrTjT4Y"
          />
          <div className="absolute inset-0 bg-black/70"></div>
        </div>

        <div className="relative z-10 w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-ember text-4xl font-bold tracking-tighter epilogue-bold">
              Truss
            </h1>
            <p className="text-parchment/60 text-sm mt-2">
              Transform your connections into opportunities
            </p>
          </div>
          <SwapForm
            isSignIn={isSignIn}
            onModeChange={setIsSignIn}
            texts={{
              signInTitle: "Welcome Back",
              signUpTitle: "Join Truss",
              signInSubtitle: "Sign in to continue",
              signUpSubtitle: "Create your account",
              signInButton: "Sign In",
              signUpButton: "Create Account",
              footerSignIn: "Don't have an account?",
              footerSignUp: "Already have an account?",
              footerSignInCta: "Sign Up",
              footerSignUpCta: "Sign In",
            }}
          />
        </div>
      </section>
    </>
  );
}
