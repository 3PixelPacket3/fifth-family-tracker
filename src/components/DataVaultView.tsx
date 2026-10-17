"use client";

import React, { useState } from "react";
import {
  useCartelStore,
  calculateExpectedTax,
  formatCartelCurrency,
  MemberRank,
} from "@/store/useCartelStore";
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
  CalendarRange,
} from "lucide-react";

export default function DataVaultView() {
  const {
    profiles,
    taxLogic,
    contributions,
    activeWeekStart,
    bulkImportRecords,
  } = useCartelStore();

  const [selectedMonth, setSelectedMonth] = useState<"2026-10" | "2026-09">(
    "2026-10"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [vaultPage, setVaultPage] = useState(0);
  const ROWS_PER_PAGE = 5;

  // CSV Import & Helper state
  const [csvText, setCsvText] = useState("");
  const [suffixFormulaCopied, setSuffixFormulaCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const monthLabel =
    selectedMonth === "2026-10"
      ? "Month of October, 2026"
      : "Month of September, 2026";

  // Build Analytical Roster rows with Total Overall + Monthly Roll-up + Active Week
  const analyticalRows = profiles
    .filter((p) =>
      p.game_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .map((member) => {
      const bracket = calculateExpectedTax(member.level, taxLogic);
      const expectedTax = member.is_exempt ? 0 : bracket.expected_tax;

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
        expectedTax,
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

  // CSV Export: Strictly leaves unavailable fields completely blank ("") to prevent DB rendering errors
  const handleExportCSV = () => {
    const headers = [
      "game_name",
      "rank",
      "level",
      "expected_tax",
      "active_week_paid",
      "active_week_status",
      "monthly_rollup_oct_2026",
      "total_overall",
      "discord_handle",
      "exempt_reason",
    ];

    const escapeCsvField = (val: unknown): string => {
      if (val === null || val === undefined || val === "") {
        return ""; // Leave unavailable fields strictly blank
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
          escapeCsvField(row.member.discord_handle ?? ""),
          escapeCsvField(row.member.exempt_reason ?? ""),
        ].join(",")
      ),
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vinciguerra_lupo_vault_${activeWeekStart}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSV Bulk Load Parser (accommodates blank fields & suffixed names like Wolfie05-1)
  const handleBulkImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    const rawLines = csvText
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (rawLines.length === 0) return;

    // Detect if first line is header
    const firstLower = rawLines[0].toLowerCase();
    const startIdx =
      firstLower.includes("game_name") || firstLower.includes("name") ? 1 : 0;

    const parsedRows = rawLines.slice(startIdx).map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      // Format: game_name, rank (optional), level (optional), amount_paid (optional), week_start_date (optional)
      const game_name = cols[0] || "";
      const rankCandidate = cols[1] as MemberRank | undefined;
      const validRanks: MemberRank[] = [
        "Don",
        "Underboss",
        "Capo",
        "Soldier",
        "Associate",
      ];
      const rank = validRanks.includes(rankCandidate as MemberRank)
        ? (rankCandidate as MemberRank)
        : undefined;
      const level = cols[2] ? parseInt(cols[2], 10) : undefined;
      const amount_paid =
        cols[3] !== undefined && cols[3] !== ""
          ? parseFloat(cols[3].replace(/[^0-9.]/g, ""))
          : undefined;
      const week_start_date = cols[4] || undefined;

      return {
        game_name,
        rank,
        level: Number.isNaN(level) ? undefined : level,
        amount_paid: Number.isNaN(amount_paid) ? undefined : amount_paid,
        week_start_date,
      };
    });

    const result = bulkImportRecords(parsedRows);
    setImportStatus(
      `Imported ${result.imported} records (${result.createdProfiles} new roster profiles). Unavailable fields kept blank.`
    );
    setCsvText("");
    setTimeout(() => setImportStatus(null), 5000);
  };

  const copySpreadsheetFormula = () => {
    navigator.clipboard.writeText("=A2&\"-1\"");
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
      {/* BLOCK 1: Comprehensive Analytical Roster & Monthly Roll-Up Table (<= 564px) */}
      <section
        aria-label="Data Vault Analytical Roster"
        className="w-full max-h-[564px] overflow-hidden rounded-2xl border border-cartel-border bg-cartel-card/95 p-4 shadow-xl flex flex-col justify-between"
      >
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cartel-border pb-2.5">
            <div>
              <div className="flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  The Data Vault — Full Roster & Historical Roll-Ups
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {monthLabel}:{" "}
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
                  placeholder="Filter operative..."
                  className="w-32 sm:w-40 rounded-xl bg-cartel-surface border border-cartel-border pl-7 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <select
                aria-label="Select Monthly Roll-Up Period"
                value={selectedMonth}
                onChange={(e) =>
                  setSelectedMonth(e.target.value as "2026-10" | "2026-09")
                }
                className="rounded-xl bg-cartel-surface border border-cartel-border px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="2026-10">Oct 2026</option>
                <option value="2026-09">Sep 2026</option>
              </select>
            </div>
          </div>

          {/* Analytical Table Header */}
          <div className="grid grid-cols-12 gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 pt-2.5 pb-1 border-b border-cartel-border/60">
            <div className="col-span-4">Member / Rank</div>
            <div className="col-span-2 text-right">Expected</div>
            <div className="col-span-3 text-right">
              {selectedMonth === "2026-10" ? "Oct '26 Rollup" : "Sep '26 Rollup"}
            </div>
            <div className="col-span-3 text-right">Total Overall</div>
          </div>

          {/* Analytical Rows (5 per page to guarantee zero internal scrollbars & <= 564px height) */}
          <div className="divide-y divide-cartel-border/50 my-1">
            {visibleRows.map((row) => (
              <div
                key={row.member.id}
                className="grid grid-cols-12 gap-1 items-center px-2 py-2.5 text-xs hover:bg-cartel-surface/50 rounded-lg transition"
              >
                <div className="col-span-4 min-w-0">
                  <p className="font-bold text-white truncate">
                    {row.member.game_name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {row.member.rank} • Lv.{row.member.level}
                  </p>
                </div>
                <div className="col-span-2 text-right font-medium text-slate-300">
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
        </div>

        {/* Footer Pagination & Clean CSV Export */}
        <div className="flex items-center justify-between border-t border-cartel-border pt-2.5 gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Vault CSV (Blank-Safe)</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setVaultPage((p) => Math.max(0, p - 1))}
              className="p-1.5 rounded-lg bg-cartel-surface border border-cartel-border disabled:opacity-40 text-slate-200 cursor-pointer"
              aria-label="Previous vault page"
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
              aria-label="Next vault page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* BLOCK 2: CSV Bulk Load & Spreadsheet Suffixing Utility (<= 564px) */}
      <section
        aria-label="CSV Conversion and Bulk Load Engine"
        className="w-full max-h-[564px] overflow-hidden rounded-2xl border border-cartel-border bg-cartel-card/95 p-4 shadow-xl space-y-3"
      >
        <div className="flex items-center justify-between border-b border-cartel-border pb-2.5">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Google Sheet Migration & CSV Bulk Load
              </h3>
              <p className="text-[11px] text-slate-400">
                Unavailable fields remain strictly blank (`&quot;&quot;`) to prevent DB rendering errors
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={copySpreadsheetFormula}
            className="rounded-xl bg-cartel-surface hover:bg-slate-800 border border-cartel-border px-2.5 py-1.5 text-[11px] font-mono text-amber-300 flex items-center gap-1.5 cursor-pointer"
            title="Copy standard spreadsheet suffix helper formula"
          >
            {suffixFormulaCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied =A2&amp;&apos;-1&apos;</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Helper: =A2&amp;&apos;-1&apos;</span>
              </>
            )}
          </button>
        </div>

        <div className="rounded-xl bg-cartel-surface/80 border border-cartel-border/80 p-2.5 text-[11px] text-slate-300 leading-relaxed">
          <strong className="text-amber-300">Suffixing & Paste Special Protocol:</strong>{" "}
          When migrating duplicate operative aliases or secondary cartel alts from Google Sheets, use{" "}
          <code className="text-amber-200 bg-cartel-bg px-1.5 py-0.5 rounded">
            =A2&amp;&apos;-1&apos;
          </code>{" "}
          and resolve via <strong>Paste Special → Values</strong> prior to bulk loading below.
        </div>

        <form onSubmit={handleBulkImport} className="space-y-2.5">
          <textarea
            rows={3}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`game_name,rank,level,amount_paid,week_start_date\nWolfie05-1,Soldier,55,4000000,2026-10-11\nVitoScaletta,Capo,68,,2026-10-11`}
            className="w-full rounded-xl bg-cartel-bg border border-cartel-border p-2.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() =>
                setCsvText(
                  "Wolfie05-1,Soldier,54,4000000,2026-10-11\nMarcoLupo,Associate,35,,2026-10-11"
                )
              }
              className="text-[11px] text-slate-400 hover:text-amber-300 underline cursor-pointer"
            >
              Load Sample Suffixed CSV Rows
            </button>

            <button
              type="submit"
              className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Execute Bulk Load</span>
            </button>
          </div>
        </form>

        {importStatus && (
          <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-300">
            {importStatus}
          </div>
        )}
      </section>
    </div>
  );
}
