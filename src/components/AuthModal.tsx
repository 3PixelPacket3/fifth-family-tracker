"use client";

import React, { useEffect, useState } from "react";
import { useCartelStore, Profile } from "@/store/useCartelStore";
import {
  auth,
  signInWithGoogleFirebase,
  loginWithEmailPassword,
  registerWithEmailPassword,
  sendFirebaseMagicLink,
  logoutFirebase,
  syncVaultToFirestore,
  initFirebaseAnalytics,
} from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  Shield,
  Mail,
  Lock,
  CheckCircle2,
  X,
  KeyRound,
  CloudUpload,
  LogOut,
  UserPlus,
  LogIn,
  Chrome,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const {
    profiles,
    taxLogic,
    contributions,
    baseTreasury,
    activeWeekStart,
    activePlayerId,
    setActivePlayer,
  } = useCartelStore();

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "register" | "magic">(
    "signin"
  );
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    initFirebaseAnalytics();
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthNotice(null);
    try {
      const result = await signInWithGoogleFirebase();
      setAuthNotice({
        type: "success",
        text: `Signed in with Google as ${
          result.user.displayName || result.user.email
        }`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Google Sign-In failed";
      setAuthNotice({ type: "error", text: message });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setLoading(true);
    setAuthNotice(null);

    try {
      if (authMode === "signin") {
        const res = await loginWithEmailPassword(
          emailInput.trim(),
          passwordInput
        );
        setAuthNotice({
          type: "success",
          text: `Signed in as ${res.user.email}`,
        });
        setPasswordInput("");
      } else if (authMode === "register") {
        const res = await registerWithEmailPassword(
          emailInput.trim(),
          passwordInput
        );
        setAuthNotice({
          type: "success",
          text: `Created Cartel account for ${res.user.email}`,
        });
        setPasswordInput("");
      } else {
        await sendFirebaseMagicLink(emailInput.trim());
        setAuthNotice({
          type: "success",
          text: `Passwordless Magic Link sent to ${emailInput.trim()}`,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication error";
      setAuthNotice({ type: "error", text: message });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logoutFirebase();
    setAuthNotice({
      type: "success",
      text: "Signed out of Firebase session.",
    });
  };

  const handleSeedFirestore = async () => {
    setLoading(true);
    setAuthNotice(null);
    try {
      await syncVaultToFirestore({
        profiles,
        taxLogic,
        contributions,
        baseTreasury,
        activeWeekStart,
      });
      setAuthNotice({
        type: "success",
        text: "Synced profiles, tax_logic & weekly_contributions to Cloud Firestore!",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Firestore sync error";
      setAuthNotice({ type: "error", text: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md max-h-[564px] overflow-hidden rounded-2xl border border-amber-500/40 bg-cartel-card p-4 shadow-2xl space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cartel-border pb-2.5">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Firebase Auth &amp; Cloud Firestore
              </h2>
              <p className="text-[10px] text-slate-400">
                Project: <span className="text-amber-300 font-mono">vinciguerra-lupo-cartel</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Firebase User Status Strip (if signed in) */}
        {firebaseUser && (
          <div className="flex items-center justify-between rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-3 py-1.5 text-xs">
            <div className="truncate text-emerald-200">
              <span className="font-bold">Authenticated:</span>{" "}
              {firebaseUser.displayName || firebaseUser.email}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-rose-300 hover:text-rose-200 font-bold flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Primary Google Sign-In + Firestore Sync Row */}
        <div className="grid grid-cols-12 gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="col-span-7 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold py-2 px-3 text-xs flex items-center justify-center gap-2 transition shadow cursor-pointer disabled:opacity-50"
          >
            <Chrome className="w-4 h-4 text-blue-600" />
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleSeedFirestore}
            className="col-span-5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold py-2 px-2.5 text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Sync all Cartel Roster & Tax Logic collections to Cloud Firestore"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span>Sync Firestore</span>
          </button>
        </div>

        {/* Email & Password / Register / Magic Link Form */}
        <div className="rounded-xl bg-cartel-surface/90 border border-cartel-border p-3 space-y-2">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              {(
                [
                  { id: "signin", label: "Email Sign In" },
                  { id: "register", label: "Create Account" },
                  { id: "magic", label: "Magic Link" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setAuthMode(tab.id);
                    setAuthNotice(null);
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                    authMode === tab.id
                      ? "bg-amber-500 text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div
                className={`relative ${
                  authMode === "magic" ? "sm:col-span-2" : ""
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Operative Email..."
                  className="w-full rounded-lg bg-cartel-bg border border-cartel-border pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {authMode !== "magic" && (
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Password (6+ chars)..."
                    className="w-full rounded-lg bg-cartel-bg border border-cartel-border pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-1.5 px-3 text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              {authMode === "signin" && (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In with Email &amp; Password</span>
                </>
              )}
              {authMode === "register" && (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register Cartel Email &amp; Password</span>
                </>
              )}
              {authMode === "magic" && (
                <>
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Passwordless Sign-In Link</span>
                </>
              )}
            </button>
          </form>
        </div>

        {authNotice && (
          <div
            className={`rounded-lg px-3 py-1.5 text-[11px] border ${
              authNotice.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-rose-500/15 border-rose-500/40 text-rose-300"
            }`}
          >
            {authNotice.text}
          </div>
        )}

        {/* Instant Operative Persona Switcher (Test User vs Admin View) */}
        <div className="space-y-1.5 border-t border-cartel-border pt-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-300">
              <KeyRound className="w-3 h-3 text-amber-400" />
              <span>Active Roster Persona (User vs. Admin):</span>
            </span>
            <span>Tap to switch</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {profiles.slice(0, 6).map((p: Profile) => {
              const isSelected = p.id === activePlayerId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setActivePlayer(p.id);
                    onClose();
                  }}
                  className={`p-1.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? "bg-amber-500/20 border-amber-400 text-white"
                      : "bg-cartel-surface/80 border-cartel-border text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold truncate">
                      {p.game_name}
                    </p>
                    <p className="text-[9px] text-slate-400 truncate">
                      Lv.{p.level} {p.rank}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
