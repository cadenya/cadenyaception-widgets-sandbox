"use client";

import Script from "next/script";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CadenyaLockup } from "./brand";

type Verification = { ensureVerified: () => Promise<void>; invalidate: () => void };
type Turnstile = {
  render: (element: HTMLElement, options: {
    sitekey: string; action: string; theme: "light"; size: "flexible";
    callback: (token: string) => void;
    "error-callback": () => void;
    "expired-callback": () => void;
    "timeout-callback": () => void;
  }) => string;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }
const VerificationContext = createContext<Verification | null>(null);

export function useVerification() {
  const value = useContext(VerificationContext);
  if (!value) throw new Error("A VerificationGate is required around the demos.");
  return value;
}

export function VerificationGate({ children }: { children: ReactNode }) {
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [expiresAt, setExpiresAt] = useState(0);
  const expiresRef = useRef(0);
  const pending = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);
  const [checking, setChecking] = useState(true);
  const [checked, setChecked] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const widgetContainer = useRef<HTMLDivElement>(null);
  const locked = expiresAt === 0;

  const complete = useCallback((expiry: number) => {
    expiresRef.current = expiry;
    setExpiresAt(expiry);
    setError(null);
    setChecked(false);
    pending.current?.resolve();
    pending.current = null;
  }, []);

  const invalidate = useCallback(() => {
    expiresRef.current = 0;
    setExpiresAt(0);
    setChecked(false);
  }, []);

  const ensureVerified = useCallback((): Promise<void> => {
    if (expiresRef.current > Date.now()) return Promise.resolve();
    if (!pending.current) {
      let resolve!: () => void;
      const promise = new Promise<void>(done => { resolve = done; });
      pending.current = { promise, resolve };
      invalidate();
    }
    return pending.current.promise;
  }, [invalidate]);

  const context = useMemo(() => ({ ensureVerified, invalidate }), [ensureVerified, invalidate]);

  useEffect(() => {
    const abort = new AbortController();
    void fetch("/api/verification", { cache: "no-store", signal: abort.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Verification check failed");
        const result = await response.json();
        if (!abort.signal.aborted && result.verified && typeof result.expiresAt === "number" && result.expiresAt > Date.now()) complete(result.expiresAt);
      })
      .catch(() => { if (!abort.signal.aborted) setError("We couldn’t check your verification. Please verify below."); })
      .finally(() => { if (!abort.signal.aborted) setChecking(false); });
    return () => abort.abort();
  }, [complete]);

  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setTimeout(invalidate, Math.max(0, expiresAt - Date.now()));
    const checkExpiry = () => { if (expiresRef.current <= Date.now()) invalidate(); };
    document.addEventListener("visibilitychange", checkExpiry);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", checkExpiry); };
  }, [expiresAt, invalidate]);

  useEffect(() => {
    const modal = dialog.current;
    if (!modal) return;
    if (!locked) { modal.close(); return; }
    if (!modal.open) modal.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; modal.close(); };
  }, [locked]);

  useEffect(() => {
    const turnstile = window.turnstile;
    if (!locked || !checked || !scriptReady || !sitekey || !turnstile || !widgetContainer.current) return;
    let active = true;
    let sending = false;
    const abort = new AbortController();
    const fail = (message: string) => {
      if (!active) return;
      setSubmitting(false);
      setError(message);
    };
    let widgetId: string;
    try {
      widgetId = turnstile.render(widgetContainer.current, {
        sitekey, action: "widgets_demo", theme: "light", size: "flexible",
        callback: token => {
          if (!active || sending) return;
          sending = true;
          setSubmitting(true);
          setError(null);
          void fetch("/api/verification", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }), cache: "no-store", signal: abort.signal,
          }).then(async response => {
            const result = await response.json();
            if (!response.ok || !result.verified || typeof result.expiresAt !== "number" || result.expiresAt <= Date.now()) {
              throw new Error(result.error || "Verification failed. Please try again.");
            }
            if (active) complete(result.expiresAt);
          }).catch(error => fail(error instanceof Error ? error.message : "Verification failed. Please try again."))
            .finally(() => { if (active) setSubmitting(false); });
        },
        "error-callback": () => fail("The verification challenge couldn’t load. Check your connection and try again."),
        "expired-callback": () => fail("This verification expired. Please try again."),
        "timeout-callback": () => fail("The verification challenge timed out. Please try again."),
      });
    } catch { fail("The verification challenge couldn’t start. Please try again."); }
    return () => {
      active = false;
      abort.abort();
      if (widgetId) turnstile.remove(widgetId);
    };
  }, [locked, checked, scriptReady, sitekey, attempt, complete]);

  return <VerificationContext.Provider value={context}>
    <div inert={locked} aria-hidden={locked || undefined}>{children}</div>
    <dialog ref={dialog} className="verification-screen" aria-labelledby="verification-title" aria-describedby="verification-description" onCancel={event => event.preventDefault()}>
      <div className="verification-card">
        <CadenyaLockup className="verification-brand" />
        <span className="type-label verification-eyebrow">A little pause before the possibilities</span>
        <h1 id="verification-title">One quick check.<br />Then, explore.</h1>
        <p id="verification-description">Help us keep the demos open for everyone. Check the box below to start a quick browser verification.</p>
        {sitekey ? <>
          <label className={`verification-checkbox${checked ? " is-checked" : ""}`}>
            <input type="checkbox" checked={checked} disabled={checking || submitting} onChange={event => { setChecked(event.target.checked); setError(null); }} />
            <span>I’m here to try the demos</span>
          </label>
          <div ref={widgetContainer} className="verification-widget" />
          <p className="verification-status" role="status">{checking ? "Checking your browser…" : submitting ? "Confirming your verification…" : checked && !error ? "Complete the verification below if prompted." : "Travel ideas, a game of chess, and a blank canvas await."}</p>
          {error && <div className="verification-error" role="alert"><p>{error}</p><button className="btn btn-soft" onClick={() => {
            if (!scriptReady) { window.location.reload(); return; }
            setError(null); setSubmitting(false); setChecked(true); setAttempt(value => value + 1);
          }}>Try verification again</button></div>}
        </> : <p role="alert">Verification is temporarily unavailable. Please try again later.</p>}
        <p className="verification-footnote">Protected by Cloudflare Turnstile · <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noreferrer">Privacy</a></p>
      </div>
    </dialog>
    {locked && sitekey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive"
      onReady={() => setScriptReady(true)} onError={() => setError("The verification service couldn’t load. Check your connection and try again.")} />}
  </VerificationContext.Provider>;
}
