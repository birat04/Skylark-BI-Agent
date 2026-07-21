"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HealthResponse {
  status: string;
  lastSync: { finishedAt: string | null; rowsUpserted: string | null } | null;
}

export function SyncStatusBadge() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function loadHealth() {
    try {
      const res = await fetch("/api/health");
      if (res.ok) setHealth(await res.json());
    } catch {
      // health check failing is surfaced via the badge staying on "unknown"
    }
  }

  useEffect(() => {
    loadHealth();
  }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/sync", { method: "POST" });
      await loadHealth();
    } finally {
      setSyncing(false);
    }
  }

  const lastSyncedAt = health?.lastSync?.finishedAt
    ? new Date(health.lastSync.finishedAt).toLocaleString()
    : "never synced";

  return (
    <div className="flex items-center justify-between gap-2 px-2 py-2 text-xs text-muted-foreground">
      <Badge variant="secondary" className="font-mono font-normal">
        {lastSyncedAt}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        className="size-6"
        onClick={handleSync}
        disabled={syncing}
        title="Sync now"
      >
        <RefreshCw className={syncing ? "size-3.5 animate-spin" : "size-3.5"} />
      </Button>
    </div>
  );
}
