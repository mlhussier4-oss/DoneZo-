"use client";

import { useCallback, useEffect, useState } from "react";
import { Fingerprint, ScanFace } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { callNative, hasNativePlugin, nativePlatform, onNative } from "@/lib/app/native";
import { APP_LOCK_KEY } from "@/lib/app/platform";

const PLUGIN = "BiometricAuthNative";
/** Lock again after the app has been in the background this long. */
const RELOCK_AFTER_MS = 60_000;

type Biometry = { isAvailable: boolean; biometryType: number };

function readSetting(): boolean {
  try { return localStorage.getItem(APP_LOCK_KEY) === "on"; } catch { return false; }
}

/** What this phone calls its biometric unlock (iOS: 1 = Touch ID, 2 = Face ID). */
export function biometryName(platform: "ios" | "android" | null, type: number): string {
  if (platform === "ios") return type === 2 ? "Face ID" : type === 1 ? "Touch ID" : "Face ID or Touch ID";
  return "fingerprint or face unlock";
}

export async function checkBiometry(): Promise<{ available: boolean; name: string }> {
  if (!hasNativePlugin(PLUGIN)) return { available: false, name: "" };
  try {
    const r = await callNative<Biometry>(PLUGIN, "checkBiometry");
    return { available: r.isAvailable, name: biometryName(nativePlatform(), r.biometryType) };
  } catch {
    return { available: false, name: "" };
  }
}

/** Ask for Face ID / Touch ID / fingerprint (the phone passcode is offered as a fallback). Resolves true on success. */
export async function authenticate(reason: string): Promise<boolean> {
  try {
    await callNative(PLUGIN, "internalAuthenticate", {
      reason, cancelTitle: "Cancel", allowDeviceCredential: true, iosFallbackTitle: "Use passcode",
      androidTitle: "Unlock HomeHire", androidSubtitle: reason, androidConfirmationRequired: false,
    });
    return true;
  } catch {
    return false;
  }
}

function setLockedAttr(locked: boolean) {
  if (locked) document.documentElement.setAttribute("data-locked", "");
  else document.documentElement.removeAttribute("data-locked");
}

/**
 * App lock (phone app only, off by default; turned on in Profile / Business settings).
 * When on, HomeHire asks for Face ID / fingerprint when the app opens, and again after a minute in the background.
 * The page is hidden before it paints (see appMarkerScript), so nothing shows until the person unlocks.
 */
export function AppLock() {
  const [locked, setLocked] = useState(false);
  const [name, setName] = useState("Face ID");

  const unlock = useCallback(async () => {
    if (await authenticate("Unlock HomeHire")) { setLocked(false); setLockedAttr(false); }
  }, []);

  useEffect(() => {
    if (!nativePlatform() || !hasNativePlugin(PLUGIN)) { setLockedAttr(false); return; }
    let hiddenAt = 0;
    const lockNow = () => {
      if (!readSetting()) return;
      setLocked(true); setLockedAttr(true); void unlock();
    };
    void checkBiometry().then((b) => { if (b.name) setName(b.name); });
    // Cold start: the inline script already hid the page if the lock is on.
    if (document.documentElement.hasAttribute("data-locked")) lockNow();
    onNative("App", "pause", () => { hiddenAt = Date.now(); });
    onNative("App", "resume", () => { if (hiddenAt && Date.now() - hiddenAt >= RELOCK_AFTER_MS) lockNow(); });
  }, [unlock]);

  if (!locked) return null;
  const Icon = name === "Face ID" ? ScanFace : Fingerprint;
  return (
    <div id="app-lock" role="dialog" aria-modal="true" aria-label="HomeHire is locked"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-primary px-6 text-center text-white">
      <LogoMark className="size-16" />
      <div>
        <p className="text-xl font-semibold">HomeHire is locked</p>
        <p className="mt-1 text-sm text-white/70">Unlock with {name} to continue.</p>
      </div>
      <button type="button" onClick={() => void unlock()}
        className="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg bg-cta px-6 font-semibold text-cta-foreground hover:bg-cta-hover">
        <Icon className="size-5" aria-hidden /> Unlock
      </button>
      <form action="/auth/signout" method="post">
        <button type="submit" className="cursor-pointer text-sm text-white/70 underline">Sign out instead</button>
      </form>
    </div>
  );
}

/** Profile / Business settings switch. Only appears inside the app on phones that have Face ID, Touch ID or a fingerprint reader. */
export function AppLockSetting() {
  const [state, setState] = useState<{ available: boolean; name: string; on: boolean } | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void checkBiometry().then((b) => setState({ ...b, on: readSetting() }));
  }, []);

  if (!state?.available) return null;
  const toggle = async () => {
    setError(undefined);
    if (!state.on && !(await authenticate(`Turn on ${state.name} for HomeHire`))) { setError(`${state.name} didn't confirm, so the lock is still off.`); return; }
    try { localStorage.setItem(APP_LOCK_KEY, state.on ? "off" : "on"); } catch { /* storage unavailable */ }
    setState({ ...state, on: !state.on });
  };
  return (
    <div className="rounded-lg border border-border bg-card p-4" data-testid="app-lock-setting">
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span>
          <span className="block font-medium">Lock HomeHire with {state.name}</span>
          <span className="block text-sm text-muted-foreground">Asks for {state.name} when you open the app, so no one else can see your jobs and messages.</span>
        </span>
        <input type="checkbox" checked={state.on} onChange={() => void toggle()} className="size-6 accent-[var(--primary)]" />
      </label>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
