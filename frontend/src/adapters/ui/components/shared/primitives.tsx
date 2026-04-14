import React from 'react';

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sz = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }[size];
  return (
    <div className={`animate-spin rounded-full border-2 border-navy-600 border-t-ocean-400 ${sz}`} />
  );
}

// ─── ErrorBanner ──────────────────────────────────────────────────────────────
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
      <span className="text-base">⚠</span>
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-rose-300 underline underline-offset-2 hover:text-rose-200">
          Retry
        </button>
      )}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant = 'compliant' | 'noncompliant' | 'surplus' | 'deficit' | 'neutral';

const BADGE_STYLES: Record<BadgeVariant, string> = {
  compliant:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  noncompliant: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  surplus:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  deficit:      'bg-rose-500/15 text-rose-400 border-rose-500/30',
  neutral:      'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export function Badge({ variant, children }: { variant: BadgeVariant; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium font-mono ${BADGE_STYLES[variant]}`}>
      {children}
    </span>
  );
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────
export function KpiCard({
  label,
  value,
  unit,
  variant = 'neutral',
  loading = false,
}: {
  label: string;
  value: string | number;
  unit?: string;
  variant?: 'positive' | 'negative' | 'neutral';
  loading?: boolean;
}) {
  const valueColor = {
    positive: 'text-emerald-400',
    negative: 'text-rose-400',
    neutral:  'text-ocean-400',
  }[variant];

  return (
    <div className="rounded-xl border border-navy-600 bg-navy-800/60 p-4 backdrop-blur-sm">
      <p className="mb-1 text-xs font-medium uppercase tracking-widest text-slate-500">{label}</p>
      {loading ? (
        <div className="mt-1 h-7 w-24 animate-pulse rounded bg-navy-600" />
      ) : (
        <p className={`font-mono text-xl font-semibold ${valueColor}`}>
          {value}
          {unit && <span className="ml-1 text-sm font-normal text-slate-500">{unit}</span>}
        </p>
      )}
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const BTN_STYLES: Record<ButtonVariant, string> = {
  primary:   'bg-ocean-500 text-white hover:bg-ocean-400',
  secondary: 'bg-navy-700 text-slate-200 border border-navy-600 hover:bg-navy-600',
  danger:    'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30',
  ghost:     'text-slate-400 hover:text-white hover:bg-navy-700',
};

const BTN_DISABLED_STYLES: Record<ButtonVariant, string> = {
  primary:   'bg-navy-700 text-slate-600 border border-navy-600 cursor-not-allowed',
  secondary: 'bg-navy-800 text-slate-600 border border-navy-700 cursor-not-allowed',
  danger:    'bg-navy-800 text-slate-600 border border-navy-700 cursor-not-allowed',
  ghost:     'text-slate-600 cursor-not-allowed',
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled = false,
  children,
  onClick,
  type = 'button',
  className = '',
}: {
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
}) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        isDisabled ? BTN_DISABLED_STYLES[variant] : BTN_STYLES[variant]
      } ${className}`}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
export function Table({
  headers,
  children,
  empty = 'No data available.',
  isEmpty = false,
}: {
  headers: string[];
  children: React.ReactNode;
  empty?: string;
  isEmpty?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-navy-600">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-navy-600 bg-navy-800">
            {headers.map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-10 text-center text-slate-500">
                {empty}
              </td>
            </tr>
          ) : children}
        </tbody>
      </table>
    </div>
  );
}

export function Tr({ children, highlight = false }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <tr className={`border-b border-navy-700 transition-colors last:border-0 ${highlight ? 'bg-ocean-500/5' : 'hover:bg-navy-800/50'}`}>
      {children}
    </tr>
  );
}

export function Td({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`px-4 py-3 text-slate-300 ${mono ? 'font-mono text-xs' : ''}`}>
      {children}
    </td>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select({
  value,
  onChange,
  options,
  placeholder = 'All',
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-slate-300 focus:border-ocean-500 focus:outline-none"
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  label,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-slate-500">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-ocean-500 focus:outline-none"
      />
    </div>
  );
}