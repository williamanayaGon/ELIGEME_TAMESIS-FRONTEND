import { useEffect, useRef, useId, useCallback } from 'react';
import { MdClose } from 'react-icons/md';
import { cn } from '../../lib/utils';

/**
 * Diálogo accesible.
 *
 * La aplicación tenía quince modales y ninguno era operable con teclado:
 * sin rol, sin foco atrapado, sin Escape y con la página de atrás
 * desplazándose por debajo. Esto lo resuelve en un solo sitio.
 *
 * Cubre WCAG 2.1.2 (sin trampas de teclado), 2.4.3 (orden de foco)
 * y 4.1.2 (nombre y rol).
 */

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl'
};

// El encabezado toma color solo cuando el color significa algo.
const TONES = {
  brand: 'bg-brand-700 text-white',
  ok: 'bg-ok-strong text-white',
  warn: 'bg-accent-700 text-white',
  risk: 'bg-risk-strong text-white',
  neutral: 'bg-ink-800 text-white'
};

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])', 'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  tone = 'brand',
  size = 'lg',
  footer,
  children,
  bodyClassName
}) {
  const panelRef = useRef(null);
  const restoreRef = useRef(null);
  const titleId = useId();
  const descId = useId();

  const focusables = useCallback(
    () => Array.from(panelRef.current?.querySelectorAll(FOCUSABLE) || [])
      .filter(el => el.offsetParent !== null || el === document.activeElement),
    []
  );

  // Escape para cerrar y Tab que da la vuelta dentro del diálogo.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, onClose, focusables]);

  // El fondo no debe desplazarse mientras el diálogo está arriba.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  // Al abrir se entra al diálogo; al cerrar, el foco vuelve a donde estaba.
  // Sin esto el teclado queda al principio de la página tras cada modal.
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement;

    const id = requestAnimationFrame(() => {
      const items = focusables();
      (items[0] || panelRef.current)?.focus();
    });

    return () => {
      cancelAnimationFrame(id);
      const target = restoreRef.current;
      if (target && typeof target.focus === 'function' && document.contains(target)) {
        target.focus();
      }
    };
  }, [open, focusables]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink-900/55 backdrop-blur-[2px] animate-fade"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'w-full bg-white rounded-xl shadow-e4 flex flex-col overflow-hidden outline-none',
          'max-h-[92vh] sm:max-h-[90vh] animate-scale-in',
          SIZES[size]
        )}
      >
        <header className={cn('px-5 sm:px-6 py-4 flex items-start gap-4 shrink-0 on-brand', TONES[tone])}>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold flex items-center gap-2.5 text-white">
              {icon && <span aria-hidden="true" className="text-xl shrink-0 opacity-90">{icon}</span>}
              <span className="truncate">{title}</span>
            </h2>
            {subtitle && (
              <p id={descId} className="text-sm text-white/75 mt-1">{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 -mr-1.5 -mt-0.5 h-11 w-11 inline-flex items-center justify-center rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <MdClose className="text-xl" aria-hidden="true" />
          </button>
        </header>

        <div className={cn('flex-1 overflow-y-auto bg-ink-50', bodyClassName ?? 'p-5 sm:p-6')}>
          {children}
        </div>

        {footer && (
          <footer className="shrink-0 border-t border-ink-200 bg-white px-5 sm:px-6 py-3 flex flex-wrap items-center justify-end gap-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
