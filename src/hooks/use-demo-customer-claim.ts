"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEMO_CLAIM_HEARTBEAT_MS,
  DEMO_CLAIM_STALE_MS,
} from "@/lib/demo-customer-claim";

export type DemoClaimRow = {
  customerEmail: string;
  sessionId: string;
  updatedAt: string;
};

function lazySessionId(ref: { current: string | null }): string {
  if (typeof window === "undefined") return "";
  if (!ref.current) ref.current = crypto.randomUUID();
  return ref.current;
}

/**
 * Single active browser session per demo customer email (DB-backed).
 * Polls GET for picker; PUT heartbeat while a profile is selected.
 */
export function useDemoCustomerClaim(selectedEmail: string | null) {
  const sessionIdStore = useRef<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedEmail;
  const prevEmailRef = useRef<string | null>(null);

  const [claims, setClaims] = useState<DemoClaimRow[]>([]);
  const [claimLost, setClaimLost] = useState(false);

  const release = useCallback(async (email: string) => {
    const sid = lazySessionId(sessionIdStore);
    if (!email || !sid) return;
    try {
      await fetch("/api/demo/customer-claim/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerEmail: email, sessionId: sid }),
      });
    } catch {
      /* best effort */
    }
  }, []);

  const tryClaim = useCallback(async (email: string): Promise<boolean> => {
    const sid = lazySessionId(sessionIdStore);
    const res = await fetch("/api/demo/customer-claim", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerEmail: email, sessionId: sid }),
    });
    if (res.ok) return true;
    if (res.status === 409) return false;
    const t = await res.text().catch(() => "");
    throw new Error(t || `Claim failed (${res.status})`);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/demo/customer-claim");
        if (!res.ok || cancelled) return;
        const j = (await res.json()) as { claims: DemoClaimRow[] };
        if (cancelled) return;
        setClaims(j.claims ?? []);

        const sel = selectedRef.current;
        const sid = lazySessionId(sessionIdStore);
        if (sel && sid) {
          const row = j.claims?.find((c) => c.customerEmail === sel);
          const staleCut = Date.now() - DEMO_CLAIM_STALE_MS;
          const fresh =
            row && new Date(row.updatedAt).getTime() >= staleCut;
          if (fresh && row.sessionId !== sid) {
            setClaimLost(true);
          }
        }
      } catch {
        /* ignore poll errors */
      }
    }
    void poll();
    const id = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const prev = prevEmailRef.current;
    if (prev && prev !== selectedEmail) {
      void release(prev);
    }
    prevEmailRef.current = selectedEmail;
  }, [selectedEmail, release]);

  useEffect(() => {
    if (!selectedEmail) return;
    setClaimLost(false);
    const sid = lazySessionId(sessionIdStore);
    const email = selectedEmail;

    async function beat() {
      const res = await fetch("/api/demo/customer-claim", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerEmail: email, sessionId: sid }),
      });
      if (res.status === 409) {
        setClaimLost(true);
      }
    }

    void beat();
    const id = setInterval(() => void beat(), DEMO_CLAIM_HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [selectedEmail]);

  useEffect(() => {
    function onUnload() {
      const sel = selectedRef.current;
      const sid = lazySessionId(sessionIdStore);
      if (!sel || !sid) return;
      const blob = new Blob(
        [JSON.stringify({ customerEmail: sel, sessionId: sid })],
        { type: "application/json" },
      );
      navigator.sendBeacon("/api/demo/customer-claim/release", blob);
    }
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const isLockedForPicker = useCallback(
    (customerEmail: string) => {
      const sid = lazySessionId(sessionIdStore);
      const row = claims.find((c) => c.customerEmail === customerEmail);
      if (!row) return false;
      const staleCut = Date.now() - DEMO_CLAIM_STALE_MS;
      if (new Date(row.updatedAt).getTime() < staleCut) return false;
      return row.sessionId !== sid;
    },
    [claims],
  );

  return {
    claims,
    tryClaim,
    release,
    isLockedForPicker,
    claimLost,
    clearClaimLost: () => setClaimLost(false),
  };
}
