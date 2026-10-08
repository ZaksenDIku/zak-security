export function Button({
  children,
  variant = "default",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost" | "danger";
  size?: "sm" | "md";
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-45";
  const sizes = {
    sm: "h-7 px-2.5 text-[12px]",
    md: "h-8 px-3 text-[12.5px]",
  };
  const variants = {
    default:
      "bg-panel-2 text-fg ring-1 ring-line-strong hover:bg-line hover:ring-line-strong",
    primary: "bg-accent text-white hover:bg-accent/85",
    ghost: "text-fg-muted hover:bg-panel-2 hover:text-fg",
    danger: "bg-rose-500/12 text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-500/20",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  children,
  href,
  variant = "default",
  size = "md",
  className = "",
}: {
  children: React.ReactNode;
  href: string;
  variant?: "default" | "primary" | "ghost" | "danger";
  size?: "sm" | "md";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors";
  const sizes = { sm: "h-7 px-2.5 text-[12px]", md: "h-8 px-3 text-[12.5px]" };
  const variants = {
    default: "bg-panel-2 text-fg ring-1 ring-line-strong hover:bg-line",
    primary: "bg-accent text-white hover:bg-accent/85",
    ghost: "text-fg-muted hover:bg-panel-2 hover:text-fg",
    danger: "bg-rose-500/12 text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-500/20",
  };
  return (
    <a href={href} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </a>
  );
}
