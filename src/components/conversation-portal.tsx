"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CadenyaWidgetProvider } from "@cadenya/widgets-ui-react";
import { TravelConcierge } from "@/examples/conversation/travel-concierge";
import { useVerification } from "./verification-gate";

type Credentials = { token: string; host: string };


async function mintSession(experience: "conversation" | "chess" | "diagram", verification: ReturnType<typeof useVerification>, retry = true): Promise<Credentials> {
  await verification.ensureVerified();
  const response = await fetch(`/api/cadenya/widget-session?experience=${experience}`, { method: "POST", cache: "no-store" });
  const result = await response.json();
  if (response.status === 403 && result.code === "verification_required") {
    verification.invalidate();
    if (retry) return mintSession(experience, verification, false);
  }
  if (!response.ok) throw new Error(result.error ?? "Could not connect. Please try again.");
  return result;
}


export function ConversationPortal({ experience = "conversation", children }: { experience?: "conversation" | "chess" | "diagram"; children?: ReactNode }) {
  const verification = useVerification();
  const getToken = useCallback(async () => (await mintSession(experience, verification)).token, [experience, verification]);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    mintSession(experience, verification).then(result => { if (!cancelled) setCredentials(result); })
      .catch(error => { if (!cancelled) setError(error.message); });
    return () => { cancelled = true; };
  }, [attempt, experience, verification]);

  return <section className="conversation-surface" aria-label={experience === "chess" ? "Chess opponent" : experience === "diagram" ? "Diagram builder" : "Conversations"}>
    {credentials ? <CadenyaWidgetProvider host={credentials.host} token={credentials.token} getToken={getToken}>
      {children ?? <TravelConcierge />}
    </CadenyaWidgetProvider> : <div className="connection-state">
      {error ? <><h2>Let’s reconnect.</h2><p role="alert">{error}</p><button className="btn btn-primary" onClick={() => { setError(null); setAttempt(value => value + 1); }}><span>Try again</span></button></> : <p role="status">Connecting to your conversation…</p>}
    </div>}
  </section>;
}
