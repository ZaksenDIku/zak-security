export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysBetween(a: Date | string, b: Date | string = new Date()): number {
  const start = new Date(a).getTime();
  const end = new Date(b).getTime();
  return Math.round((end - start) / 86_400_000);
}

/** "in 3 days" / "today" / "6 days ago" */
export function relativeDays(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const diff = daysBetween(d);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  return diff > 0 ? `in ${diff} days` : `${Math.abs(diff)} days ago`;
}

export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const seconds = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
