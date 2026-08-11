import { cn } from '../../lib/utils';

/**
 * Estado vacío.
 *
 * Dice qué falta y qué hacer al respecto. "No hay datos" no es un estado
 * vacío: es un callejón sin salida.
 */
export default function EmptyState({ icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'bg-white border border-dashed border-ink-300 rounded-lg',
        'px-6 py-12 flex flex-col items-center text-center',
        className
      )}
    >
      {icon && (
        <span aria-hidden="true" className="text-3xl text-ink-400 mb-3.5">
          {icon}
        </span>
      )}
      <p className="text-base font-medium text-ink-800">{title}</p>
      {description && (
        <p className="text-sm text-ink-500 mt-1.5 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
