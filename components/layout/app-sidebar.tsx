import { BrandLogo } from "@/components/layout/brand-logo";
import { SyncStatusBadge } from "@/components/layout/sync-status-badge";

export function AppSidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col h-full">
      <div className="px-4 py-5 border-b border-sidebar-border">
        <BrandLogo />
      </div>

      <div className="flex-1 px-4 py-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Conversational intelligence over your Work Orders and Deals boards.
        </p>
      </div>

      <div className="border-t border-sidebar-border">
        <SyncStatusBadge />
      </div>
    </aside>
  );
}
