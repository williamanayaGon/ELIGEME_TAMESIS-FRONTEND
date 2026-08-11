import { cn } from '../../lib/utils';

/**
 * Botón del sistema.
 *
 * Las alturas no bajan de 44px en las variantes que se usan en el campo:
 * el mínimo táctil de WCAG 2.5.5, con cuidadores operando a pulso en la
 * casa del paciente.
 */

const VARIANTS = {
  primary:
    'bg-brand-700 text-white shadow-e1 hover:bg-brand-800 active:bg-brand-900 disabled:bg-ink-200 disabled:text-ink-500 disabled:shadow-none',
  secondary:
    'bg-white text-ink-800 border border-ink-400 shadow-e1 hover:bg-ink-50 hover:border-ink-500 active:bg-ink-100 disabled:bg-ink-50 disabled:text-ink-500 disabled:shadow-none',
  ghost:
    'bg-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-900 active:bg-ink-200 disabled:text-ink-400',
  accent:
    'bg-accent-300 text-brand-900 shadow-e1 hover:bg-accent-400 active:bg-accent-500 disabled:bg-ink-200 disabled:text-ink-500 disabled:shadow-none',
  ok:
    'bg-ok text-white shadow-e1 hover:bg-ok-strong active:bg-ok-strong disabled:bg-ink-200 disabled:text-ink-500 disabled:shadow-none',
  risk:
    'bg-white text-risk border border-risk-border shadow-e1 hover:bg-risk-soft active:bg-risk-soft disabled:bg-ink-50 disabled:text-ink-400',
  riskSolid:
    'bg-risk text-white shadow-e1 hover:bg-risk-strong active:bg-risk-strong disabled:bg-ink-200 disabled:text-ink-500'
};

const SIZES = {
  sm: 'min-h-9 px-3 text-xs gap-1.5',
  md: 'min-h-11 px-4 text-sm gap-2',
  lg: 'min-h-12 px-6 text-base gap-2'
};

export default function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap',
        'transition-colors duration-150',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin"
        />
      ) : (
        icon && <span aria-hidden="true" className="text-base shrink-0">{icon}</span>
      )}
      {children}
      {iconRight && !loading && <span aria-hidden="true" className="text-base shrink-0">{iconRight}</span>}
    </button>
  );
}
