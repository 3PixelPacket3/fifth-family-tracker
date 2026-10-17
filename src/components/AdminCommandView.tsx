"use client";

import React, { useState } from "react";
import {
  useCartelStore,
  formatCartelCurrency,
  MemberRank,
} from "@/store/useCartelStore";
import {
  Code2,
  Copy,
  Check,
  CalendarSync,
  Sliders,
  UserPlus,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Eye,
} from "lucide-react";

export default function AdminCommandView() {
  const {
    profiles,
    taxLogic,
    activePlayerId,
    activeWeekStart,
    triggerSundayRollover,
    updateTaxBracket,
    addRosterMember,
  } = useCartelStore();

  const activeProfile =
    profiles.find((p) => p.id === activePlayerId) || profiles[0];
  const isAdmin = activeProfile.role === "Admin";

  // 1. Single-Line HTML/CSS Popup Generator State
  const [alertTemplate, setAlertTemplate] = useState<
    "onboarding" | "tax_reminder" | "turf_war"
  >("onboarding");
  const [popupTitle, setPopupTitle] = useState(
    "Vinciguerra Lupo Cartel — Initial Application & Tax Protocol"
  );
  const [popupBody, setPopupBody] = useState(
    "Welcome to The Fifth Family. Operatives Lv.40+ are required to log weekly tributes into the $511M Cartel Treasury before Sunday 23:59 EST rollover."
  );
  const [ctaText, setCtaText] = useState("Open Cartel Tax Tracker");
  const [ctaUrl, setCtaUrl] = useState(
    "https://vinciguerra-lupo.github.io/fifth-family-tracker/"
  );
  const [copiedSingleLine, setCopiedSingleLine] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);

  // 2. Sunday Rollover State
  const [nextSundayDate, setNextSundayDate] = useState("2026-10-18");
  const [rolloverNotice, setRolloverNotice] = useState<string | null>(null);

  // 3. Roster Induction & Tax Logic Editor State
  const [newGameName, setNewGameName] = useState("");
  const [newRank, setNewRank] = useState<MemberRank>("Soldier");
  const [newLevel, setNewLevel] = useState("50");
  const [bracketLevel, setBracketLevel] = useState("50");
  const [bracketAmount, setBracketAmount] = useState("4000000");
  const [bracketLabel, setBracketLabel] = useState("Made Soldier (4M)");
  const [adminActionToast, setAdminActionToast] = useState<string | null>(null);

  // Strictly formatted single continuous line HTML/CSS (zero \n or \r) with target='_blank' on all CTAs
  const generateSingleLinePopupCode = (): string => {
    const cleanTitle = popupTitle.replace(/[\r\n]+/g, " ").trim();
    const cleanBody = popupBody.replace(/[\r\n]+/g, " ").trim();
    const cleanCta = ctaText.replace(/[\r\n]+/g, " ").trim();
    const cleanUrl = ctaUrl.replace(/[\r\n]+/g, "").trim();

    const raw = `<div style="box-sizing:border-box;width:100%;max-width:420px;margin:0 auto;padding:18px;background:linear-gradient(145deg,#12141d 0%,#171a26 100%);border:1px solid #d4af37;border-radius:14px;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 14px 30px rgba(0,0,0,0.75);"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"><span style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#d4af37;font-weight:700;">VINCIGUERRA LUPO SYNDICATE</span><span style="font-size:10px;padding:2px 8px;border-radius:99px;background:rgba(212,175,55,0.15);color:#f3e5ab;border:1px solid rgba(212,175,55,0.4);">THE FIFTH FAMILY</span></div><h3 style="margin:0 0 8px 0;font-size:16px;line-height:1.3;font-weight:800;color:#ffffff;">${cleanTitle}</h3><p style="margin:0 0 14px 0;font-size:13px;line-height:1.45;color:#cbd5e1;">${cleanBody}</p><div style="display:flex;gap:8px;align-items:center;"><a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;width:100%;text-align:center;padding:10px 14px;background:linear-gradient(90deg,#d4af37,#b48a1e);color:#090a0f;font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:0.8px;text-decoration:none;border-radius:9px;">${cleanCta} &#8599;</a></div></div>`;

    return raw.replace(/[\r\n]+/g, "");
  };

  const singleLineCode = generateSingleLinePopupCode();

  const applyTemplate = (tpl: "onboarding" | "tax_reminder" | "turf_war") => {
    setAlertTemplate(tpl);
    if (tpl === "onboarding") {
      setPopupTitle(
        "Vinciguerra Lupo Cartel — Initial Application & Tax Protocol"
      );
      setPopupBody(
        "Welcome to The Fifth Family. Operatives Lv.40+ are required to log weekly tributes into the $511M Cartel Treasury before Sunday 23:59 EST rollover."
      );
      setCtaText("Complete Cartel Onboarding");
    } else if (tpl === "tax_reminder") {
      setPopupTitle("URGENT: Sunday Cartel Treasury Rollover in 2 Hours");
      setPopupBody(
        "Don Wolfie05 & Underboss VexValerius are finalizing the active week snapshot. Settle your level bracket tax now to maintain Syndicate War payout eligibility."
      );
      setCtaText("Log Weekly Tax Tribute");
    } else {
      setPopupTitle("SYNDICATE ALERT: Sector 7 Turf Defense Mobilization");
      setPopupBody(
        "All Made Soldiers (Lv.50+) and Capos report to the Armory. $511M Cartel Treasury war chest is unlocked for ammunition reimbursements."
      );
      setCtaText("Launch War Room Dossier");
    }
  };

  const handleCopyPopupCode = () => {
    navigator.clipboard.writeText(singleLineCode);
    setCopiedSingleLine(true);
    setTimeout(() => setCopiedSingleLine(false), 3000);
  };

  const handleTriggerRollover = () => {
    if (!nextSundayDate) return;
    triggerSundayRollover(nextSundayDate);
    setRolloverNotice(
      `Sunday Rollover executed! Active week advanced to ${nextSundayDate} for all ${profiles.length} operatives.`
    );
    setTimeout(() => setRolloverNotice(null), 4000);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameName.trim()) return;
    const lvl = Math.max(1, parseInt(newLevel, 10) || 1);
    addRosterMember({
      game_name: newGameName.trim(),
      rank: newRank,
      level: lvl,
      role: newRank === "Don" || newRank === "Underboss" ? "Admin" : "User",
    });
    setAdminActionToast(
      `Inducted ${newGameName.trim()} (Lv.${lvl} ${newRank}) into roster.`
    );
    setNewGameName("");
    setTimeout(() => setAdminActionToast(null), 3500);
  };

  const handleSaveBracket = (e: React.FormEvent) => {
    e.preventDefault();
    const minLvl = Math.max(1, parseInt(bracketLevel, 10) || 1);
    const taxAmt = Math.max(0, parseFloat(bracketAmount) || 0);
    updateTaxBracket(minLvl, taxAmt, bracketLabel || `Lv.${minLvl}+ Bracket`);
    setAdminActionToast(
      `Updated Tax Logic: Lv.${minLvl}+ -> ${formatCartelCurrency(taxAmt, true)}`
    );
    setTimeout(() => setAdminActionToast(null), 3500);
  };

  return (
    <div className="w-full space-y-4">
      {!isAdmin && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/40 px-3.5 py-2.5 text-xs text-amber-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Viewing in preview mode. Switch active operative to{" "}
              <strong>Wolfie05 (Don)</strong> in the header for full Admin Firestore privileges.
            </span>
          </div>
        </div>
      )}

      {/* BLOCK 1: Single-Line HTML/CSS Alert & Onboarding Popup Generator (<= 564px) */}
      <section
        aria-label="Single-Line HTML/CSS Popup Generator"
        className="w-full max-h-[564px] overflow-hidden rounded-2xl border border-amber-500/30 bg-cartel-card/95 p-4 shadow-xl space-y-3"
      >
        <div className="flex items-center justify-between border-b border-cartel-border pb-2.5">
          <div>
            <div className="flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Admin Comms — Single-Line HTML/CSS Popup Generator
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Zero line breaks (`\n` stripped) • Enforces{" "}
              <code className="text-amber-300">target=&apos;_blank&apos;</code> so players never lose active RPG sessions
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowLivePreview((v) => !v)}
            className="rounded-xl bg-cartel-surface hover:bg-slate-800 border border-cartel-border px-2.5 py-1 text-[11px] font-semibold text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>{showLivePreview ? "Edit Fields" : "Preview Popup"}</span>
          </button>
        </div>

        {/* Preset Switcher */}
        <div className="flex items-center gap-1.5">
          {(
            [
              { id: "onboarding", label: "Initial Application" },
              { id: "tax_reminder", label: "Sunday Tax Alert" },
              { id: "turf_war", label: "Turf War CTA" },
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyTemplate(preset.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                alertTemplate === preset.id
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                  : "bg-cartel-surface text-slate-400 border-cartel-border hover:text-white"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {showLivePreview ? (
          <div className="py-1">
            <div dangerouslySetInnerHTML={{ __html: singleLineCode }} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={popupTitle}
              onChange={(e) => setPopupTitle(e.target.value)}
              placeholder="Alert Headline"
              className="sm:col-span-2 rounded-xl bg-cartel-bg border border-cartel-border px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <input
              type="text"
              value={popupBody}
              onChange={(e) => setPopupBody(e.target.value)}
              placeholder="Popup message body"
              className="sm:col-span-2 rounded-xl bg-cartel-bg border border-cartel-border px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            />
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="CTA Button Label"
              className="rounded-xl bg-cartel-bg border border-cartel-border px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <input
              type="url"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="CTA Target URL (opens in _blank)"
              className="rounded-xl bg-cartel-bg border border-cartel-border px-3 py-1.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
            />
          </div>
        )}

        {/* Single Continuous Line Output Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Continuous 1-Line Output ({singleLineCode.length} chars, 0 line breaks)
            </span>
            <span className="text-emerald-400 font-mono flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> target=&quot;_blank&quot; verified
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={singleLineCode}
              className="flex-1 rounded-xl bg-cartel-bg border border-cartel-border px-3 py-2 text-[11px] font-mono text-amber-200 select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyPopupCode}
              className="shrink-0 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-2 text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedSingleLine ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied 1-Line</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy HTML</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* BLOCK 2: Sunday Rollover Snapshot & Dynamic Tax Logic / Roster Control (<= 564px) */}
      <section
        aria-label="Sunday Rollover and Tax Bracket Engine"
        className="w-full max-h-[564px] overflow-hidden rounded-2xl border border-cartel-border bg-cartel-card/95 p-4 shadow-xl space-y-3.5"
      >
        {/* Sunday Rollover Trigger */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cartel-border pb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <CalendarSync className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Sunday Rollover Snapshot Engine
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Active Cycle: <strong className="text-amber-300">{activeWeekStart}</strong> • Snapshots roster &amp; initializes new weekly obligations
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={nextSundayDate}
              onChange={(e) => setNextSundayDate(e.target.value)}
              className="rounded-xl bg-cartel-bg border border-cartel-border px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={handleTriggerRollover}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Trigger Rollover
            </button>
          </div>
        </div>

        {rolloverNotice && (
          <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{rolloverNotice}</span>
          </div>
        )}

        {/* Two Compact Forms: Tax Bracket Logic + Induct New Roster Operative */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Dynamic Tax Logic Updater */}
          <form
            onSubmit={handleSaveBracket}
            className="rounded-xl bg-cartel-surface/90 border border-cartel-border p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5" />
                <span>tax_logic Table</span>
              </span>
              <span className="text-[10px] text-slate-400">
                {taxLogic.length} active brackets
              </span>
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
                <label className="text-[10px] text-slate-400">
                  Expected Tax ($)
                </label>
                <input
                  type="number"
                  min={0}
                  step="500000"
                  value={bracketAmount}
                  onChange={(e) => setBracketAmount(e.target.value)}
                  className="w-full rounded-lg bg-cartel-bg border border-cartel-border px-2 py-1 text-xs text-amber-300"
                />
              </div>
            </div>

            <div className="flex gap-1.5">
              <input
                type="text"
                value={bracketLabel}
                onChange={(e) => setBracketLabel(e.target.value)}
                placeholder="Tier Label"
                className="flex-1 rounded-lg bg-cartel-bg border border-cartel-border px-2 py-1 text-xs text-slate-200"
              />
              <button
                type="submit"
                className="rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2.5 py-1 text-xs font-bold cursor-pointer"
              >
                Save Tier
              </button>
            </div>
          </form>

          {/* Induct New Operative into profiles Table */}
          <form
            onSubmit={handleAddMember}
            className="rounded-xl bg-cartel-surface/90 border border-cartel-border p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5" />
                <span>Induct Operative</span>
              </span>
              <span className="text-[10px] text-slate-400">
                profiles Table
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                placeholder="In-Game Name"
                className="col-span-2 rounded-lg bg-cartel-bg border border-cartel-border px-2.5 py-1 text-xs text-white"
              />
              <select
                value={newRank}
                onChange={(e) => setNewRank(e.target.value as MemberRank)}
                className="rounded-lg bg-cartel-bg border border-cartel-border px-2 py-1 text-xs text-slate-200"
              >
                <option value="Associate">Associate</option>
                <option value="Soldier">Soldier</option>
                <option value="Capo">Capo</option>
                <option value="Underboss">Underboss</option>
                <option value="Don">Don</option>
              </select>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={250}
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value)}
                  placeholder="Lv."
                  className="w-16 rounded-lg bg-cartel-bg border border-cartel-border px-2 py-1 text-xs text-white"
                />
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 px-2 py-1 text-xs font-bold cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Compact Spec Tax Bracket Reference Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px]">
          {taxLogic.map((tier) => (
            <div
              key={tier.min_level}
              className="shrink-0 rounded-lg bg-cartel-bg/90 border border-cartel-border px-2.5 py-1 flex items-center gap-1.5"
            >
              <span className="text-slate-400">Lv.{tier.min_level}+:</span>
              <span className="font-bold text-amber-300">
                {formatCartelCurrency(tier.expected_tax, true)}
              </span>
            </div>
          ))}
        </div>

        {adminActionToast && (
          <div className="rounded-lg bg-amber-500/15 border border-amber-500/40 px-3 py-1 text-xs text-amber-200">
            {adminActionToast}
          </div>
        )}
      </section>
    </div>
  );
}
