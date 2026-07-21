import { AppSidebar } from "@/components/layout/app-sidebar";
import { BarChart3, GitMerge, FileText } from "lucide-react";

const CAPABILITIES = [
  {
    icon: BarChart3,
    title: "Pipeline & operations queries",
    description:
      "Ask about revenue, sector performance, or work-order status — grounded in the last sync, with data-quality caveats surfaced automatically.",
  },
  {
    icon: GitMerge,
    title: "Cross-board reasoning",
    description:
      "Questions spanning Deals and Work Orders are joined by deal name, with the match rate and any ambiguity stated explicitly.",
  },
  {
    icon: FileText,
    title: "Leadership briefs",
    description:
      "Ask for a leadership update and get a structured, grounded summary — pipeline by sector, operational status, data-quality notes.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto skylark-hero-glow">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <p className="text-xs font-medium uppercase tracking-widest text-sky-400/80">
            Business Intelligence
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            <span className="skylark-gradient-text">Skylark BI Agent</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg leading-relaxed">
            Ask questions about your Work Orders and Deals boards using the
            assistant in the bottom-right corner — available on every page.
          </p>

          <div className="mt-12 grid gap-4">
            {CAPABILITIES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex gap-4 rounded-xl border border-border bg-card/50 p-4 transition-colors hover:bg-card"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
                  <Icon className="size-4 text-sky-400" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-foreground">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
