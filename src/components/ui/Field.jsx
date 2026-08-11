import { useId } from 'react';
import { cn } from '../../lib/utils';

/**
 * Campos de formulario con etiqueta real.
 *
 * Antes los formularios se apoyaban solo en el `placeholder`, que
 * desaparece al escribir y no es un nombre accesible (WCAG 3.3.2). Aquí la
 * etiqueta siempre existe y siempre está asociada por id.
 *
 * Altura mínima 44px: se llenan desde un teléfono, en el campo.
 */

const CONTROL = [
  'w-full min-h-11 rounded-md border border-ink-400 bg-white px-3 py-2',
  'text-base text-ink-900 placeholder:text-ink-500',
  'transition-colors duration-150',
  'hover:border-ink-400',
  'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none',
  'disabled:bg-ink-100 disabled:text-ink-500 disabled:cursor-not-allowed'
].join(' ');

export function Field({ label, hint, error, required, children, className }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const control = typeof children === 'function'
    ? children({
        id,
        className: cn(CONTROL, error && 'border-risk focus:border-risk focus:ring-risk/20'),
        'aria-describedby': cn(hint && hintId, error && errorId) || undefined,
        'aria-invalid': error ? true : undefined,
        required
      })
    : children;

  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className="block text-xs font-medium text-ink-700 mb-1.5">
        {label}
        {required && <span className="text-risk ml-0.5" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (obligatorio)</span>}
      </label>

      {control}

      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-500 mt-1.5 leading-relaxed">{hint}</p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-risk mt-1.5 leading-relaxed">{error}</p>
      )}
    </div>
  );
}

export function Input({ className, ...props }) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cn(CONTROL, 'appearance-none bg-white pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, rows = 3, ...props }) {
  return <textarea rows={rows} className={cn(CONTROL, 'min-h-24 py-2.5', className)} {...props} />;
}

/**
 * Buscador. Se declara como `role="search"` para que se pueda saltar a él.
 */
export function SearchInput({ value, onChange, placeholder = 'Buscar…', label = 'Buscar', className }) {
  const id = useId();
  return (
    <div role="search" className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(CONTROL, 'pl-3')}
      />
    </div>
  );
}
