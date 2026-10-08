import Link from "next/link";
import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  as = "div",
}: {
  className?: string;
  children: React.ReactNode;
  as?: "div";
}) {
  return <div className={cn("card", className)}>{children}</div>;
}

export function CardHeader({
  title,
  description,
  action,
  icon,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? <span className="mt-0.5 text-fg-subtle">{icon}</span> : null}
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold tracking-tight text-fg">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[12px] leading-relaxed text-fg-subtle">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  href,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "neutral" | "danger" | "warn" | "good" | "info";
  href?: string;
  icon?: React.ReactNode;
}) {
  const toneRing: Record<string, string> = {
    neutral: "text-fg",
    danger: "text-rose-300",
    warn: "text-amber-300",
    good: "text-emerald-300",
    info: "text-sky-300",
  };

  const body = (
    <div className="card card-hover h-full px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium tracking-wide text-fg-subtle uppercase">{label}</span>
        {icon ? <span className="text-fg-subtle">{icon}</span> : null}
      </div>
      <div className={cn("mt-2 font-mono text-2xl leading-none font-semibold tabular-nums", toneRing[tone])}>
        {value}
      </div>
      {hint ? <div className="mt-1.5 text-[11.5px] leading-snug text-fg-subtle">{hint}</div> : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block rounded-[10px] focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-[13px] font-medium text-fg-muted">{title}</p>
      {hint ? <p className="mt-1 max-w-md text-[12px] text-fg-subtle">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
