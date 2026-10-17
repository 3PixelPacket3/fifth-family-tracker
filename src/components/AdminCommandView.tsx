"use client";

import React, { useState } from "react";
import {
  useCartelStore,
  formatCartelCurrency,
  MemberRank,
  ConfigurableRank,
  RankPermissionSet,
  Profile,
  MASTER_ADMIN_EMAIL,
  DEFAULT_DON_EMAIL,
} from "@/store/useCartelStore";
import {
  saveProfileToCloud,
  deleteProfileFromCloud,
  saveMetaToCloud,
  saveTaxBracketToCloud,
  deleteTaxBracketFromCloud,
} from "@/lib/firebase";
import {
  UserCheck,
  UserX,
  Code2,
  CalendarSync,
  Sliders,
  Crown,
  Sparkles,
  Link2,
  Shield,
  Trash2,
  Pencil,
} from "lucide-react";

interface AdminCommandViewProps {
  isMasterAdmin: boolean;
  permissions: RankPermissionSet & { isFullCommand: boolean };
}

const CONFIGURABLE_RANKS: ConfigurableRank[] = [
  "Underboss",
  "Capo",
  "Soldier",
  "Associate",
];

export default function AdminCommandView({
  isMasterAdmin,
  permissions,
}: AdminCommandViewProps) {
  const {
    profiles,
    taxLogic,
    activeWeekStart,
    baseTreasury,
    welcomeHtml,
    rankPermissions,
  } = useCartelStore();

  const isFullCommand = permissions.isFullCommand; // App Developer or Don

  const pendingAccounts = profiles.filter(
    (p) => p.approval_status === "pending"
  );
  const approvedMembers = profiles.filter(
    (p) => p.approval_status === "approved" && p.rank !== "App Developer"
  );

  // Track which existing created roster profile to link a pending online signup to
  const [linkSelections, setLinkSelections] = useState<Record<string, string>>(
    {}
  );

  // Rank Permissions Selector State (Available to App Developer & Don)
  const [selectedRankToConfig, setSelectedRankToConfig] =
    useState<ConfigurableRank>("Underboss");

  // Welcome Message Custom HTML/CSS State (Strictly App Developer oharajoshua333@gmail.com only)
  const [customWelcomeCode, setCustomWelcomeCode] = useState(welcomeHtml);
  const [welcomeSaved, setWelcomeSaved] = useState(false);

  // Week Rollover, Treasury & Level Tax Bracket Settings (Add / Edit / Remove)
  const [newWeekDate, setNewWeekDate] = useState(activeWeekStart);
  const [treasuryInput, setTreasuryInput] = useState(String(baseTreasury));
  const [editingBracketMinLevel, setEditingBracketMinLevel] = useState<
    number | null
  >(null);
  const [bracketLevel, setBracketLevel] = useState("50");
  const [bracketAmount, setBracketAmount] = useState("4000000");

  // Individual Member Tax Assignment
  const [selectedMemberForTax, setSelectedMemberForTax] = useState("");
  const [memberTaxValue, setMemberTaxValue] = useState("");

  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Toggle a specific permission for a rank (App Developer & Don only)
  const handleToggleRankPermission = async (
    rank: ConfigurableRank,
    key: keyof RankPermissionSet
  ) => {
    if (!isFullCommand) return;
    const currentRankPerms = rankPermissions[rank];
    const updatedMap = {
      ...rankPermissions,
      [rank]: {
        ...currentRankPerms,
        [key]: !currentRankPerms[key],
      },
    };
    await saveMetaToCloud({ rankPermissions: updatedMap });
    showToast(`Updated ${rank} permissions.`);
  };

  // Approve Pending Online Account & Optionally Link/Assign to an Existing Created Roster Member
  const handleApproveUser = async (
    pendingAcct: Profile,
    assignRank: MemberRank = "Soldier"
  ) => {
    if (!isFullCommand && !permissions.manageMembers) return;
    const linkedRosterId = linkSelections[pendingAcct.id] || "";

    if (linkedRosterId) {
      const existingMember = approvedMembers.find(
        (m) => m.id === linkedRosterId
      );
      if (existingMember) {
        const mergedMember: Profile = {
          ...existingMember,
          uid: pendingAcct.uid || pendingAcct.id,
          email: pendingAcct.email || existingMember.email,
          rank: assignRank === "Don" ? "Don" : existingMember.rank,
          role:
            assignRank === "Don" || existingMember.rank === "Don"
              ? "Admin"
              : "User",
          approval_status: "approved",
        };
        await saveProfileToCloud(mergedMember);
        if (pendingAcct.id !== existingMember.id) {
          await deleteProfileFromCloud(pendingAcct.id);
          await saveProfileToCloud({
            ...mergedMember,
            id: pendingAcct.id,
            linked_member_id: existingMember.id,
          });
        }
        showToast(
          `Assigned ${
            pendingAcct.email || pendingAcct.game_name
          } to roster member ${existingMember.game_name}!`
        );
        return;
      }
    }

    const updated: Profile = {
      ...pendingAcct,
      rank: assignRank,
      role: assignRank === "Don" ? "Admin" : "User",
      approval_status: "approved",
    };
    await saveProfileToCloud(updated);
    showToast(`Approved ${pendingAcct.game_name} (${assignRank}).`);
  };

  const handleRejectUser = async (profile: Profile) => {
    if (!isFullCommand && !permissions.manageMembers) return;
    await deleteProfileFromCloud(profile.id);
    showToast(`Declined and removed request from ${profile.game_name}.`);
  };

  // Appoint or Change the Family Don from existing approved members
  const handleSetDon = async (memberId: string) => {
    if (!isMasterAdmin) return;
    const target = approvedMembers.find((m) => m.id === memberId);
    if (!target) return;
    await saveProfileToCloud({
      ...target,
      rank: "Don",
      role: "Admin",
    });
    showToast(`${target.game_name} has been appointed as Family Don.`);
  };

  // Set Tax Rate for Individual Member
  const handleAssignMemberTax = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.manageIndividualTax || !selectedMemberForTax) return;
    const target = approvedMembers.find((m) => m.id === selectedMemberForTax);
    if (!target) return;

    const customTaxVal =
      memberTaxValue.trim() !== ""
        ? Math.max(0, parseFloat(memberTaxValue) || 0)
        : null;

    await saveProfileToCloud({
      ...target,
      custom_tax_override: customTaxVal,
    });
    showToast(
      customTaxVal !== null
        ? `Set ${target.game_name}'s tax rate to ${formatCartelCurrency(
            customTaxVal,
            true
          )}.`
        : `Reset ${target.game_name} to automatic Level Bracket tax.`
    );
    setMemberTaxValue("");
  };

  // Save Custom HTML/CSS Welcome Banner (Strictly App Developer oharajoshua333@gmail.com only)
  const handleSaveWelcomeHtml = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMasterAdmin) return;
    await saveMetaToCloud({ welcomeHtml: customWelcomeCode });
    setWelcomeSaved(true);
    setTimeout(() => setWelcomeSaved(false), 3000);
  };

  const handleSaveCycleAndTreasury = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.manageRolloverTreasury) return;
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

  // Add or Update Level Tax Bracket
  const handleSaveBracket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.manageTaxBrackets) return;
    const minLvl = Math.max(1, parseInt(bracketLevel, 10) || 1);
    const amt = Math.max(0, parseFloat(bracketAmount) || 0);
    await saveTaxBracketToCloud(
      {
        min_level: minLvl,
        expected_tax: amt,
        bracket_label: `Lv ${minLvl}+ (${formatCartelCurrency(amt, true)})`,
      },
      editingBracketMinLevel ?? undefined
    );
    setEditingBracketMinLevel(null);
    showToast(
      `Saved Level Bracket: Lv.${minLvl}+ -> ${formatCartelCurrency(amt, true)}`
    );
  };

  // Delete Level Tax Bracket
  const handleDeleteBracket = async (minLvl: number) => {
    if (!permissions.manageTaxBrackets) return;
    if (taxLogic.length <= 1) {
      showToast("At least one base tax bracket must remain.");
      return;
    }
    await deleteTaxBracketFromCloud(minLvl);
    if (editingBracketMinLevel === minLvl) {
      setEditingBracketMinLevel(null);
    }
    showToast(`Removed Lv.${minLvl}+ tax bracket.`);
  };

  const selectBracketForEdit = (minLvl: number, expectedTax: number) => {
    setEditingBracketMinLevel(minLvl);
    setBracketLevel(String(minLvl));
    setBracketAmount(String(expectedTax));
  };

  const hasAnyCommandPermission =
    isFullCommand ||
    permissions.manageMembers ||
    permissions.manageRolloverTreasury ||
    permissions.manageTaxBrackets ||
    permissions.manageIndividualTax;

  if (!hasAnyCommandPermission) {
    return (
      <div className="rounded-2xl border border-cartel-border bg-cartel-card p-6 text-center space-y-2">
        <Crown className="w-7 h-7 text-amber-400 mx-auto" />
        <h2 className="text-sm font-bold text-white uppercase">
          Command &amp; Permissions Area
        </h2>
        <p className="text-xs text-slate-400">
          Your rank does not currently have administrative permissions enabled.
        </p>
      </div>
    );
  }

  const activeConfigPerms = rankPermissions[selectedRankToConfig];

  return (
    <div className="w-full space-y-4">
      {toast && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-3.5 py-2 text-xs text-emerald-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* BLOCK 1: Rank Permissions Matrix (App Developer & Don Only, <= 564px) */}
      {isFullCommand && (
        <section className="w-full max-h-[564px] overflow-hidden rounded-2xl border border-amber-500/40 bg-cartel-card p-4 shadow-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cartel-border pb-2.5">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Rank Permissions Delegation (Don &amp; App Developer)
                </h2>
                <p className="text-[11px] text-slate-400">
                  Default Don: <span className="text-amber-300">{DEFAULT_DON_EMAIL}</span> • App Dev: <span className="text-emerald-300">{MASTER_ADMIN_EMAIL}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-cartel-surface p-1 rounded-xl border border-cartel-border">
              {CONFIGURABLE_RANKS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRankToConfig(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    selectedRankToConfig === r
                      ? "bg-amber-500 text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(
              [
                {
                  key: "manageMembers",
                  title: "Add / Edit / Remove Members & Log Pay",
                  desc: "Add or remove roster members, change ranks, and log payments",
                },
                {
                  key: "manageRolloverTreasury",
                  title: "Week Rollover & Treasury",
                  desc: "Advance active week date and adjust Cartel Treasury balance",
                },
                {
                  key: "manageTaxBrackets",
                  title: "Level Tax Brackets",
                  desc: "Add, edit, or remove automatic level-to-tax brackets",
                },
                {
                  key: "manageIndividualTax",
                  title: "Set Tax Rate for Individual Member",
                  desc: "Set custom tax overrides for specific members",
                },
              ] as const
            ).map((item) => {
              const enabled = activeConfigPerms[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    handleToggleRankPermission(selectedRankToConfig, item.key)
                  }
                  className={`p-2.5 rounded-xl border text-left transition flex items-start justify-between gap-2 cursor-pointer ${
                    enabled
                      ? "bg-emerald-500/15 border-emerald-500/40 text-white"
                      : "bg-cartel-surface/80 border-cartel-border text-slate-400"
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">{item.title}</p>
                    <p className="text-[10px] text-slate-400 leading-snug">
                      {item.desc}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      enabled
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {enabled ? "ON" : "OFF"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* BLOCK 2: Account Approvals, Profile Assignment & Don Appointment (<= 564px) */}
      {(isFullCommand || permissions.manageMembers) && (
        <section className="w-full max-h-[564px] overflow-hidden rounded-2xl border border-cartel-border bg-cartel-card p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-cartel-border pb-2.5">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                  Account Approvals &amp; Roster Profile Assignment
                </h2>
                <p className="text-[11px] text-slate-400">
                  Approve new signups or link them to an existing created member
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {pendingAccounts.length} Pending
            </span>
          </div>

          {pendingAccounts.length === 0 ? (
            <div className="py-3 text-xs text-slate-400 text-center bg-cartel-surface/60 rounded-xl border border-cartel-border/60">
              No pending account signups waiting for review.
            </div>
          ) : (
            <div className="space-y-2">
              {pendingAccounts.slice(0, 3).map((acct) => (
                <div
                  key={acct.id}
                  className="rounded-xl bg-cartel-surface border border-amber-500/30 p-2.5 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-white">
                        {acct.game_name}{" "}
                        <span className="text-amber-300 font-normal">
                          (Lv.{acct.level})
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400">{acct.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRejectUser(acct)}
                      className="p-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-pointer"
                      title="Reject Account"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-cartel-border/60">
                    <div className="flex items-center gap-1 flex-1 min-w-[160px]">
                      <Link2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <select
                        value={linkSelections[acct.id] || ""}
                        onChange={(e) =>
                          setLinkSelections((prev) => ({
                            ...prev,
                            [acct.id]: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg bg-cartel-bg border border-cartel-border px-2 py-1 text-[11px] text-slate-200"
                      >
                        <option value="">
                          Create as new member ({acct.game_name})
                        </option>
                        {approvedMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            Assign to created member: {m.game_name} ({m.rank})
                          </option>
                        ))}
                      </select>
                    </div>

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
                        Make Don
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isMasterAdmin && approvedMembers.length > 0 && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-cartel-border text-xs">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Appoint Additional Family Don:</span>
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
      )}

      {/* BLOCK 3: Week Rollover & Treasury + Level Tax Brackets (Add, Edit & Remove) + Member Tax Control */}
      {(permissions.manageRolloverTreasury ||
        permissions.manageTaxBrackets ||
        permissions.manageIndividualTax) && (
        <section className="w-full max-h-[564px] overflow-hidden rounded-2xl border border-cartel-border bg-cartel-card p-4 shadow-xl space-y-3">
          {(permissions.manageRolloverTreasury ||
            permissions.manageTaxBrackets) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Week Rollover & Treasury */}
              {permissions.manageRolloverTreasury && (
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
                      <label className="text-[10px] text-slate-400">
                        Active Week
                      </label>
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
              )}

              {/* Level Tax Brackets (Add or Edit) */}
              {permissions.manageTaxBrackets && (
                <form
                  onSubmit={handleSaveBracket}
                  className="rounded-xl bg-cartel-surface border border-cartel-border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" />
                      <span>
                        {editingBracketMinLevel !== null
                          ? `Editing Lv.${editingBracketMinLevel}+`
                          : "Level Tax Brackets"}
                      </span>
                    </span>
                    {editingBracketMinLevel !== null && (
                      <button
                        type="button"
                        onClick={() => setEditingBracketMinLevel(null)}
                        className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[10px] text-slate-400">
                        Min Level
                      </label>
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
                        Tax ($)
                      </label>
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
                    {editingBracketMinLevel !== null
                      ? "Update Selected Bracket"
                      : "Add / Save Level Bracket"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Interactive Tax Brackets List: Tap to Edit or Trash Icon to Remove */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              <span>Active Level Brackets (Tap to Edit or Remove)</span>
              <span>{taxLogic.length} Tiers</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              {taxLogic.map((tier) => {
                const isSelected = editingBracketMinLevel === tier.min_level;
                return (
                  <div
                    key={tier.min_level}
                    className={`shrink-0 rounded-xl border px-2.5 py-1.5 flex items-center gap-2 transition ${
                      isSelected
                        ? "bg-amber-500/20 border-amber-400"
                        : "bg-cartel-bg/90 border-cartel-border"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={!permissions.manageTaxBrackets}
                      onClick={() =>
                        selectBracketForEdit(tier.min_level, tier.expected_tax)
                      }
                      className="flex items-center gap-1.5 text-left cursor-pointer disabled:cursor-default"
                      title="Click to edit this bracket"
                    >
                      <span className="text-slate-300 font-medium">
                        Lv.{tier.min_level}+:
                      </span>
                      <span className="font-bold text-amber-300">
                        {formatCartelCurrency(tier.expected_tax, true)}
                      </span>
                      {permissions.manageTaxBrackets && (
                        <Pencil className="w-3 h-3 text-slate-400 hover:text-amber-300" />
                      )}
                    </button>

                    {permissions.manageTaxBrackets && taxLogic.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteBracket(tier.min_level)}
                        className="text-rose-400 hover:text-rose-300 pl-1 border-l border-cartel-border cursor-pointer"
                        title={`Remove Lv.${tier.min_level}+ bracket`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Set Tax Rate for Individual Member */}
          {permissions.manageIndividualTax && approvedMembers.length > 0 && (
            <form
              onSubmit={handleAssignMemberTax}
              className="rounded-xl bg-cartel-surface border border-cartel-border p-3 space-y-2"
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
                Set Tax Rate for Individual Member
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  required
                  value={selectedMemberForTax}
                  onChange={(e) => setSelectedMemberForTax(e.target.value)}
                  className="rounded-lg bg-cartel-bg border border-cartel-border px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="">Select Member...</option>
                  {approvedMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.game_name} (Lv.{m.level} {m.rank})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={memberTaxValue}
                  onChange={(e) => setMemberTaxValue(e.target.value)}
                  placeholder="Custom Tax $ (blank = auto)"
                  className="rounded-lg bg-cartel-bg border border-cartel-border px-2.5 py-1.5 text-xs text-amber-300"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 py-1.5 px-3 text-xs font-bold cursor-pointer"
                >
                  Apply Member Tax
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* BLOCK 4: Custom HTML/CSS Welcome Message Designer (Strictly App Developer oharajoshua333@gmail.com ONLY) */}
      {isMasterAdmin && (
        <section className="w-full max-h-[564px] overflow-hidden rounded-2xl border border-emerald-500/30 bg-cartel-card p-4 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between border-b border-cartel-border pb-2">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Custom HTML/CSS Welcome Message Designer (App Developer Only)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Exclusive to {MASTER_ADMIN_EMAIL} • Renders at top of Roster tab
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
                className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-1.5 text-xs uppercase tracking-wider cursor-pointer"
              >
                {welcomeSaved
                  ? "Saved Welcome Banner!"
                  : "Publish Welcome Code"}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
