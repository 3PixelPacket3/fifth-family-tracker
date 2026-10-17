"use client";

import React from "react";
import { Profile } from "@/store/useCartelStore";
import { logoutFirebase } from "@/lib/firebase";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import { Clock, ShieldAlert, LogOut, RefreshCw } from "lucide-react";

interface PendingApprovalScreenProps {
  profile: Profile;
  onRefresh: () => void;
}

export default function PendingApprovalScreen({
  profile,
  onRefresh,
}: PendingApprovalScreenProps) {
  const isRejected = profile.approval_status === "rejected";

  return (
    <div className="min-h-screen bg-cartel-bg flex flex-col justify-between px-4 py-6">
      <div className="w-full max-w-md mx-auto flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
          The Fifth Family
        </span>
        <PwaInstallPrompt />
      </div>

      <main className="w-full max-w-md mx-auto my-auto">
        <div className="rounded-2xl border border-amber-500/40 bg-cartel-card p-6 text-center shadow-2xl space-y-4">
          <img
            src="./cartel-logo.png"
            alt="Vinciguerra Lupo Crest"
            className="w-16 h-16 rounded-2xl border border-amber-500/50 mx-auto object-cover"
          />

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-amber-500/15 text-amber-300 border-amber-500/40">
            {isRejected ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-300">Application Declined</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5" />
                <span>Awaiting Admin / Don Approval</span>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <h1 className="text-lg font-extrabold text-white">
              Welcome, {profile.game_name}
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isRejected
                ? "Your membership request was not approved by the Cartel leadership."
                : "Your account has been created and sent to the Admin and the Family Don for review. Once approved, you will automatically gain access to the Family Ledger."}
            </p>
          </div>

          <div className="rounded-xl bg-cartel-surface border border-cartel-border p-3 text-left text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Operative Name:</span>
              <span className="font-bold text-white">{profile.game_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Email:</span>
              <span className="text-slate-200">{profile.email || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Reported Level:</span>
              <span className="font-bold text-amber-300">
                Lv. {profile.level}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onRefresh}
              className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-3 text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Check Approval Status</span>
            </button>

            <button
              type="button"
              onClick={() => logoutFirebase()}
              className="rounded-xl bg-cartel-surface hover:bg-slate-800 border border-cartel-border text-slate-300 font-bold py-2.5 px-3 text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </main>

      <div className="h-4" />
    </div>
  );
}
