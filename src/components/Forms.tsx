import { cn } from "@/lib/cn";

const fieldBase =
  "w-full rounded-lg bg-panel-2 px-2.5 py-1.5 text-[12.5px] text-fg ring-1 ring-line-strong outline-none transition-colors placeholder:text-fg-subtle focus:ring-accent/60 disabled:opacity-50";

export function Field({
  label,
  hint,
  children,
  required,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[11px] font-medium tracking-wide text-fg-muted uppercase">
        {label}
        {required ? <span className="ml-0.5 text-rose-400">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] leading-snug text-fg-subtle">{hint}</span> : null}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input {...rest} className={cn(fieldBase, "h-8", className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea {...rest} className={cn(fieldBase, "resize-y leading-relaxed", className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select {...rest} className={cn(fieldBase, "h-8 appearance-none pr-7", className)}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  description,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg bg-panel-2/60 px-2.5 py-2 ring-1 ring-line transition-colors hover:ring-line-strong">
      <input type="checkbox" {...props} className="mt-0.5 size-3.5 accent-[#6d8fff]" />
      <span className="min-w-0">
        <span className="block text-[12px] font-medium text-fg">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[11px] leading-snug text-fg-subtle">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

export function FormSection({
  title,
  description,
  children,
  columns = 2,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
}) {
  const cols = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" }[columns];
  return (
    <section className="border-t border-line px-4 py-4 first:border-t-0">
      <h3 className="text-[12.5px] font-semibold tracking-tight text-fg">{title}</h3>
      {description ? (
        <p className="mt-0.5 mb-3.5 text-[11.5px] leading-relaxed text-fg-subtle">{description}</p>
      ) : (
        <div className="mb-3.5" />
      )}
      <div className={cn("grid grid-cols-1 gap-3", cols)}>{children}</div>
    </section>
  );
}
