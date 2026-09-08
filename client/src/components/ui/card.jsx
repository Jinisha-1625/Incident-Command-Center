import { cn } from "@/lib/utils";

export function Card({ className, ...props }) {
  return (
    <div
      className={cn("rounded-xl border border-slate-800 bg-slate-900/80 shadow-sm", className)}
      {...props}
    />
  );
}
