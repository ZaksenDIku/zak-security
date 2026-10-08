import { cn } from "@/lib/cn";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-[12.5px]", className)}>{children}</table>
    </div>
  );
}

export function Th({ children, className, align = "left" }: { children?: React.ReactNode; className?: string; align?: "left" | "right" | "center" }) {
  return (
    <th
      className={cn(
        "border-b border-line px-3.5 py-2 text-[10.5px] font-semibold tracking-wider text-fg-subtle uppercase whitespace-nowrap",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, align = "left" }: { children?: React.ReactNode; className?: string; align?: "left" | "right" | "center" }) {
  return (
    <td
      className={cn(
        "border-b border-line/70 px-3.5 py-2.5 align-middle text-fg-muted",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
    >
      {children}
    </td>
  );
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("transition-colors hover:bg-panel-2/50", className)}>{children}</tr>;
}
