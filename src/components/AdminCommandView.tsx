"use client";

import React, { useState } from "react";
import {
  useCartelStore,
  formatCartelCurrency,
  MemberRank,
  Profile,
  MASTER_ADMIN_EMAIL,
} from "@/store/useCartelStore";
import {
  saveProfileToCloud,
  deleteProfileFromCloud,
  saveMetaToCloud,
  saveTaxBracketToCloud,
} from "@/lib/firebase";
import {
  UserCheck,
  UserX,
  Code2,
  Copy,
  Check,
  CalendarSync,
  Sliders,
  Crown,
  Sparkles,
} from "lucide-react";

interface AdminCommandViewProps {
  isMasterAdmin: boolean;
  isAdminOrDon: boolean;
}

export default function AdminCommandView({
  isMasterAdmin,
  isAdminOrDon,
}: AdminCommandViewProps) {
  const {
    profiles,
    taxLogic,
    activeWeekStart,
    baseTreasury,
    welcomeHtml,
  } = useCartelStore();

  const pendingAccounts = profiles.filter(
    (p) => p.approval_status === "pending"
  );
  const approvedMembers = profiles.filter(
    (p) => p.approval_status === "approved"
  );

  // Welcome Message Custom HTML/CSS State (Editable by Master Admin oharajoshua333@gmail.com)
  const [customWelcomeCode, setCustomWelcomeCode] = useState(welcomeHtml);
  const [welcomeSaved, setWelcomeSaved] = useState(false);

  // Single-Line HTML/CSS Alert Generator State
  const [popupTitle, setPopupTitle] = useState(
    "The Fifth Family — Weekly Tax & Onboarding Notice"
  );
  const [popupBody, setPopupBody] = useState(
    "All Vinciguerra Lupo Cartel members must log weekly tributes before Sunday rollover."
  );
  const [ctaText, setCtaText] = useState("Open Family Tax Portal");
  const [ctaUrl, setCtaUrl] = useState(
    "https://3pixelpacket3.github.io/fifth-family-tracker/"
  );
  const [copiedSingleLine, setCopiedSingleLine] = useState(false);

  // Week & Treasury / Tax Bracket Settings
  const [newWeekDate, setNewWeekDate] = useState(activeWeekStart);
  const [treasuryInput, setTreasuryInput] = useState(String(baseTreasury));
  const [bracketLevel, setBracketLevel] = useState("50");
  const [bracketAmount, setBracketAmount] = useState("4000000");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Approve or Reject Pending User Account
  const handleApproveUser = async (
    profile: Profile,
    assignRank: MemberRank = "Soldier"
  ) => {
    const updated: Profile = {
      ...profile,
      rank: assignRank,
      role: assignRank === "Don" ? "Admin" : "User",
      approval_status: "approved",
    };
    await saveProfileToCloud(updated);
    showToast(`Approved ${profile.game_name} as ${assignRank}.`);
  };

  const handleRejectUser = async (profile: Profile) => {
    await deleteProfileFromCloud(profile.id);
    showToast(`Removed pending request from ${profile.game_name}.`);
  };

  // Master Admin: Appoint or Change the Family Don from existing users
  const handleSetDon = async (memberId: string) => {
    const target = approvedMembers.find((m) => m.id === memberId);
    if (!target) return;
    await saveProfileToCloud({
      ...target,
      rank: "Don",
      role: "Admin",
    });
    showToast(`${target.game_name} has been appointed as Family Don.`);
  };

  // Save Custom HTML/CSS Welcome Banner
  const handleSaveWelcomeHtml = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveMetaToCloud({ welcomeHtml: customWelcomeCode });
    setWelcomeSaved(true);
    setTimeout(() => setWelcomeSaved(false), 3000);
  };

  // Generate Single-Line HTML/CSS Popup (0 line breaks, target='_blank')
  const singleLinePopupCode = `<div style="box-sizing:border-box;width:100%;max-width:420px;margin:0 auto;padding:16px;background:#12141d;border:1px solid #d4af37;border-radius:14px;color:#f8fafc;font-family:system-ui,sans-serif;"><div style="font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:#d4af37;font-weight:700;margin-bottom:6px;">THE FIFTH FAMILY • VINCIGUERRA LUPO</div><h3 style="margin:0 0 6px 0;font-size:15px;font-weight:800;color:#ffffff;">${popupTitle.replace(/[\r\n]+/g, " ").trim()}</h3><p style="margin:0 0 12px 0;font-size:12px;line-height:1.45;color:#cbd5e1;">${popupBody.replace(/[\r\n]+/g, " ").trim()}</p><a href="${ctaUrl.replace(/[\r\n]+/g, "").trim()}" target="_blank" rel="noopener noreferrer" style="display:block;width:100%;box-sizing:border-box;text-align:center;padding:9px 12px;background:#d4af37;color:#090a0f;font-weight:800;font-size:11px;text-transform:uppercase;text-decoration:none;border-radius:8px;">${ctaText.replace(/[\r\n]+/g, " ").trim()} &#8599;</a></div>`.replace(
    /[\r\n]+/g,
    ""
  );

  const handleSaveCycleAndTreasury = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericTreasury = Math.max(0, parseFloat(treasuryInput) || 0);
    await saveMetaToCloud({
      activeWeekStart: newWeekDate,
      baseTreasury: numericTreasury,
    });
    showToast(
      `Updated Active Week (${newWeekDate}) & Treasury (${formatCartelCurrency(
        numericTreasury,
        true
      )}).`
    );
  };

  const handleSaveBracket = async (e: React.FormEvent) => {
    e.preventDefault();
    const minLvl = Math.max(1, parseInt(bracketLevel, 10) || 1);
    const amt = Math.max(0, parseFloat(bracketAmount) || 0);
    await saveTaxBracketToCloud({
      min_level: minLvl,
      expected_tax: amt,
      bracket_label: `Lv ${minLvl}+ (${formatCartelCurrency(amt, true)})`,
    });
    showToast(
      `Saved Tax Bracket: Lv.${minLvl}+ -> ${formatCartelCurrency(amt, true)}`
    );
  };

  if (!isAdminOrDon) {
    return (
      <div className="rounded-2xl border border-cartel-border bg-cartel-card p-6 text-center space-y-2">
        <Crown className="w-7 h-7 text-amber-400 mx-auto" />
        <h2 className="text-sm font-bold text-white uppercase">
          Admin &amp; Don Restricted Area
        </h2>
        <p className="text-xs text-slate-400">
          Only the Master Admin ({MASTER_ADMIN_EMAIL}) or an appointed Family
          Don can approve accounts and edit system settings.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {toast && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-3.5 py-2 text-xs text-emerald-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* BLOCK 1: Account Approval Queue & Appoint Don (<= 564px) */}
      <section className="w-full max-h-[564px] overflow-hidden rounded-2xl border border-amber-500/40 bg-cartel-card p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-cartel-border pb-2.5">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-400" />
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Account Approvals &amp; Don Appointment
              </h2>
              <p className="text-[11px] text-slate-400">
                New signups require review by {MASTER_ADMIN_EMAIL} or the Don
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            {pendingAccounts.length} Pending
          </span>
        </div>

        {pendingAccounts.length === 0 ? (
          <div className="py-3 text-xs text-slate-400 text-center bg-cartel-surface/60 rounded-xl border border-cartel-border/60">
            No pending account requests waiting for review.
          </div>
        ) : (
          <div className="space-y-2">
            {pendingAccounts.slice(0, 4).map((acct) => (
              <div
                key={acct.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cartel-surface border border-amber-500/30 p-2.5 text-xs"
              >
                <div>
                  <p className="font-bold text-white">
                    {acct.game_name}{" "}
                    <span className="text-amber-300 font-normal">
                      (Lv.{acct.level})
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400">{acct.email}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApproveUser(acct, "Soldier")}
                    className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-2.5 py-1 text-xs cursor-pointer"
                  >
                    Approve Member
                  </button>
                  {isMasterAdmin && (
                    <button
                      type="button"
                      onClick={() => handleApproveUser(acct, "Don")}
                      className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1 text-xs cursor-pointer"
                    >
                      Approve as Don
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRejectUser(acct)}
                    className="p-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-pointer"
                    title="Reject Account"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Master Admin: Promote any Approved User to Don */}
        {isMasterAdmin && approvedMembers.length > 0 && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-cartel-border text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Appoint Family Don:</span>
            </span>
            <select
              onChange={(e) => {
                if (e.target.value) handleSetDon(e.target.value);
              }}
              defaultValue=""
              className="rounded-xl bg-cartel-bg border border-cartel-border px-2.5 py-1 text-xs text-amber-300"
            >
              <option value="" disabled>
                Select member to make Don...
              </option>
              {approvedMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.game_name} ({m.rank})
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* BLOCK 2: Custom HTML/CSS Welcome Banner Designer (Master Admin oharajoshua333@gmail.com) */}
      <section className="w-full max-h-[564px] overflow-hidden rounded-2xl border border-cartel-border bg-cartel-card p-4 shadow-xl space-y-2.5">
        <div className="flex items-center justify-between border-b border-cartel-border pb-2">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-amber-400" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Custom HTML/CSS Welcome Message Designer
              </h3>
              <p className="text-[11px] text-slate-400">
                Renders at the top of the app for all approved family members
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveWelcomeHtml} className="space-y-2">
          <textarea
            rows={3}
            value={customWelcomeCode}
            onChange={(e) => setCustomWelcomeCode(e.target.value)}
            placeholder="Paste custom HTML/CSS welcome banner code here..."
            className="w-full rounded-xl bg-cartel-bg border border-cartel-border p-2.5 text-xs font-mono text-amber-200 focus:outline-none focus:border-amber-400"
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setCustomWelcomeCode("")}
              className="text-[11px] text-slate-400 hover:text-rose-300 underline cursor-pointer"
            >
              Clear Banner
            </button>
            <button
              type="submit"
              className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 text-xs uppercase tracking-wider cursor-pointer"
            >
              {welcomeSaved ? "Saved Welcome Banner!" : "Publish Welcome Code"}
            </button>
          </div>
        </form>
      </section>

      {/* BLOCK 3: Treasury, Sunday Rollover & Single-Line Popup Code (<= 564px) */}
      <section className="w-full max-h-[564px] overflow-hidden rounded-2xl border border-cartel-border bg-cartel-card p-4 shadow-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Active Week & Treasury Setter */}
          <form
            onSubmit={handleSaveCycleAndTreasury}
            className="rounded-xl bg-cartel-surface border border-cartel-border p-3 space-y-2"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CalendarSync className="w-3.5 h-3.5" />
              <span>Week Rollover &amp; Treasury</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="text-[10px] text-slate-400">Active Week</label>
                <input
                  type="date"
                  value={newWeekDate}
                  onChange={(e) => setNewWeekDate(e.target.value)}
                  className="w-full rounded-lg bg-cartel-bg border border-cartel-border px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">
                  Treasury ($)
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={treasuryInput}
                  onChange={(e) => setTreasuryInput(e.target.value)}
                  className="w-full rounded-lg bg-cartel-bg border border-cartel-border px-2 py-1 text-xs text-amber-300"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 py-1 text-xs font-bold cursor-pointer"
            >
              Update Week &amp; Treasury
            </button>
          </form>

          {/* Level Tax Bracket Setter */}
          <form
            onSubmit={handleSaveBracket}
            className="rounded-xl bg-cartel-surface border border-cartel-border p-3 space-y-2"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>Level Tax Brackets</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="text-[10px] text-slate-400">Min Level</label>
                <input
                  type="number"
                  min={1}
                  value={bracketLevel}
                  onChange={(e) => setBracketLevel(e.target.value)}
                  className="w-full rounded-lg bg-cartel-bg border border-cartel-border px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Tax ($)</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={bracketAmount}
                  onChange={(e) => setBracketAmount(e.target.value)}
                  className="w-full rounded-lg bg-cartel-bg border border-cartel-border px-2 py-1 text-xs text-amber-300"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 py-1 text-xs font-bold cursor-pointer"
            >
              Save Level Bracket
            </button>
          </form>
        </div>

        {/* Single-Line HTML/CSS Alert Generator */}
        <div className="border-t border-cartel-border pt-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-300">
              In-Game 1-Line HTML Popup Code (`target=&apos;_blank&apos;`)
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(singleLinePopupCode);
                setCopiedSingleLine(true);
                setTimeout(() => setCopiedSingleLine(false), 2500);
              }}
              className="text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1 cursor-pointer"
            >
              {copiedSingleLine ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied 1-Line HTML</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy 1-Line Code</span>
                </>
              )}
            </button>
          </div>
          <input
            type="text"
            readOnly
            value={singleLinePopupCode}
            className="w-full rounded-lg bg-cartel-bg border border-cartel-border px-2.5 py-1.5 text-[11px] font-mono text-amber-200 select-all"
          />
        </div>
      </section>
    </div>
  );
}
