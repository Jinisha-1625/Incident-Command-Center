import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
  {
    variants: {
      tone: {
        sev1: "bg-red-600 text-white",
        sev2: "bg-orange-500 text-slate-950",
        sev3: "bg-amber-400 text-slate-950",
        sev4: "bg-slate-500 text-white",
        open: "bg-sky-900 text-sky-200 border border-sky-700",
        acknowledged: "bg-violet-900 text-violet-200 border border-violet-700",
        mitigated: "bg-emerald-900 text-emerald-200 border border-emerald-700",
        request: "bg-amber-900 text-amber-100 border border-amber-700",
        resolved: "bg-slate-800 text-slate-300 border border-slate-600",
      },
    },
  }
);

export function Badge({ className, tone, ...props }) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
