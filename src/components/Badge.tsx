import { cn } from "@/lib/cn";

export function Badge({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  );
}

export function DemoBadge({ mode }: { mode: "REAL" | "DEMO" }) {
  if (mode === "REAL") return null;
  return (
    <Badge
      className="bg-amber-500/12 text-amber-300 ring-1 ring-amber-500/30"
      title="Fictional sample record. Not a real company, domain or advisory."
    >
      DEMO DATA
    </Badge>
  );
}

export function Dot({ className }: { className?: string }) {
  return <span className={cn("size-1.5 shrink-0 rounded-full", className)} />;
}
