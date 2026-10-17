"use client";

import React, { useState } from "react";
import {
  useCartelStore,
  calculateMemberExpectedTax,
  formatCartelCurrency,
  MemberRank,
  Profile,
  RankPermissionSet,
} from "@/store/useCartelStore";
import {
  saveProfileToCloud,
  deleteProfileFromCloud,
  saveContributionToCloud,
  saveMetaToCloud,
} from "@/lib/firebase";
import {
  UserPlus,
  Trash2,
  CheckCircle2,
  Clock,
  DollarSign,
  Sliders,
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  UserCheck,
} from "lucide-react";

interface RosterTaxManagerProps {
  currentUserProfile: Profile;
  permissions: RankPermissionSet & { isFullCommand: boolean };
}

const RANKS: MemberRank[] = [
  "Don",
  "Underboss",
  "Capo",
  "Soldier",
  "Associate",
];

const RANK_STYLE: Record<MemberRank, string> = {
  "App Developer": "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  Don: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  Underboss: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  Capo: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  Soldier: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  Associate: "bg-slate-500/20 text-slate-300 border-slate-500/40",
};

export default function WeeklyDashboardView({
  currentUserProfile,
  permissions,
}: RosterTaxManagerProps) {
  const {
    profiles,
    taxLogic,
    contributions,
    activeWeekStart,
    welcomeHtml,
    logPaymentLocal,
    toggleMemberPaidLocal,
  } = useCartelStore();

  const canManageMembers = permissions.manageMembers;
  const canManageIndividualTax = permissions.manageIndividualTax;
  const canEditRow = canManageMembers || canManageIndividualTax;

  // Add Member Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRank, setNewRank] = useState<MemberRank>("Soldier");
  const [newLevel, setNewLevel] = useState("50");
  const [newCustomTax, setNewCustomTax] = useState("");

  // Selected Member for Logging Payment
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [payAmountInput, setPayAmountInput] = useState("");
  const [payNoteInput, setPayNoteInput] = useState("");

  // Edit Member Drawer state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editRank, setEditRank] = useState<MemberRank>("Soldier");
  const [editLevel, setEditLevel] = useState("50");
  const [editCustomTax, setEditCustomTax] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PER_PAGE = 5;

  const approvedMembers = profiles.filter(
    (p) => p.approval_status === "approved" && p.rank !== "App Developer"
  );

  const myAssignedProfile =
    approvedMembers.find(
      (m) =>
        m.id === currentUserProfile.linked_member_id ||
        m.id === currentUserProfile.id ||
        m.uid === currentUserProfile.uid
    ) || null;

  const filteredMembers = approvedMembers.filter((m) =>
    m.game_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pageMembers = filteredMembers.slice(
    safePage * PER_PAGE,
    (safePage + 1) * PER_PAGE
  );

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageMembers || !newName.trim()) return;
    const lvl = Math.max(1, parseInt(newLevel, 10) || 1);
    const customTaxVal =
      canManageIndividualTax && newCustomTax.trim() !== ""
        ? Math.max(0, parseFloat(newCustomTax) || 0)
        : null;

    const created: Profile = {
      id: `member_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      game_name: newName.trim(),
      rank: newRank,
      level: lvl,
      custom_tax_override: customTaxVal,
      role: newRank === "Don" ? "Admin" : "User",
      approval_status: "approved",
      joined_at: new Date().toISOString().slice(0, 10),
    };

    await saveProfileToCloud(created);
    setNewName("");
    setNewCustomTax("");
    setShowAddForm(false);
  };

  const handleLogPayment = async (e: React.FormEvent, playerId: string) => {
    e.preventDefault();
    if (!canManageMembers) return;
    const amount = parseFloat(payAmountInput.replace(/[^0-9.]/g, ""));
    if (Number.isNaN(amount) || amount < 0) return;

    const saved = logPaymentLocal(
      playerId,
      amount,
      payNoteInput.trim() || `Logged by ${currentUserProfile.rank}`,
      "add"
    );
    if (saved) {
      await saveContributionToCloud(saved);
      await saveMetaToCloud({
        baseTreasury: useCartelStore.getState().baseTreasury,
      });
    }
    setPayAmountInput("");
    setPayNoteInput("");
    setSelectedMemberId(null);
  };

  const handleQuickTogglePaid = async (playerId: string) => {
    if (!canManageMembers) return;
    const saved = toggleMemberPaidLocal(playerId);
    if (saved) {
      await saveContributionToCloud(saved);
      await saveMetaToCloud({
        baseTreasury: useCartelStore.getState().baseTreasury,
      });
    }
  };

  const startEditingMember = (member: Profile) => {
    setEditingMemberId(member.id);
    setEditRank(member.rank);
    setEditLevel(String(member.level));
    setEditCustomTax(
      typeof member.custom_tax_override === "number"
        ? String(member.custom_tax_override)
        : ""
    );
  };

  const handleSaveMemberEdit = async (member: Profile) => {
    if (!canEditRow) return;
    const lvl = canManageMembers
      ? Math.max(1, parseInt(editLevel, 10) || 1)
      : member.level;
    const nextRank = canManageMembers ? editRank : member.rank;
    const customTaxVal = canManageIndividualTax
      ? editCustomTax.trim() !== ""
        ? Math.max(0, parseFloat(editCustomTax) || 0)
        : null
      : member.custom_tax_override;

    const updated: Profile = {
      ...member,
      rank: nextRank,
      level: lvl,
      custom_tax_override: customTaxVal,
      role: nextRank === "Don" ? "Admin" : "User",
    };

    await saveProfileToCloud(updated);
    setEditingMemberId(null);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!canManageMembers) return;
    await deleteProfileFromCloud(memberId);
    if (editingMemberId === memberId) setEditingMemberId(null);
  };

  const weeklyStats = approvedMembers.reduce(
    (acc, m) => {
      const { expected_tax } = calculateMemberExpectedTax(m, taxLogic);
      const rec = contributions.find(
        (c) => c.player_id === m.id && c.week_start_date === activeWeekStart
      );
      const paid = rec?.amount_paid || 0;
      acc.expected += expected_tax;
      acc.paid += paid;
      if (paid < expected_tax) acc.pendingCount += 1;
      return acc;
    },
    { expected: 0, paid: 0, pendingCount: 0 }
  );

  return (
    <div className="w-full space-y-4">
      {/* Custom Welcome Message Banner */}
      {welcomeHtml && (
        <section
          aria-label="Family Welcome Message"
          className="w-full max-h-[564px] overflow-hidden"
          dangerouslySetInnerHTML={{ __html: welcomeHtml }}
        />
      )}

      {/* Standard Member Personal Status Card */}
      {!canEditRow && myAssignedProfile && (
        <section className="w-full max-h-[564px] overflow-hidden rounded-2xl border border-amber-500/40 bg-cartel-card p-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-cartel-border pb-2.5">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Your Assigned Family Profile
                </h2>
                <p className="text-sm font-extrabold text-white">
                  {myAssignedProfile.game_name} ({myAssignedProfile.rank} • Lv.
                  {myAssignedProfile.level})
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-cartel-border">
              <Eye className="w-3 h-3 text-amber-400" />
              <span>Member View Only</span>
            </span>
          </div>

          {(() => {
            const { expected_tax, bracket_label } = calculateMemberExpectedTax(
              myAssignedProfile,
              taxLogic
            );
            const myRec = contributions.find(
              (c) =>
                c.player_id === myAssignedProfile.id &&
                c.week_start_date === activeWeekStart
            );
            const myPaid = myRec?.amount_paid || 0;
            const myRemaining = Math.max(0, expected_tax - myPaid);

            return (
              <div className="grid grid-cols-3 gap-2.5 mt-3">
                <div className="rounded-xl bg-cartel-surface p-2.5 border border-cartel-border">
                  <p className="text-[10px] uppercase text-slate-400">
                    Your Tax Rate
                  </p>
                  <p className="text-base font-extrabold text-amber-300 mt-0.5">
                    {formatCartelCurrency(expected_tax, true)}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {bracket_label}
                  </p>
                </div>
                <div className="rounded-xl bg-cartel-surface p-2.5 border border-cartel-border">
                  <p className="text-[10px] uppercase text-slate-400">
                    Amount Paid
                  </p>
                  <p className="text-base font-extrabold text-emerald-400 mt-0.5">
                    {formatCartelCurrency(myPaid, true)}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Wk {activeWeekStart}
                  </p>
                </div>
                <div className="rounded-xl bg-cartel-surface p-2.5 border border-cartel-border">
                  <p className="text-[10px] uppercase text-slate-400">
                    Remaining
                  </p>
                  <p
                    className={`text-base font-extrabold mt-0.5 ${
                      myRemaining === 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {formatCartelCurrency(myRemaining, true)}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {myRemaining === 0 ? "Complete" : "Pending"}
                  </p>
                </div>
              </div>
            );
          })()}
        </section>
      )}

      {/* Main Family Roster & Weekly Tax Card */}
      <section className="w-full max-h-[564px] overflow-hidden rounded-2xl border border-cartel-border bg-cartel-card p-4 shadow-xl flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center justify-between gap-2 border-b border-cartel-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Family Roster &amp; Weekly Tax
                </h2>
                {!canEditRow && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-cartel-border">
                    View Only
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Week of{" "}
                <strong className="text-amber-300">{activeWeekStart}</strong> •
                Collected{" "}
                <strong className="text-emerald-400">
                  {formatCartelCurrency(weeklyStats.paid, true)}
                </strong>{" "}
                / {formatCartelCurrency(weeklyStats.expected, true)}
              </p>
            </div>

            {canManageMembers && (
              <button
                type="button"
                onClick={() => setShowAddForm((v) => !v)}
                className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-2 text-xs flex items-center gap-1.5 shadow cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{showAddForm ? "Close" : "Add Member"}</span>
              </button>
            )}
          </div>

          {/* Inline Add Member Form */}
          {showAddForm && canManageMembers && (
            <form
              onSubmit={handleAddMember}
              className="mt-3 rounded-xl bg-cartel-surface border border-amber-500/40 p-3 space-y-2.5"
            >
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Create Family Member Profile
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="In-Game Name"
                  className="col-span-2 sm:col-span-1 rounded-lg bg-cartel-bg border border-cartel-border px-2.5 py-1.5 text-xs text-white"
                />
                <select
                  value={newRank}
                  onChange={(e) => setNewRank(e.target.value as MemberRank)}
                  className="rounded-lg bg-cartel-bg border border-cartel-border px-2 py-1.5 text-xs text-slate-200"
                >
                  {RANKS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value)}
                  placeholder="Level"
                  className="rounded-lg bg-cartel-bg border border-cartel-border px-2.5 py-1.5 text-xs text-white"
                />
                {canManageIndividualTax && (
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={newCustomTax}
                    onChange={(e) => setNewCustomTax(e.target.value)}
                    placeholder="Custom Tax $ (Optional)"
                    className="col-span-2 sm:col-span-1 rounded-lg bg-cartel-bg border border-cartel-border px-2.5 py-1.5 text-xs text-amber-300"
                  />
                )}
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3.5 py-1.5 text-xs cursor-pointer"
                >
                  Save Member
                </button>
              </div>
            </form>
          )}

          {approvedMembers.length > 0 && !showAddForm && (
            <div className="relative mt-2.5">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Search family member..."
                className="w-full rounded-xl bg-cartel-surface border border-cartel-border pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          {approvedMembers.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-amber-400/70 mx-auto" />
              <p className="text-sm font-bold text-white">
                No Family Members on the Roster Yet
              </p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {canManageMembers
                  ? "Use the Add Member button above to create your family roster, set each member's rank and tax rate, and log weekly payments."
                  : "The App Developer or Family Don has not published the roster yet."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-cartel-border/60 mt-2">
              {pageMembers.map((member) => {
                const { expected_tax } = calculateMemberExpectedTax(
                  member,
                  taxLogic
                );
                const rec = contributions.find(
                  (c) =>
                    c.player_id === member.id &&
                    c.week_start_date === activeWeekStart
                );
                const paid = rec?.amount_paid || 0;
                const isPaid = paid >= expected_tax;
                const isSelectedForPay = selectedMemberId === member.id;
                const isEditing = editingMemberId === member.id;
                const isMe = myAssignedProfile?.id === member.id;

                return (
                  <div
                    key={member.id}
                    className={`py-2.5 space-y-2 rounded-lg px-1.5 ${
                      isMe ? "bg-amber-500/10" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-white truncate">
                            {member.game_name}
                          </span>
                          {isMe && (
                            <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-amber-500 text-slate-950">
                              You
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                              RANK_STYLE[member.rank]
                            }`}
                          >
                            {member.rank}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Lv.{member.level}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>
                            Tax Rate:{" "}
                            <strong className="text-amber-300">
                              {formatCartelCurrency(expected_tax, true)}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Paid:{" "}
                            <strong className="text-emerald-400">
                              {formatCartelCurrency(paid, true)}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* Controls based on rank permissions */}
                      {canEditRow ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {canManageMembers && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedMemberId(
                                    isSelectedForPay ? null : member.id
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-cartel-surface hover:bg-slate-800 border border-cartel-border text-xs font-semibold text-amber-300 flex items-center gap-1 cursor-pointer"
                                title="Log payment amount"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Log Pay</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleQuickTogglePaid(member.id)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 cursor-pointer ${
                                  isPaid
                                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                                    : "bg-rose-500/15 text-rose-300 border-rose-500/40"
                                }`}
                              >
                                {isPaid ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Paid</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Pending</span>
                                  </>
                                )}
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              isEditing
                                ? setEditingMemberId(null)
                                : startEditingMember(member)
                            }
                            className="p-1.5 rounded-xl bg-cartel-surface hover:bg-slate-800 border border-cartel-border text-slate-300 cursor-pointer"
                            title="Edit Member Settings"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`shrink-0 px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1 ${
                            isPaid
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                              : "bg-amber-500/15 text-amber-300 border-amber-500/40"
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Paid</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5" />
                              <span>Pending</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Inline Log Payment Drawer */}
                    {isSelectedForPay && canManageMembers && (
                      <form
                        onSubmit={(e) => handleLogPayment(e, member.id)}
                        className="flex flex-wrap items-center gap-1.5 bg-cartel-surface/90 border border-amber-500/30 rounded-xl p-2"
                      >
                        <input
                          type="number"
                          min={0}
                          step="any"
                          required
                          value={payAmountInput}
                          onChange={(e) => setPayAmountInput(e.target.value)}
                          placeholder="Amount paid ($)"
                          className="flex-1 min-w-[130px] rounded-lg bg-cartel-bg border border-cartel-border px-2.5 py-1 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={payNoteInput}
                          onChange={(e) => setPayNoteInput(e.target.value)}
                          placeholder="Note (optional)"
                          className="w-32 rounded-lg bg-cartel-bg border border-cartel-border px-2.5 py-1 text-xs text-slate-200"
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 text-xs cursor-pointer"
                        >
                          Save Payment
                        </button>
                      </form>
                    )}

                    {/* Inline Edit Member Drawer */}
                    {isEditing && canEditRow && (
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-cartel-surface/90 border border-cartel-border rounded-xl p-2.5 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {canManageMembers && (
                            <>
                              <select
                                value={editRank}
                                onChange={(e) =>
                                  setEditRank(e.target.value as MemberRank)
                                }
                                className="rounded-lg bg-cartel-bg border border-cartel-border px-2 py-1 text-xs text-white"
                              >
                                {RANKS.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min={1}
                                value={editLevel}
                                onChange={(e) => setEditLevel(e.target.value)}
                                className="w-16 rounded-lg bg-cartel-bg border border-cartel-border px-2 py-1 text-xs text-white"
                                title="Member Level"
                              />
                            </>
                          )}
                          {canManageIndividualTax && (
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={editCustomTax}
                              onChange={(e) => setEditCustomTax(e.target.value)}
                              placeholder="Custom Tax ($)"
                              className="w-32 rounded-lg bg-cartel-bg border border-cartel-border px-2 py-1 text-xs text-amber-300"
                              title="Set exact tax amount for this member (or leave blank for Level Bracket)"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveMemberEdit(member)}
                            className="rounded-lg bg-emerald-500 text-slate-950 font-bold px-2.5 py-1 text-xs cursor-pointer"
                          >
                            Save
                          </button>
                          {canManageMembers && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 cursor-pointer"
                              title="Remove member from family"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {approvedMembers.length > PER_PAGE && (
          <div className="flex items-center justify-between border-t border-cartel-border pt-2 text-xs text-slate-400">
            <span>
              Page {safePage + 1} of {totalPages} ({filteredMembers.length}{" "}
              members)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="p-1 rounded-lg bg-cartel-surface border border-cartel-border disabled:opacity-40 text-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="p-1 rounded-lg bg-cartel-surface border border-cartel-border disabled:opacity-40 text-white cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
