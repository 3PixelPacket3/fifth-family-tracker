"use client";

import React, { useState } from "react";
import { APP_VERSION, MASTER_ADMIN_EMAIL } from "@/store/useCartelStore";
import { auth, deleteProfileFromCloud, logoutFirebase } from "@/lib/firebase";
import { deleteUser } from "firebase/auth";
import {
  Scale,
  ShieldCheck,
  Lock,
  FileText,
  X,
  Trash2,
  AlertCircle,
} from "lucide-react";

interface LegalSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LegalSecurityModal({
  isOpen,
  onClose,
}: LegalSecurityModalProps) {
  const [activeTab, setActiveTab] = useState<
    "disclaimer" | "privacy" | "terms" | "security"
  >("disclaimer");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentUser = auth.currentUser;

  const handleSelfDeleteAccount = async () => {
    if (!currentUser) return;
    setDeleteError(null);
    try {
      await deleteProfileFromCloud(currentUser.uid);
      await deleteUser(currentUser);
      await logoutFirebase();
      onClose();
    } catch {
      // If Firebase requires recent login, sign out after removing Firestore profile data
      await logoutFirebase();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md max-h-[564px] overflow-hidden rounded-2xl border border-amber-500/40 bg-cartel-card p-4 shadow-2xl flex flex-col justify-between space-y-3">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between border-b border-cartel-border pb-2.5">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Legal, Privacy &amp; Security Notice
                </h2>
                <p className="text-[10px] text-slate-400">
                  Release v{APP_VERSION} • Compliance &amp; Data Protection
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Section Tabs */}
          <div className="grid grid-cols-4 gap-1 bg-cartel-surface p-1 rounded-xl border border-cartel-border mt-2.5">
            {(
              [
                { id: "disclaimer", label: "Virtual RPG" },
                { id: "privacy", label: "Privacy" },
                { id: "terms", label: "Terms" },
                { id: "security", label: "Security" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                  activeTab === t.id
                    ? "bg-amber-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-3 rounded-xl bg-cartel-surface/80 border border-cartel-border p-3 text-xs text-slate-300 space-y-2 leading-relaxed">
            {activeTab === "disclaimer" && (
              <>
                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>100% Fictional RPG Utility &amp; Non-Affiliation</span>
                </p>
                <p>
                  This web application is an unofficial, fan-operated companion
                  roster and virtual currency ledger built exclusively for players
                  of the mobile role-playing game{" "}
                  <strong>&ldquo;The Fifth Family&rdquo;</strong>.
                </p>
                <p>
                  All references to &ldquo;Cartel,&rdquo; &ldquo;Tax,&rdquo;
                  &ldquo;Treasury,&rdquo; &ldquo;Tribute,&rdquo; ranks, and
                  dollar figures (e.g., <code className="text-amber-300">$4M</code>,{" "}
                  <code className="text-amber-300">$511M</code>) refer{" "}
                  <strong>strictly to fictional in-game RPG points</strong>. No
                  real-world money, cryptocurrency, financial wagering, or
                  real-world payments are accepted, processed, or stored by this
                  application.
                </p>
              </>
            )}

            {activeTab === "privacy" && (
              <>
                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Privacy Policy (GDPR / CCPA / COPPA Compliant)</span>
                </p>
                <p>
                  <strong>Data Collected:</strong> We only store your authentication
                  email address, Firebase UID, chosen in-game alias, and virtual
                  RPG level/tax records via Google Firebase Authentication and
                  Cloud Firestore.
                </p>
                <p>
                  <strong>Essential Storage &amp; Age Requirement:</strong> This
                  app uses browser <code className="text-amber-300">localStorage</code>{" "}
                  strictly for essential session persistence. No data is sold or
                  shared with third-party advertisers. Users must be 13+ years of
                  age (COPPA). You may permanently delete your account and data at
                  any time below or by contacting{" "}
                  <span className="text-amber-300">{MASTER_ADMIN_EMAIL}</span>.
                </p>
              </>
            )}

            {activeTab === "terms" && (
              <>
                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>Terms of Use &amp; MIT License</span>
                </p>
                <p>
                  Access to the Vinciguerra Lupo Family Ledger is granted at the
                  sole discretion of the App Developer ({MASTER_ADMIN_EMAIL}) and
                  the appointed Family Don.
                </p>
                <p>
                  This software is provided <strong>&ldquo;AS IS&rdquo;</strong>{" "}
                  without warranty of any kind under the MIT License. Users agree
                  not to submit sensitive personal data or abusive content into
                  in-game name or note fields.
                </p>
              </>
            )}

            {activeTab === "security" && (
              <>
                <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Cloud Firestore &amp; OAuth 2.0 Security Architecture</span>
                </p>
                <p>
                  Authentication is enforced by{" "}
                  <strong>Google Firebase Authentication</strong> (TLS/HTTPS
                  encrypted OAuth 2.0 &amp; salted password hashing; plaintext
                  passwords never touch our code).
                </p>
                <p>
                  Database access is protected by{" "}
                  <strong>Cloud Firestore Document-Level Security Rules</strong>,
                  ensuring unapproved accounts cannot read family records and
                  standard members operate in strict View-Only mode.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Right to Erasure (Account & Data Self-Deletion) + Close Footer */}
        <div className="border-t border-cartel-border pt-2.5 flex items-center justify-between gap-2">
          {currentUser ? (
            !confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 underline cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete My Account &amp; Data</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelfDeleteAccount}
                  className="rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold px-2.5 py-1 text-[10px] cursor-pointer"
                >
                  Confirm Permanent Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )
          ) : (
            <span className="text-[10px] text-slate-500">
              © {new Date().getFullYear()} Vinciguerra Lupo Tracker • MIT License
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-cartel-surface hover:bg-slate-800 border border-cartel-border px-3 py-1.5 text-xs font-bold text-slate-200 cursor-pointer"
          >
            Close
          </button>
        </div>

        {deleteError && (
          <p className="text-[10px] text-rose-400">{deleteError}</p>
        )}
      </div>
    </div>
  );
}
