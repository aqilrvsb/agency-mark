"use client";

import { useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";

/**
 * The action button at the bottom of each platform card. Two visual
 * states encode connection status at a glance:
 *
 *   • Not connected  → magenta brand gradient ("Connect →") — invites action
 *   • Connected      → emerald gradient ("Reconnect") with a refresh glyph —
 *                       reads as "this is healthy, click only if you need to
 *                       reauth", not as another empty CTA
 *
 * Loading state spins a refresh icon. Click POSTs to /api/client/connect/
 * and follows the returned authUrl (handled by the upstream OAuth flow).
 */
export function ConnectButton({
  platform,
  connected,
}: {
  platform: string;
  connected: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const res = await fetch(`/api/client/connect/${platform}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const body = await res.json();

      // Headless Meta path: the connect route returns {alreadyConnected, redirect}
      // when reusing an existing same-token Facebook account. Honour that redirect.
      if (body.alreadyConnected && body.redirect) {
        window.location.href = body.redirect;
        return;
      }
      if (!res.ok || !body.authUrl) {
        alert(body.error || "Failed to start connection");
        setLoading(false);
        return;
      }
      window.location.href = body.authUrl;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to start connection");
      setLoading(false);
    }
  }

  // Shared base — solid pill, tight typography, glow shadow.
  const base =
    "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm text-white transition-all hover:brightness-110 hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed";

  if (loading) {
    return (
      <button
        type="button"
        disabled
        className={`${base} bg-white/[0.06] border border-[var(--color-border)] text-[var(--color-text-secondary)]`}
      >
        <RefreshCw className="w-4 h-4 animate-spin" /> Opening…
      </button>
    );
  }

  if (connected) {
    // Connected → emerald reconnect pill. Same OAuth flow under the hood,
    // just visually framed as "refresh / re-auth" not "first-time connect".
    return (
      <button
        type="button"
        onClick={start}
        className={`${base} bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-400`}
        style={{
          boxShadow:
            "0 6px 20px rgba(16, 185, 129, 0.32), inset 0 1px 0 rgba(255,255,255,0.18)",
        }}
      >
        <RefreshCw className="w-4 h-4" />
        Reconnect
      </button>
    );
  }

  // Not connected → magenta brand gradient.
  return (
    <button
      type="button"
      onClick={start}
      className={`${base}`}
      style={{
        background:
          "linear-gradient(135deg, var(--gradient-brand-from) 0%, var(--gradient-brand-via) 50%, var(--gradient-brand-to) 100%)",
        boxShadow:
          "0 6px 20px rgba(217, 70, 239, 0.42), inset 0 1px 0 rgba(255,255,255,0.22)",
      }}
    >
      Connect
      <ArrowRight className="w-4 h-4" />
    </button>
  );
}
