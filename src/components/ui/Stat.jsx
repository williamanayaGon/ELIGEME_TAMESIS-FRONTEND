import { MdArrowForward } from 'react-icons/md';
import { cn } from '../../lib/utils';

/**
 * Indicador del tablero.
 *
 * Implementa la regla central del proyecto: nada inventado.
 *
 *   · Un valor REGISTRADO es un conteo y se muestra tal cual.
 *   · Un valor CALCULADO llega acompañado de su fórmula, visible, sin
 *     tener que pasar el mouse por encima.
 *   · Si no hay base para calcular, NO se publica un 0%. Se publica
 *     "Sin registrar", que es lo único cierto.
 *
 * Ese último punto es la razón de ser del componente. El tablero anterior
 * hacía `patients.length || 1` y publicaba 0% de cobertura sobre cero
 * pacientes, que es exactamente el número plausible que CLAUDE.md prohíbe.
 */

export function SinRegistrar({ className }) {
  return (
    <span className={cn('text-ink-500 font-normal italic', className)}>
      Sin registrar
    </span>
  );
}

const TONES = {
  neutral: 'text-ink-900',
  brand: 'text-brand-700',
  ok: 'text-ok',
  warn: 'text-accent-700',
  risk: 'text-risk'
};

export function StatCard({
  label,
  value,
  unit,
  formula,
  tone = 'neutral',
  hint,
  onClick,
  actionLabel
}) {
  const registrado = value !== null && value !== undefined;
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      {...(onClick
        ? { type: 'button', onClick, className: 'text-left w-full group' }
        : {})}
      className={cn(
        'bg-white border border-ink-200 rounded-lg shadow-e1 p-5 flex flex-col',
        onClick &&
          'text-left w-full group transition-shadow duration-200 hover:shadow-e2 hover:border-ink-300'
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
        {label}
      </p>

      <p className="mt-2.5 flex items-baseline gap-1">
        {registrado ? (
          <>
            <span
              data-numeral
              className={cn('text-3xl font-bold tracking-tight leading-none', TONES[tone])}
            >
              {value}
            </span>
            {unit && (
              <span className={cn('text-lg font-semibold leading-none', TONES[tone])}>
                {unit}
              </span>
            )}
          </>
        ) : (
          <span className="text-lg leading-none py-1.5">
            <SinRegistrar />
          </span>
        )}
      </p>

      {/* La fórmula no es un tooltip: es parte del dato. */}
      {registrado && formula && (
        <p className="mt-2.5 text-xs text-ink-500 leading-relaxed">{formula}</p>
      )}
      {!registrado && hint && (
        <p className="mt-2.5 text-xs text-ink-500 leading-relaxed">{hint}</p>
      )}

      {onClick && actionLabel && (
        <span className="mt-3 pt-3 border-t border-ink-100 text-xs font-medium text-brand-600 inline-flex items-center gap-1.5">
          {actionLabel}
          <MdArrowForward
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </span>
      )}
    </Tag>
  );
}

/**
 * Par etiqueta/valor. Cuando no hay dato dice "Sin registrar" en lugar de
 * dejar el hueco en blanco o poner un guion suelto.
 */
export function Dato({ label, value, className }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
        {label}
      </dt>
      <dd className="text-sm text-ink-900 mt-1 break-words">
        {value === null || value === undefined || value === '' ? <SinRegistrar /> : value}
      </dd>
    </div>
  );
}
