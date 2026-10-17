"use client";

import React, { useState } from "react";
import {
  signInWithGoogleFirebase,
  loginWithEmailPassword,
  registerWithEmailPassword,
  sendFirebaseMagicLink,
  ensureUserProfile,
} from "@/lib/firebase";
import { APP_VERSION } from "@/store/useCartelStore";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import LegalSecurityModal from "@/components/LegalSecurityModal";
import {
  Mail,
  Lock,
  User as UserIcon,
  Award,
  LogIn,
  UserPlus,
  ShieldCheck,
  Scale,
} from "lucide-react";

export default function LandingAuthScreen() {
  const [mode, setMode] = useState<"signin" | "create" | "magic">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gameName, setGameName] = useState("");
  const [levelInput, setLevelInput] = useState("1");
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [legalOpen, setLegalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleGoogleAuth = async () => {
    if (!acceptedTerms) {
      setNotice({
        type: "error",
        text: "Please accept the Virtual RPG Terms & Privacy Notice to continue.",
      });
      return;
    }
    setLoading(true);
    setNotice(null);
    try {
      const res = await signInWithGoogleFirebase();
      await ensureUserProfile(
        res.user,
        gameName.trim() || undefined,
        parseInt(levelInput, 10) || 1
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google Sign-In failed";
      setNotice({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (!acceptedTerms) {
      setNotice({
        type: "error",
        text: "Please accept the Virtual RPG Terms & Privacy Notice to continue.",
      });
      return;
    }
    setLoading(true);
    setNotice(null);

    try {
      if (mode === "signin") {
        const res = await loginWithEmailPassword(email.trim(), password);
        await ensureUserProfile(res.user);
      } else if (mode === "create") {
        const res = await registerWithEmailPassword(email.trim(), password);
        await ensureUserProfile(
          res.user,
          gameName.trim() || email.split("@")[0],
          parseInt(levelInput, 10) || 1
        );
      } else {
        await sendFirebaseMagicLink(email.trim());
        setNotice({
          type: "success",
          text: `Passwordless sign-in link sent to ${email.trim()}. Check your inbox.`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setNotice({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cartel-bg flex flex-col justify-between px-4 py-5 select-none">
      {/* Subtle Top Bar with App Install Prompt */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span className="uppercase tracking-widest font-semibold text-[11px] text-amber-300/90">
            Vinciguerra Lupo • v{APP_VERSION}
          </span>
        </div>
        <PwaInstallPrompt />
      </div>

      {/* Center Login / Create Account Card */}
      <main className="w-full max-w-md mx-auto my-auto py-3">
        <div className="rounded-2xl border border-amber-500/35 bg-cartel-card/95 p-5 shadow-2xl space-y-4">
          {/* Brand Logo & Title */}
          <div className="flex flex-col items-center text-center space-y-2">
            <img
              src="./cartel-logo.png"
              alt="The Fifth Family — Vinciguerra Lupo Crest"
              className="w-18 h-18 rounded-2xl border-2 border-amber-500/60 shadow-lg object-cover"
            />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white">
                THE FIFTH FAMILY
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Official Family Tax &amp; Roster Management Portal
              </p>
            </div>
          </div>

          {/* Mode Tabs: Sign In | Create Account */}
          <div className="grid grid-cols-2 gap-1.5 bg-cartel-surface p-1 rounded-xl border border-cartel-border">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setNotice(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                mode === "signin"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("create");
                setNotice(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                mode === "create"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Google Sign-In Button with Official Multicolor Google Logo */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleAuth}
            className="w-full rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold py-2.5 px-4 text-xs flex items-center justify-center gap-2.5 transition shadow cursor-pointer disabled:opacity-50"
          >
            <svg
              className="w-4 h-4 shrink-0"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M23.49 12.275c0-.845-.075-1.66-.215-2.44H12v4.615h6.445c-.275 1.495-1.12 2.765-2.385 3.615v3.005h3.86c2.26-2.08 3.57-5.145 3.57-8.795z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.955-1.075 7.94-2.91l-3.86-3.005c-1.075.72-2.45 1.145-4.08 1.145-3.135 0-5.79-2.115-6.735-4.96H1.275v3.1C3.25 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.265 14.27C5.025 13.55 4.89 12.785 4.89 12s.135-1.55.375-2.27V6.63H1.275C.465 8.245 0 10.065 0 12s.465 3.755 1.275 5.37l3.99-3.1z"
              />
              <path
                fill="#EA4335"
                d="M12 4.77c1.76 0 3.34.605 4.585 1.795l3.44-3.44C17.95 1.19 15.235 0 12 0 7.31 0 3.25 2.7 1.275 6.63l3.99 3.1c.945-2.845 3.6-4.96 6.735-4.96z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex py-0.5 items-center">
            <div className="flex-grow border-t border-cartel-border" />
            <span className="shrink mx-3 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              or use email
            </span>
            <div className="flex-grow border-t border-cartel-border" />
          </div>

          {/* Email & Password Form */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            {mode === "create" && (
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 relative">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    placeholder="In-Game Name"
                    className="w-full rounded-xl bg-cartel-bg border border-cartel-border pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="relative">
                  <Award className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min={1}
                    max={300}
                    required
                    value={levelInput}
                    onChange={(e) => setLevelInput(e.target.value)}
                    placeholder="Lv."
                    title="Your Current In-Game Level"
                    className="w-full rounded-xl bg-cartel-bg border border-cartel-border pl-8 pr-2 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}

            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full rounded-xl bg-cartel-bg border border-cartel-border pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {mode !== "magic" && (
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (6+ characters)"
                  className="w-full rounded-xl bg-cartel-bg border border-cartel-border pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            )}

            {/* Legal Consent & Virtual Currency Acknowledgment Checkbox */}
            <label className="flex items-start gap-2 text-[11px] text-slate-400 cursor-pointer pt-0.5">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 accent-amber-500 rounded cursor-pointer"
              />
              <span className="leading-snug">
                I confirm I am 13+ and acknowledge this is a{" "}
                <strong className="text-slate-200">
                  100% fictional RPG companion utility
                </strong>{" "}
                (no real money).{" "}
                <button
                  type="button"
                  onClick={() => setLegalOpen(true)}
                  className="text-amber-300 hover:underline font-semibold"
                >
                  Legal, Privacy &amp; Security Notice
                </button>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-2.5 px-4 text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 transition cursor-pointer disabled:opacity-50"
            >
              {mode === "signin" && (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Family Ledger</span>
                </>
              )}
              {mode === "create" && (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Submit Account for Approval</span>
                </>
              )}
              {mode === "magic" && (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Send Magic Sign-In Link</span>
                </>
              )}
            </button>
          </form>

          {notice && (
            <div
              className={`rounded-xl px-3 py-2 text-xs border ${
                notice.type === "success"
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                  : "bg-rose-500/15 border-rose-500/40 text-rose-300"
              }`}
            >
              {notice.text}
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => setMode(mode === "magic" ? "signin" : "magic")}
              className="text-[11px] text-slate-400 hover:text-amber-300 underline cursor-pointer"
            >
              {mode === "magic"
                ? "Back to Password Sign-In"
                : "Prefer a passwordless email link?"}
            </button>
          </div>
        </div>
      </main>

      <footer className="w-full max-w-md mx-auto flex items-center justify-between text-[11px] text-slate-500">
        <span>Fictional RPG Companion • No Real Currency</span>
        <button
          type="button"
          onClick={() => setLegalOpen(true)}
          className="text-slate-400 hover:text-amber-300 flex items-center gap-1 underline cursor-pointer"
        >
          <Scale className="w-3 h-3" />
          <span>Legal &amp; Security</span>
        </button>
      </footer>

      <LegalSecurityModal
        isOpen={legalOpen}
        onClose={() => setLegalOpen(false)}
      />
    </div>
  );
}
