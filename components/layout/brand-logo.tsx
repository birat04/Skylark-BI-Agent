import { Bird } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  showText?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function BrandLogo({
  showText = true,
  size = "md",
  className,
}: BrandLogoProps) {
  const iconSize = size === "sm" ? "size-3.5" : "size-4";
  const boxSize = size === "sm" ? "size-7" : "size-8";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-linear-to-br from-sky-400 to-teal-500 shadow-sm",
          boxSize
        )}
      >
        <Bird className={cn(iconSize, "text-white")} />
      </div>
      {showText && (
        <div className="flex flex-col leading-tight">
          <span
            className={cn(
              "font-semibold tracking-tight text-foreground",
              size === "sm" ? "text-sm" : "text-base"
            )}
          >
            Skylark
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            BI Agent
          </span>
        </div>
      )}
    </div>
  );
}
