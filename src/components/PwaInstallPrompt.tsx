"use client";

import React, { useEffect, useState } from "react";
import { Download, Share, PlusSquare, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register service worker for Android PWA installability
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }

    // Check if already installed in standalone mode
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setIsStandalone(standalone);

    // Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIOS(ios);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
  }, []);

  if (isStandalone || dismissed) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSGuide((v) => !v);
    } else {
      // Desktop or browser fallback instructions
      setShowIOSGuide((v) => !v);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleInstallClick}
          className="rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1.5 text-[11px] font-semibold text-amber-300 flex items-center gap-1.5 transition cursor-pointer"
          title="Install The Fifth Family as a native mobile app"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span>Install App</span>
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 text-slate-500 hover:text-slate-300 cursor-pointer"
          aria-label="Dismiss install hint"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-sm rounded-2xl border border-amber-500/40 bg-cartel-card p-4 shadow-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Install Native Mobile App
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {isIOS ? (
            <p className="text-xs text-slate-300 leading-relaxed">
              On iPhone / iPad: Tap the{" "}
              <strong className="text-amber-300 inline-flex items-center gap-1">
                <Share className="w-3.5 h-3.5" /> Share
              </strong>{" "}
              button in Safari, then tap{" "}
              <strong className="text-amber-300 inline-flex items-center gap-1">
                <PlusSquare className="w-3.5 h-3.5" /> Add to Home Screen
              </strong>{" "}
              to launch The Fifth Family full-screen with its custom crest icon.
            </p>
          ) : (
            <p className="text-xs text-slate-300 leading-relaxed">
              On Android Chrome or Desktop: Tap your browser menu{" "}
              <strong className="text-amber-300">(⋮)</strong> and select{" "}
              <strong className="text-amber-300">
                &ldquo;Add to Home screen&rdquo;
              </strong>{" "}
              or <strong className="text-amber-300">&ldquo;Install app&rdquo;</strong>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
