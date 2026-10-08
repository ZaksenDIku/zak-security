"use client";

import { useTransition, useState } from "react";
import { PlayCircle, CheckCircle2 } from "lucide-react";
import { runSafeCheckAction, reverifyFindingAction } from "@/app/actions";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";

export function RunCheckButton({
  assetId,
  authorized,
  label = "Run safe check",
  className,
}: {
  assetId: string;
  authorized: boolean;
  label?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [started, setStarted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const busy = pending || isPending;

  return (
    <div className={cn("flex flex-col items-end gap-1.5", className)}>
      <Button
        type="button"
        variant="primary"
        size="sm"
        disabled={busy}
        onClick={() => {
          setPending(true);
          startTransition(async () => {
            await runSafeCheckAction(assetId);
            setPending(false);
          });
        }}
      >
        <PlayCircle className="size-3.5" strokeWidth={2} />
        {busy ? "Checking…" : label}
      </Button>
      <p className="max-w-[260px] text-right text-[10.5px] leading-snug text-fg-subtle">
        {authorized
          ? "Authorized asset. Passive check is permitted within the recorded scope."
          : "No active authorization. Only public passive inspection will run."}
      </p>
      {started ? null : null}
    </div>
  );
}

export function ReverifyButton({ findingId, disabled }: { findingId: string; disabled?: boolean }) {
  const [pending, setPending] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      disabled={disabled || pending || isPending}
      onClick={() => {
        setPending(true);
        startTransition(async () => {
          await reverifyFindingAction(findingId);
          setPending(false);
        });
      }}
      title={
        disabled
          ? "Re-test needs an active authorization for this asset."
          : "Re-run the originating check and close the finding if it no longer reproduces."
      }
    >
      <CheckCircle2 className="size-3.5" strokeWidth={2} />
      {pending || isPending ? "Re-testing…" : "Re-test"}
    </Button>
  );
}
