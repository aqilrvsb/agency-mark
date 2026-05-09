"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, RefreshCw } from "lucide-react";

export function ConnectButton({ platform, connected }: { platform: string; connected: boolean }) {
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const res = await fetch(`/api/client/connect/${platform}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const body = await res.json();
      if (!res.ok || !body.authUrl) {
        alert(body.error || "Failed to start connection");
        setLoading(false);
        return;
      }
      // Redirect the browser to Zernio's OAuth URL
      window.location.href = body.authUrl;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to start connection");
      setLoading(false);
    }
  }

  return (
    <Button onClick={start} disabled={loading} variant={connected ? "secondary" : "primary"} className="w-full">
      {loading ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" /> Opening...
        </>
      ) : connected ? (
        <>
          Reconnect <ArrowRight className="w-4 h-4" />
        </>
      ) : (
        <>
          Connect <ArrowRight className="w-4 h-4" />
        </>
      )}
    </Button>
  );
}
