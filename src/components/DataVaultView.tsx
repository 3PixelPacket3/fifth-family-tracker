"use client";

import React, { useState } from "react";
import {
  useCartelStore,
  calculateMemberExpectedTax,
  formatCartelCurrency,
  MemberRank,
} from "@/store/useCartelStore";
import {
  saveProfileToCloud,
  saveContributionToCloud,
} from "@/lib/firebase";
import {
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
} from "lucide-react";

interface DataVaultViewProps {
  isAdminOrDon: boolean;
}

export default function DataVaultView({ isAdminOrDon }: DataVaultViewProps) {
  const {
    profiles,
    taxLogic,
    contributions,
    activeWeekStart,
  } = useCartelStore();

  const approvedProfiles = profiles.filter(
    (p) => p.approval_status === "approved" && p.rank !== "App Developer"
  );

  const [selectedMonth, setSelectedMonth] = useState(
    activeWeekStart.slice(0, 7) || "2026-10"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [vaultPage, setVaultPage] = useState(0);
  const ROWS_PER_PAGE = 5;

  const [csvText, setCsvText] = useState("");
  const [suffixFormulaCopied, setSuffixFormulaCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const analyticalRows = approvedProfiles
    .filter((p) =>
      p.game_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .map((member) => {
      const { expected_tax } = calculateMemberExpectedTax(member, taxLogic);
      const memberContribs = contributions.filter(
        (c) => c.player_id === member.id
      );

      const totalOverall = memberContribs.reduce(
        (sum, c) => sum + c.amount_paid,
        0
      );

      const monthlyRollup = memberContribs
        .filter((c) => c.week_start_date.startsWith(selectedMonth))
        .reduce((sum, c) => sum + c.amount_paid, 0);

      const activeWeekRec = memberContribs.find(
        (c) => c.week_start_date === activeWeekStart
      );

      return {
        member,
        expectedTax: expected_tax,
        totalOverall,
        monthlyRollup,
        activeWeekPaid: activeWeekRec?.amount_paid,
        activeWeekStatus: activeWeekRec?.status,
      };
    })
    .sort((a, b) => b.totalOverall - a.totalOverall);

  const totalPages = Math.max(
    1,
    Math.ceil(analyticalRows.length / ROWS_PER_PAGE)
  );
  const safePage = Math.min(vaultPage, totalPages - 1);
  const visibleRows = analyticalRows.slice(
    safePage * ROWS_PER_PAGE,
    (safePage + 1) * ROWS_PER_PAGE
  );

  // Blank-Safe CSV Export (Admin & Don only)
  const handleExportCSV = () => {
    if (!isAdminOrDon) return;
    const headers = [
      "game_name",
      "rank",
      "level",
      "expected_tax",
      "active_week_paid",
      "active_week_status",
      "monthly_rollup",
      "total_overall",
    ];

    const escapeCsvField = (val: unknown): string => {
      if (val === null || val === undefined || val === "") {
        return "";
      }
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines = [
      headers.join(","),
      ...analyticalRows.map((row) =>
        [
          escapeCsvField(row.member.game_name),
          escapeCsvField(row.member.rank),
          escapeCsvField(row.member.level),
          escapeCsvField(row.expectedTax),
          escapeCsvField(
            row.activeWeekPaid !== undefined ? row.activeWeekPaid : ""
          ),
          escapeCsvField(row.activeWeekStatus ?? ""),
          escapeCsvField(row.monthlyRollup),
          escapeCsvField(row.totalOverall),
        ].join(",")
      ),
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fifth_family_vault_${activeWeekStart}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSV Bulk Import (Admin & Don only)
  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminOrDon || !csvText.trim()) return;

    const rawLines = csvText
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (rawLines.length === 0) return;

    const firstLower = rawLines[0].toLowerCase();
    const startIdx =
      firstLower.includes("game_name") || firstLower.includes("name") ? 1 : 0;

    let createdCount = 0;
    let paymentCount = 0;

    for (const line of rawLines.slice(startIdx)) {
      const cols = line.split(",").map((c) => c.trim());
      const game_name = cols[0] || "";
      if (!game_name) continue;

      const validRanks: MemberRank[] = [
        "Don",
        "Underboss",
        "Capo",
        "Soldier",
        "Associate",
      ];
      const rank: MemberRank = validRanks.includes(cols[1] as MemberRank)
        ? (cols[1] as MemberRank)
        : "Soldier";
      const level = cols[2] ? parseInt(cols[2], 10) || 50 : 50;
      const amount_paid =
        cols[3] !== undefined && cols[3] !== ""
          ? parseFloat(cols[3].replace(/[^0-9.]/g, ""))
          : undefined;
      const week_start = cols[4] || activeWeekStart;

      let member = useCartelStore
        .getState()
        .profiles.find(
          (p) => p.game_name.toLowerCase() === game_name.toLowerCase()
        );

      if (!member) {
        member = {
          id: `member_csv_${Date.now()}_${createdCount}`,
          game_name,
          rank,
          level,
          role: rank === "Don" ? "Admin" : "User",
          approval_status: "approved",
          joined_at: new Date().toISOString().slice(0, 10),
        };
        await saveProfileToCloud(member);
        createdCount++;
      }

      if (amount_paid !== undefined && !Number.isNaN(amount_paid)) {
        const saved = useCartelStore
          .getState()
          .logPaymentLocal(member.id, amount_paid, "CSV Import", "set");
        if (saved) {
          await saveContributionToCloud({
            ...saved,
            week_start_date: week_start,
          });
          paymentCount++;
        }
      }
    }

    setImportStatus(
      `Imported ${createdCount} members and ${paymentCount} payment records.`
    );
    setCsvText("");
    setTimeout(() => setImportStatus(null), 4000);
  };

  const copySpreadsheetFormula = () => {
    navigator.clipboard.writeText('=A2&"-1"');
    setSuffixFormulaCopied(true);
    setTimeout(() => setSuffixFormulaCopied(false), 2500);
  };

  const grandTotalOverall = analyticalRows.reduce(
    (s, r) => s + r.totalOverall,
    0
  );
  const grandMonthlyTotal = analyticalRows.reduce(
    (s, r) => s + r.monthlyRollup,
    0
  );

  return (
    <div className="w-full space-y-4">
      {/* BLOCK 1: Data Vault Ledger (<= 564px, View-Only for Standard Members) */}
      <section className="w-full max-h-[564px] overflow-hidden rounded-2xl border border-cartel-border bg-cartel-card p-4 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cartel-border pb-2.5">
            <div>
              <div className="flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Data Vault — Monthly &amp; Total Overall Ledger
                </h2>
                {!isAdminOrDon && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-cartel-border">
                    <Eye className="w-3 h-3 text-amber-400" />
                    <span>View Only</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Month ({selectedMonth}):{" "}
                <strong className="text-emerald-400">
                  {formatCartelCurrency(grandMonthlyTotal, true)}
                </strong>{" "}
                • Total Overall:{" "}
                <strong className="text-amber-300">
                  {formatCartelCurrency(grandTotalOverall, true)}
                </strong>
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVaultPage(0);
                  }}
                  placeholder="Filter..."
                  className="w-28 sm:w-36 rounded-xl bg-cartel-surface border border-cartel-border pl-7 pr-2.5 py-1 text-xs text-white placeholder-slate-500"
                />
              </div>

              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-xl bg-cartel-surface border border-cartel-border px-2 py-1 text-xs text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 pt-2.5 pb-1 border-b border-cartel-border/60">
            <div className="col-span-4">Member</div>
            <div className="col-span-2 text-right">Tax Rate</div>
            <div className="col-span-3 text-right">Monthly</div>
            <div className="col-span-3 text-right">Total Paid</div>
          </div>

          {visibleRows.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No member records in the Data Vault yet.
            </div>
          ) : (
            <div className="divide-y divide-cartel-border/50 my-1">
              {visibleRows.map((row) => (
                <div
                  key={row.member.id}
                  className="grid grid-cols-12 gap-1 items-center px-2 py-2.5 text-xs"
                >
                  <div className="col-span-4 min-w-0">
                    <p className="font-bold text-white truncate">
                      {row.member.game_name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {row.member.rank} • Lv.{row.member.level}
                    </p>
                  </div>
                  <div className="col-span-2 text-right text-slate-300">
                    {formatCartelCurrency(row.expectedTax, true)}
                  </div>
                  <div className="col-span-3 text-right font-semibold text-emerald-400">
                    {formatCartelCurrency(row.monthlyRollup, true)}
                  </div>
                  <div className="col-span-3 text-right font-extrabold text-amber-300">
                    {formatCartelCurrency(row.totalOverall, true)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-cartel-border pt-2.5 gap-2">
          {isAdminOrDon ? (
            <button
              type="button"
              onClick={handleExportCSV}
              className="rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">
              Showing {visibleRows.length} of {analyticalRows.length} family members
            </span>
          )}

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setVaultPage((p) => Math.max(0, p - 1))}
              className="p-1.5 rounded-lg bg-cartel-surface border border-cartel-border disabled:opacity-40 text-slate-200 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-semibold text-slate-300">
              {safePage + 1}/{totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages - 1}
              onClick={() =>
                setVaultPage((p) => Math.min(totalPages - 1, p + 1))
              }
              className="p-1.5 rounded-lg bg-cartel-surface border border-cartel-border disabled:opacity-40 text-slate-200 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* BLOCK 2: CSV Bulk Load (Strictly Admin / App Developer & Don Only) */}
      {isAdminOrDon && (
        <section className="w-full max-h-[564px] overflow-hidden rounded-2xl border border-cartel-border bg-cartel-card p-4 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between border-b border-cartel-border pb-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                CSV Bulk Load &amp; Spreadsheet Suffix Helper
              </h3>
            </div>
            <button
              type="button"
              onClick={copySpreadsheetFormula}
              className="rounded-lg bg-cartel-surface border border-cartel-border px-2.5 py-1 text-[11px] font-mono text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              {suffixFormulaCopied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Copied =A2&amp;&apos;-1&apos;</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>=A2&amp;&apos;-1&apos;</span>
                </>
              )}
            </button>
          </div>

          <form onSubmit={handleBulkImport} className="space-y-2">
            <textarea
              rows={3}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`game_name,rank,level,amount_paid\nMemberName,Soldier,55,4000000`}
              className="w-full rounded-xl bg-cartel-bg border border-cartel-border p-2.5 text-xs font-mono text-slate-200 placeholder-slate-500"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-1.5 text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV Rows</span>
              </button>
            </div>
          </form>

          {importStatus && (
            <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-300">
              {importStatus}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
