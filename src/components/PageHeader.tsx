export function PageHeader({
  title,
  description,
  action,
  meta,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[19px] leading-tight font-semibold tracking-tight text-fg">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed text-fg-muted">{description}</p>
        ) : null}
        {meta ? <div className="mt-2.5 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}
