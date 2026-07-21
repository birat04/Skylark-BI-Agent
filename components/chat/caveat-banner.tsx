import { AlertTriangle } from "lucide-react";

export function CaveatBanner({ caveats }: { caveats: string[] }) {
  if (caveats.length === 0) return null;

  return (
    <div className="border-l-2 border-warning bg-warning/10 rounded-r-md px-3 py-2 my-2 space-y-1">
      {caveats.map((caveat, i) => (
        <p key={i} className="text-sm text-foreground/90 flex gap-2">
          <AlertTriangle className="size-4 shrink-0 mt-0.5 text-warning" />
          <span>{caveat}</span>
        </p>
      ))}
    </div>
  );
}
