"use client";

import React, { useEffect, useState } from "react";
import {
  useCartelStore,
  formatCartelCurrency,
  getEffectivePermissions,
  APP_VERSION,
  Profile,
} from "@/store/useCartelStore";
import {
  auth,
  ensureUserProfile,
  isMasterAdminEmail,
  isDefaultDonEmail,
  logoutFirebase,
  subscribeToCartelFirestore,
  initFirebaseAnalytics,
} from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import LandingAuthScreen from "@/components/LandingAuthScreen";
import PendingApprovalScreen from "@/components/PendingApprovalScreen";
import WeeklyDashboardView from "@/components/WeeklyDashboardView";
import DataVaultView from "@/components/DataVaultView";
import AdminCommandView from "@/components/AdminCommandView";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import LegalSecurityModal from "@/components/LegalSecurityModal";
import {
  LayoutDashboard,
  Database,
  ShieldCheck,
  Coins,
  LogOut,
  Scale,
} from "lucide-react";

type ActiveTab = "dashboard" | "vault" | "admin";

export default function CartelTrackerApp() {
  const {
    profiles,
    baseTreasury,
    activeWeekStart,
    rankPermissions,
  } = useCartelStore();

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [legalModalOpen, setLegalModalOpen] = useState(false);

  useEffect(() => {
    initFirebaseAnalytics();
    let unsubFirestore: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const prof = await ensureUserProfile(user);
        setUserProfile(prof);
        unsubFirestore = subscribeToCartelFirestore();
      } else {
        setUserProfile(null);
        if (unsubFirestore) {
          unsubFirestore();
          unsubFirestore = null;
        }
      }
      setAuthChecking(false);
    });

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === "vinciguerra-lupo-clean-vault-v2") {
        useCartelStore.persist.rehydrate();
      }
    };
    window.addEventListener("storage", handleStorageSync);

    return () => {
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
      window.removeEventListener("storage", handleStorageSync);
    };
  }, []);

  // Resolve user's effective profile
  useEffect(() => {
    if (!firebaseUser) return;
    const directMatch = profiles.find(
      (p) =>
        p.id === firebaseUser.uid ||
        (firebaseUser.email &&
          p.email?.toLowerCase() === firebaseUser.email.toLowerCase())
    );
    if (directMatch) {
      if (directMatch.linked_member_id) {
        const linked = profiles.find(
          (p) => p.id === directMatch.linked_member_id
        );
        if (linked) {
          setUserProfile({
            ...linked,
            linked_member_id: linked.id,
            approval_status: "approved",
          });
          return;
        }
      }
      setUserProfile(directMatch);
    }
  }, [profiles, firebaseUser]);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-cartel-bg flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <img
            src="./cartel-logo.png"
            alt="The Fifth Family"
            className="w-16 h-16 rounded-2xl border border-amber-500/50 mx-auto animate-pulse object-cover"
          />
          <p className="text-xs uppercase tracking-widest text-amber-300 font-bold">
            The Fifth Family • v{APP_VERSION}
          </p>
        </div>
      </div>
    );
  }

  // 1. Not Logged In -> Mandatory Login / Create Account Landing Page
  if (!firebaseUser || !userProfile) {
    return <LandingAuthScreen />;
  }

  const isMasterAdmin = isMasterAdminEmail(firebaseUser.email);
  const isDefaultDon = isDefaultDonEmail(firebaseUser.email);

  // 2. Logged In, But Account Not Approved Yet (Bypassed automatically for App Developer oharajoshua333@gmail.com and Default Don zpenrice@gmail.com)
  if (
    !isMasterAdmin &&
    !isDefaultDon &&
    userProfile.approval_status !== "approved"
  ) {
    return (
      <PendingApprovalScreen
        profile={userProfile}
        onRefresh={async () => {
          const refreshed = await ensureUserProfile(firebaseUser);
          setUserProfile(refreshed);
        }}
      />
    );
  }

  const effectiveRank = isMasterAdmin
    ? "App Developer"
    : isDefaultDon
    ? "Don"
    : userProfile.rank;

  const effectivePermissions = getEffectivePermissions(
    effectiveRank,
    isMasterAdmin,
    isDefaultDon,
    rankPermissions
  );

  const canAccessAdminTab =
    effectivePermissions.isFullCommand ||
    effectivePermissions.manageMembers ||
    effectivePermissions.manageRolloverTreasury ||
    effectivePermissions.manageTaxBrackets ||
    effectivePermissions.manageIndividualTax;

  const pendingApprovalsCount = profiles.filter(
    (p) => p.approval_status === "pending"
  ).length;

  return (
    <div className="min-h-screen bg-cartel-bg text-slate-100 pb-28">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 border-b border-cartel-border bg-cartel-bg/95 backdrop-blur-md">
        <div className="w-full max-w-md md:max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="./cartel-logo.png"
              alt="Fifth Family Logo"
              className="w-9 h-9 rounded-xl border border-amber-500/50 shrink-0 object-cover"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-extrabold tracking-tight text-white truncate">
                  THE FIFTH FAMILY
                </h1>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {effectiveRank}
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

          <div className="flex items-center gap-1.5 shrink-0">
            <PwaInstallPrompt />
            <button
              type="button"
              onClick={() => setLegalModalOpen(true)}
              className="p-2 rounded-xl bg-cartel-surface hover:bg-slate-800 border border-cartel-border text-slate-300 hover:text-amber-300 transition cursor-pointer"
              title="Legal, Privacy & Security Information"
            >
              <Scale className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => logoutFirebase()}
              className="p-2 rounded-xl bg-cartel-surface hover:bg-slate-800 border border-cartel-border text-slate-300 hover:text-rose-300 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-md md:max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {activeTab === "dashboard" && (
          <WeeklyDashboardView
            currentUserProfile={userProfile}
            permissions={effectivePermissions}
          />
        )}
        {activeTab === "vault" && (
          <DataVaultView
            canExportVault={
              effectivePermissions.isFullCommand ||
              effectivePermissions.manageMembers
            }
          />
        )}
        {activeTab === "admin" && canAccessAdminTab && (
          <AdminCommandView
            isMasterAdmin={isMasterAdmin}
            permissions={effectivePermissions}
          />
        )}

        {/* Subtle Legal & Security Compliance Footer Strip */}
        <footer className="pt-2 pb-4 text-center text-[11px] text-slate-500 flex flex-wrap items-center justify-center gap-2">
          <span>v{APP_VERSION} • Unofficial RPG Companion (Fictional Currency Only)</span>
          <span>•</span>
          <button
            type="button"
            onClick={() => setLegalModalOpen(true)}
            className="text-slate-400 hover:text-amber-300 underline cursor-pointer"
          >
            Legal, Privacy, Security &amp; Data Deletion
          </button>
        </footer>
      </main>

      {/* Bottom Navigation Dock */}
      <nav
        aria-label="Primary Navigation"
        className="fixed bottom-0 inset-x-0 z-30 border-t border-cartel-border bg-cartel-surface/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      >
        <div
          className={`w-full max-w-md md:max-w-2xl mx-auto px-4 py-2 grid gap-2 ${
            canAccessAdminTab ? "grid-cols-3" : "grid-cols-2"
          }`}
        >
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
            <span>Roster &amp; Tax</span>
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
            <span>Data Vault</span>
          </button>

          {canAccessAdminTab && (
            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "admin"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="w-4 h-4 mb-0.5" />
              <span>Command</span>
              {(effectivePermissions.isFullCommand ||
                effectivePermissions.manageMembers) &&
                pendingApprovalsCount > 0 && (
                  <span className="absolute top-1 right-3 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                    {pendingApprovalsCount}
                  </span>
                )}
            </button>
          )}
        </div>
      </nav>

      <LegalSecurityModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
      />
    </div>
  );
}
