import { cn } from '../../lib/utils';

/**
 * Tabla de datos.
 *
 * Las tablas anteriores eran `<table>` de 4 a 6 columnas sin contenedor:
 * en 390px de ancho empujaban la página entera y aparecía scroll
 * horizontal en todo el documento. Aquí el desplazamiento vive dentro de
 * la tabla y la página nunca se mueve de lado.
 */

export function Table({ minWidth = 'min-w-[640px]', children, className }) {
  return (
    <div className={cn('bg-white border border-ink-200 rounded-lg shadow-e1 overflow-hidden', className)}>
      <div className="table-scroll">
        <table className={cn('w-full text-left border-collapse', minWidth)}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function Th({ align = 'left', children, className, ...props }) {
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-600',
        'bg-ink-50 border-b border-ink-200 whitespace-nowrap',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ align = 'left', children, className, ...props }) {
  return (
    <td
      className={cn(
        'px-4 py-3.5 text-sm text-ink-800 align-middle',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}

export function Tr({ children, className, ...props }) {
  return (
    <tr
      className={cn(
        'border-b border-ink-100 last:border-0 transition-colors duration-100 hover:bg-ink-50',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}
