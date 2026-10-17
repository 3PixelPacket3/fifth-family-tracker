"use client";

import React, { useState } from "react";
import {
  useCartelStore,
  calculateExpectedTax,
  formatCartelCurrency,
  MemberRank,
} from "@/store/useCartelStore";
import {
  ShieldCheck,
  Coins,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  CalendarClock,
  Sparkles,
  UserCheck,
  Filter,
  ChevronLeft,
  ChevronRight,
  Lock,
} from "lucide-react";

const RANK_BADGE_COLORS: Record<MemberRank, string> = {
  Don: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  Underboss: "bg-red-500/20 text-red-300 border-red-500/40",
  Capo: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  Soldier: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  Associate: "bg-slate-500/20 text-slate-300 border-slate-500/40",
};

export default function WeeklyDashboardView() {
  const {
    profiles,
    taxLogic,
    contributions,
    activePlayerId,
    activeWeekStart,
    baseTreasury,
    logPayment,
    toggleMemberWeekStatus,
  } = useCartelStore();

  const activeProfile =
    profiles.find((p) => p.id === activePlayerId) || profiles[0];
  const isAdmin = activeProfile.role === "Admin";

  // Standard User payment state
  const [paymentInput, setPaymentInput] = useState<string>("");
  const [receiptNote, setReceiptNote] = useState<string>("");
  const [paymentFeedback, setPaymentFeedback] = useState<string | null>(null);

  // Admin checklist filter & pagination (ensures strict <= 564px block budget with zero internal scrollbars)
  const [adminFilter, setAdminFilter] = useState<"all" | "pending" | "complete">(
    "all"
  );
  const [checklistPage, setChecklistPage] = useState(0);
  const ITEMS_PER_PAGE = 5;

  // Calculate active user's bracket & current week record
  const userBracket = calculateExpectedTax(activeProfile.level, taxLogic);
  const expectedTax = activeProfile.is_exempt ? 0 : userBracket.expected_tax;

  const userWeekRecord = contributions.find(
    (c) =>
      c.player_id === activeProfile.id && c.week_start_date === activeWeekStart
  );
  const paidThisWeek = userWeekRecord?.amount_paid || 0;
  const remainingBalance = Math.max(0, expectedTax - paidThisWeek);
  const isUserComplete = paidThisWeek >= expectedTax;

  // Next bracket preview for RPG progression insight
  const sortedBrackets = [...taxLogic].sort((a, b) => a.min_level - b.min_level);
  const nextBracket = sortedBrackets.find(
    (b) => b.min_level > activeProfile.level
  );

  const handleLogPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const numericVal = Number(paymentInput.replace(/[^0-9.]/g, ""));
    if (!numericVal || numericVal <= 0) return;

    logPayment(
      activeProfile.id,
      numericVal,
      receiptNote.trim() || "Mobile Treasury Deposit",
      "add"
    );
    setPaymentInput("");
    setReceiptNote("");
    setPaymentFeedback(
      `Deposited ${formatCartelCurrency(numericVal, true)} into the $511M+ Cartel Treasury.`
    );
    setTimeout(() => setPaymentFeedback(null), 4000);
  };

  const handleQuickPayAmount = (amount: number) => {
    setPaymentInput(String(amount));
  };

  // Build Admin Roster Checklist rows for activeWeekStart
  const checklistRows = profiles
    .map((member) => {
      const bracket = calculateExpectedTax(member.level, taxLogic);
      const memberExpected = member.is_exempt ? 0 : bracket.expected_tax;
      const rec = contributions.find(
        (c) =>
          c.player_id === member.id && c.week_start_date === activeWeekStart
      );
      const paid = rec?.amount_paid ?? 0;
      const status =
        paid >= memberExpected ? "Complete" : rec?.status || "Pending";
      const owing = Math.max(0, memberExpected - paid);
      return {
        member,
        bracket,
        memberExpected,
        paid,
        owing,
        status,
      };
    })
    .sort((a, b) => {
      // Pending balances first for rapid-action visibility
      if (a.status !== b.status) return a.status === "Pending" ? -1 : 1;
      return b.owing - a.owing;
    });

  const filteredRows = checklistRows.filter((r) => {
    if (adminFilter === "pending") return r.status === "Pending";
    if (adminFilter === "complete") return r.status === "Complete";
    return true;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / ITEMS_PER_PAGE)
  );
  const safePage = Math.min(checklistPage, totalPages - 1);
  const paginatedRows = filteredRows.slice(
    safePage * ITEMS_PER_PAGE,
    (safePage + 1) * ITEMS_PER_PAGE
  );

  const totalExpectedThisWeek = checklistRows.reduce(
    (acc, r) => acc + r.memberExpected,
    0
  );
  const totalCollectedThisWeek = checklistRows.reduce(
    (acc, r) => acc + r.paid,
    0
  );
  const pendingCount = checklistRows.filter(
    (r) => r.status === "Pending"
  ).length;

  return (
    <div className="w-full space-y-4">
      {/* BLOCK 1: Standard User & Operative Personal Tax Obligation Widget (Constrained <= 564px) */}
      <section
        aria-label="Personal Weekly Tax Obligation"
        className="w-full max-h-[564px] overflow-hidden rounded-2xl border border-cartel-border bg-cartel-card/95 p-4 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-cartel-border/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-amber-400/90 font-semibold">
                Operative Tax Dossier
              </span>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  RANK_BADGE_COLORS[activeProfile.rank]
                }`}
              >
                {activeProfile.rank}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5 flex items-center gap-2">
              {activeProfile.game_name}
              <span className="text-xs font-normal text-slate-400">
                • Week of {activeWeekStart}
              </span>
            </h2>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isUserComplete
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                : "bg-amber-500/15 text-amber-300 border-amber-500/40"
            }`}
          >
            {isUserComplete ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Complete</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Pending</span>
              </>
            )}
          </div>
        </div>

        {/* 3-Column Compact KPI Strip */}
        <div className="grid grid-cols-3 gap-2.5 my-3.5">
          <div className="rounded-xl bg-cartel-surface/90 border border-cartel-border/70 p-2.5">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider">
              Current Level
            </p>
            <p className="text-xl font-extrabold text-white mt-0.5">
              Lv. {activeProfile.level}
            </p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">
              {nextBracket
                ? `Next tier @ Lv.${nextBracket.min_level}`
                : "Apex Syndicate Tier"}
            </p>
          </div>

          <div className="rounded-xl bg-cartel-surface/90 border border-amber-500/30 p-2.5">
            <p className="text-[11px] text-amber-300/90 uppercase tracking-wider">
              Expected Tax
            </p>
            <p className="text-xl font-extrabold text-amber-400 mt-0.5">
              {formatCartelCurrency(expectedTax, true)}
            </p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">
              {userBracket.bracket_label}
            </p>
          </div>

          <div className="rounded-xl bg-cartel-surface/90 border border-cartel-border/70 p-2.5">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider">
              Balance Due
            </p>
            <p
              className={`text-xl font-extrabold mt-0.5 ${
                remainingBalance === 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {formatCartelCurrency(remainingBalance, true)}
            </p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">
              Paid: {formatCartelCurrency(paidThisWeek, true)}
            </p>
          </div>
        </div>

        {/* Secure Input Form to Log Payment into Cartel Treasury */}
        <form onSubmit={handleLogPayment} className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <label
              htmlFor="treasury-deposit-input"
              className="text-slate-300 font-medium flex items-center gap-1.5"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Log Tribute to{" "}
                <strong className="text-amber-300">
                  {formatCartelCurrency(baseTreasury, true)}
                </strong>{" "}
                Cartel Treasury
              </span>
            </label>
            {remainingBalance > 0 && (
              <button
                type="button"
                onClick={() => handleQuickPayAmount(remainingBalance)}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium"
              >
                Fill Remaining ({formatCartelCurrency(remainingBalance, true)})
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">
                $
              </span>
              <input
                id="treasury-deposit-input"
                type="number"
                min={1}
                step="any"
                value={paymentInput}
                onChange={(e) => setPaymentInput(e.target.value)}
                placeholder={
                  remainingBalance > 0
                    ? `${remainingBalance}`
                    : `${expectedTax || 4000000}`
                }
                className="w-full rounded-xl bg-cartel-bg border border-cartel-border focus:border-amber-400 focus:outline-none pl-7 pr-3 py-2.5 text-sm text-white placeholder-slate-500"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 py-2.5 text-xs uppercase tracking-wider transition flex items-center gap-1 shadow-lg shadow-amber-500/10 cursor-pointer"
            >
              <span>Log Tribute</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[1_000_000, 2_000_000, 4_000_000, 7_000_000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleQuickPayAmount(preset)}
                  className="text-[11px] px-2 py-1 rounded-lg bg-cartel-surface hover:bg-slate-800 text-slate-300 border border-cartel-border/80 transition cursor-pointer"
                >
                  +{formatCartelCurrency(preset, true)}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={receiptNote}
              onChange={(e) => setReceiptNote(e.target.value)}
              placeholder="Optional note (e.g. Turf heist)"
              className="w-40 sm:w-48 rounded-lg bg-cartel-bg/70 border border-cartel-border/70 px-2.5 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400/60"
            />
          </div>

          {paymentFeedback && (
            <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{paymentFeedback}</span>
            </div>
          )}
        </form>
      </section>

      {/* BLOCK 2: Admin Rapid-Action Checklist (Don / Underboss View, Constrained <= 564px) */}
      {isAdmin ? (
        <section
          aria-label="Admin Rapid-Action Member Checklist"
          className="w-full max-h-[564px] overflow-hidden rounded-2xl border border-amber-500/30 bg-cartel-card/95 p-4 shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-cartel-border pb-2.5">
              <div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Don / Underboss Rapid-Action Checklist
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Collected{" "}
                  <strong className="text-emerald-400">
                    {formatCartelCurrency(totalCollectedThisWeek, true)}
                  </strong>{" "}
                  of {formatCartelCurrency(totalExpectedThisWeek, true)} •{" "}
                  <strong className="text-rose-400">
                    {pendingCount} Pending
                  </strong>
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-cartel-surface p-1 rounded-xl border border-cartel-border">
                {(["all", "pending", "complete"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      setAdminFilter(f);
                      setChecklistPage(0);
                    }}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold capitalize transition cursor-pointer ${
                      adminFilter === f
                        ? "bg-amber-500 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Member Rows (Max 5 per page so block height never exceeds 564px or creates internal scroll) */}
            <div className="divide-y divide-cartel-border/60 my-2">
              {paginatedRows.map(
                ({ member, memberExpected, paid, owing, status }) => {
                  const isPending = status === "Pending";
                  return (
                    <div
                      key={member.id}
                      className={`py-2.5 px-2 flex items-center justify-between gap-2 rounded-lg transition ${
                        isPending ? "bg-rose-950/20" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-white truncate">
                            {member.game_name}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded border ${
                              RANK_BADGE_COLORS[member.rank]
                            }`}
                          >
                            {member.rank}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Lv.{member.level}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>
                            Paid:{" "}
                            <strong className="text-slate-200">
                              {formatCartelCurrency(paid, true)}
                            </strong>{" "}
                            / {formatCartelCurrency(memberExpected, true)}
                          </span>
                          {owing > 0 && (
                            <span className="text-rose-400 font-medium">
                              (Owes {formatCartelCurrency(owing, true)})
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleMemberWeekStatus(member.id)}
                        className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                          isPending
                            ? "bg-rose-500/15 hover:bg-emerald-500/20 text-rose-300 hover:text-emerald-300 border-rose-500/40"
                            : "bg-emerald-500/15 hover:bg-slate-800 text-emerald-300 border-emerald-500/40"
                        }`}
                      >
                        {isPending ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Mark Paid</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Pagination Bar */}
          <div className="flex items-center justify-between border-t border-cartel-border pt-2.5 text-xs text-slate-400">
            <span>
              Showing {safePage * ITEMS_PER_PAGE + 1}–
              {Math.min((safePage + 1) * ITEMS_PER_PAGE, filteredRows.length)}{" "}
              of {filteredRows.length} members
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage === 0}
                onClick={() => setChecklistPage((p) => Math.max(0, p - 1))}
                className="p-1.5 rounded-lg bg-cartel-surface border border-cartel-border disabled:opacity-40 text-slate-200 hover:border-amber-400/50 cursor-pointer"
                aria-label="Previous checklist page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-slate-300 font-semibold px-1">
                {safePage + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages - 1}
                onClick={() =>
                  setChecklistPage((p) => Math.min(totalPages - 1, p + 1))
                }
                className="p-1.5 rounded-lg bg-cartel-surface border border-cartel-border disabled:opacity-40 text-slate-200 hover:border-amber-400/50 cursor-pointer"
                aria-label="Next checklist page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      ) : (
        /* Standard User RLS Notice & Personal Recent History Card (<= 564px) */
        <section
          aria-label="Row Level Security Personal Ledger"
          className="w-full max-h-[564px] overflow-hidden rounded-2xl border border-cartel-border bg-cartel-card/90 p-4 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-cartel-border pb-2.5">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Personal Tribute Ledger (Firestore Security Isolated)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              Role: Standard User
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Per Vinciguerra Lupo Cartel Cloud Firestore Security Rules,
            standard operatives only view their personal tax obligations and
            tribute receipts. Switch to <strong className="text-amber-300">Wolfie05 (Don)</strong> or{" "}
            <strong className="text-amber-300">VexValerius (Underboss)</strong> in
            the top bar to inspect the Admin Rapid-Action Checklist.
          </p>

          <div className="mt-3 space-y-2">
            {contributions
              .filter((c) => c.player_id === activeProfile.id)
              .slice(0, 3)
              .map((rec) => (
                <div
                  key={rec.record_id}
                  className="flex items-center justify-between rounded-xl bg-cartel-surface/80 border border-cartel-border/70 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-200">
                      Week of {rec.week_start_date}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {rec.receipt_note || "Standard Weekly Tribute"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-300">
                      {formatCartelCurrency(rec.amount_paid, true)}
                    </p>
                    <span
                      className={`text-[10px] font-semibold ${
                        rec.status === "Complete"
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
