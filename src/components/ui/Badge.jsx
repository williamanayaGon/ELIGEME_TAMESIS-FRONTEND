import { cn } from '../../lib/utils';

/**
 * Etiqueta de estado.
 *
 * Superficie suave + tinta oscura del mismo tono. Nunca texto gris sobre
 * fondo de color: se lava y baja del mínimo de contraste.
 */

const TONES = {
  neutral: 'bg-ink-100 text-ink-700 border-ink-200',
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
  ok: 'bg-ok-soft text-ok-strong border-ok-border',
  warn: 'bg-warn-soft text-warn-strong border-warn-border',
  risk: 'bg-risk-soft text-risk-strong border-risk-border',
  accent: 'bg-accent-100 text-accent-800 border-accent-200'
};

export default function Badge({ tone = 'neutral', icon, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5',
        'text-xs font-medium whitespace-nowrap',
        TONES[tone],
        className
      )}
    >
      {icon && <span aria-hidden="true" className="text-sm shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

/**
 * Punto de estado con su texto. El color nunca va solo: siempre lleva la
 * palabra al lado, porque el color por sí mismo no es información
 * accesible (WCAG 1.4.1).
 */
export function StatusDot({ tone = 'neutral', children }) {
  const dot = {
    neutral: 'bg-ink-400',
    ok: 'bg-ok',
    warn: 'bg-accent-500',
    risk: 'bg-risk',
    brand: 'bg-brand-600'
  }[tone];

  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-800">
      <span aria-hidden="true" className={cn('h-2 w-2 rounded-full shrink-0', dot)} />
      {children}
    </span>
  );
}
