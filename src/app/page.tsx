"use client";

import React, { useEffect, useState } from "react";
import {
  useCartelStore,
  formatCartelCurrency,
} from "@/store/useCartelStore";
import WeeklyDashboardView from "@/components/WeeklyDashboardView";
import DataVaultView from "@/components/DataVaultView";
import AdminCommandView from "@/components/AdminCommandView";
import AuthModal from "@/components/AuthModal";
import {
  Shield,
  LayoutDashboard,
  Database,
  Terminal,
  Coins,
  UserCheck,
  RefreshCw,
  Crown,
} from "lucide-react";

type ActiveTab = "dashboard" | "vault" | "admin";

export default function CartelTrackerApp() {
  const {
    profiles,
    activePlayerId,
    setActivePlayer,
    baseTreasury,
    activeWeekStart,
  } = useCartelStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydrate Zustand persisted store cleanly + listen for cross-tab storage events
  useEffect(() => {
    setMounted(true);
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === "vinciguerra-lupo-cartel-vault-v1") {
        useCartelStore.persist.rehydrate();
      }
    };
    window.addEventListener("storage", handleStorageSync);
    return () => window.removeEventListener("storage", handleStorageSync);
  }, []);

  const activeProfile =
    profiles.find((p) => p.id === activePlayerId) || profiles[0];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-cartel-bg flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto animate-pulse">
            <Crown className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-xs uppercase tracking-widest text-amber-300 font-bold">
            Vinciguerra Lupo Cartel Vault
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cartel-bg text-slate-100 pb-24">
      {/* Top Mobile-First Command Header */}
      <header className="sticky top-0 z-30 border-b border-cartel-border bg-cartel-bg/95 backdrop-blur-md">
        <div className="w-full max-w-md md:max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/30 to-rose-900/40 border border-amber-500/50 flex items-center justify-center shrink-0 shadow-inner">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-extrabold tracking-tight text-white truncate">
                  VINCIGUERRA LUPO
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  The Fifth Family
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <Coins className="w-3 h-3 text-amber-400" />
                  {formatCartelCurrency(baseTreasury, true)} Treasury
                </span>
                <span>•</span>
                <span>Wk {activeWeekStart}</span>
              </div>
            </div>
          </div>

          {/* Quick Operative / Role Switcher Pill + Auth Modal Trigger */}
          <div className="flex items-center gap-1.5 shrink-0">
            <select
              aria-label="Switch Active Operative Persona"
              value={activeProfile.id}
              onChange={(e) => setActivePlayer(e.target.value)}
              className="rounded-xl bg-cartel-surface border border-amber-500/40 px-2.5 py-1.5 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400 cursor-pointer max-w-[155px] truncate"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.game_name} (Lv.{p.level} {p.rank})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="p-2 rounded-xl bg-cartel-surface hover:bg-slate-800 border border-cartel-border text-slate-300 hover:text-amber-300 transition cursor-pointer"
              title="Firebase Auth & Cloud Firestore Settings"
            >
              <Shield className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Single-Column Mobile-First Container (width: 100%, strict max-width) */}
      <main className="w-full max-w-md md:max-w-2xl mx-auto px-4 pt-4">
        {activeTab === "dashboard" && <WeeklyDashboardView />}
        {activeTab === "vault" && <DataVaultView />}
        {activeTab === "admin" && <AdminCommandView />}
      </main>

      {/* Bottom Mobile-First Navigation Dock */}
      <nav
        aria-label="Primary Cartel Views"
        className="fixed bottom-0 inset-x-0 z-30 border-t border-cartel-border bg-cartel-surface/95 backdrop-blur-md"
      >
        <div className="w-full max-w-md md:max-w-2xl mx-auto px-4 py-2 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mb-0.5" />
            <span>1. Weekly Hub</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("vault")}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "vault"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Database className="w-4 h-4 mb-0.5" />
            <span>2. Data Vault</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("admin")}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "admin"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-4 h-4 mb-0.5" />
            <span>3. Admin Tools</span>
          </button>
        </div>
      </nav>

      {/* Supabase Auth & Discord OAuth / Magic Link Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
