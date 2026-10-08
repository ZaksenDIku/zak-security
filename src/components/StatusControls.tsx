"use client";

import { useState, useTransition } from "react";
import { setFindingStatusAction, setLeadStatusAction } from "@/app/actions";
import { cn } from "@/lib/cn";
import type { FindingStatus, LeadStatus } from "@prisma/client";

const FINDING_STATUSES: FindingStatus[] = ["OPEN", "IN_PROGRESS", "FIXED", "ACCEPTED_RISK"];

export function FindingStatusControl({ findingId, current }: { findingId: string; current: FindingStatus }) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<FindingStatus>(current);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {FINDING_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          disabled={optimistic === s}
          onClick={() => {
            setOptimistic(s);
            startTransition(async () => {
              await setFindingStatusAction(findingId, s);
            });
          }}
          className={cn(
            "rounded-md px-2 py-1 text-[11.5px] font-medium transition-colors",
            optimistic === s
              ? "bg-accent/15 text-accent ring-1 ring-accent/30"
              : "bg-panel-2 text-fg-muted ring-1 ring-line hover:text-fg"
          )}
        >
          {s.replace("_", " ").toLowerCase()}
        </button>
      ))}
    </div>
  );
}

const LEAD_STATUSES: LeadStatus[] = ["NEW", "RESEARCHING", "CONTACTED", "QUALIFIED", "NOT_INTERESTED"];

export function LeadStatusSelect({ leadId, current }: { leadId: string; current: LeadStatus }) {
  const [, startTransition] = useTransition();
  return (
    <select
      defaultValue={current}
      onChange={(e) => {
        const next = e.target.value as LeadStatus;
        startTransition(async () => {
          await setLeadStatusAction(leadId, next);
        });
      }}
      className="h-7 w-full rounded-md bg-panel-2 px-2 text-[11.5px] text-fg ring-1 ring-line outline-none focus:ring-accent/60"
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.toLowerCase().replace("_", " ")}
        </option>
      ))}
    </select>
  );
}
