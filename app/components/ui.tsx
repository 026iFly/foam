/**
 * Intellifoam UI primitives — the single source of truth for buttons, cards,
 * status chips and page scaffolding across the public site and admin.
 * Tailwind-only, no runtime deps.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/* ---------------------------------------------------------------- Button */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';
const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-green-700 text-white hover:bg-green-800',
  secondary: 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50',
  ghost: 'text-green-700 hover:bg-green-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function Button({
  children, href, variant = 'primary', size = 'md', className, type = 'button', ...rest
}: {
  children: ReactNode; href?: string; variant?: ButtonVariant; size?: ButtonSize; className?: string;
  type?: 'button' | 'submit'; onClick?: () => void; disabled?: boolean; title?: string;
  target?: string; rel?: string;
}) {
  const cls = cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);
  if (href) {
    const external = /^https?:|^mailto:|^tel:/.test(href);
    if (external) return <a href={href} className={cls} target={rest.target} rel={rest.rel}>{children}</a>;
    return <Link href={href} className={cls}>{children}</Link>;
  }
  return (
    <button type={type} className={cls} onClick={rest.onClick} disabled={rest.disabled} title={rest.title}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Card */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)]', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action, className }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-200', className)}>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {action}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

/* ----------------------------------------------------------------- Badge */
export type BadgeVariant = 'success' | 'warning' | 'info' | 'danger' | 'neutral';
const badgeVariants: Record<BadgeVariant, string> = {
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-800',
  info: 'bg-blue-50 text-blue-700',
  danger: 'bg-red-50 text-red-700',
  neutral: 'bg-gray-100 text-gray-800',
};

export function Badge({ children, variant = 'neutral', className }: { children: ReactNode; variant?: BadgeVariant; className?: string }) {
  return (
    <span className={cn('inline-flex items-center h-6 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap', badgeVariants[variant], className)}>
      {children}
    </span>
  );
}

/** Quote / booking status → chip. Centralises the status maps that were duplicated per page. */
const statusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  pending:   { label: 'Väntar',     variant: 'warning' },
  reviewed:  { label: 'Granskad',   variant: 'info' },
  quoted:    { label: 'Offererad',  variant: 'info' },
  sent:      { label: 'Skickad',    variant: 'info' },
  accepted:  { label: 'Accepterad', variant: 'success' },
  confirmed: { label: 'Bekräftad',  variant: 'success' },
  completed: { label: 'Klar',       variant: 'success' },
  rejected:  { label: 'Avböjd',     variant: 'danger' },
  declined:  { label: 'Avböjd',     variant: 'danger' },
  cancelled: { label: 'Avbokad',    variant: 'neutral' },
  in_progress: { label: 'Pågår',    variant: 'info' },
  urgent:    { label: 'Brådskande', variant: 'danger' },
  high:      { label: 'Hög',        variant: 'warning' },
  medium:    { label: 'Normal',     variant: 'neutral' },
  low:       { label: 'Låg',        variant: 'neutral' },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = statusMap[status] ?? { label: status, variant: 'neutral' as BadgeVariant };
  return <Badge variant={s.variant} className={className}>{s.label}</Badge>;
}

/* ------------------------------------------------------------ Page shell */
export function PageHeader({
  title, subtitle, actions, backHref, backLabel,
}: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; backHref?: string; backLabel?: string }) {
  return (
    <div className="flex flex-col gap-3 mb-6">
      {backHref && (
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-800 self-start">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
          {backLabel ?? 'Tillbaka'}
        </Link>
      )}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-2xl md:text-[28px] font-bold text-gray-900 leading-tight">{title}</h1>
          {subtitle && <div className="text-sm text-gray-600">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: string; accent?: boolean }) {
  return (
    <Card className="p-5 flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <span className={cn('text-3xl font-bold leading-none tracking-tight', accent ? 'text-green-700' : 'text-gray-900')}>{value}</span>
      {hint && <span className="text-sm text-gray-600">{hint}</span>}
    </Card>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <Card className="p-10 text-center flex flex-col items-center gap-3">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && <p className="text-gray-700 max-w-md">{description}</p>}
      {action}
    </Card>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-gray-200', className)} />;
}

/* --------------------------------------------------- Public-site helpers */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('max-w-6xl mx-auto px-4 sm:px-6', className)}>{children}</div>;
}

export function SectionTitle({ title, lead, center }: { title: ReactNode; lead?: ReactNode; center?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-3 max-w-2xl', center && 'mx-auto text-center')}>
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">{title}</h2>
      {lead && <p className="text-lg text-gray-700 leading-relaxed">{lead}</p>}
    </div>
  );
}
