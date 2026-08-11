import { cn } from '../../lib/utils';

/**
 * Superficie base.
 *
 * Un solo tratamiento de tarjeta en toda la aplicación: borde de 1px,
 * elevación de una capa y radio contenido. Sin filete de color de 4px en
 * el costado — era el tic más repetido del código anterior y no comunicaba
 * nada que el contenido no dijera ya.
 */
export function Card(componentProps) {
  // Se desestructura en el cuerpo y no en la firma a propósito: el proyecto
  // no tiene eslint-plugin-react, así que un parámetro usado solo como
  // etiqueta JSX se reporta como no usado.
  const { as: Tag = 'div', interactive = false, className, children, ...props } = componentProps;

  return (
    <Tag
      className={cn(
        'bg-white border border-ink-200 rounded-lg shadow-e1',
        interactive &&
          'text-left w-full transition-shadow duration-200 hover:shadow-e2 hover:border-ink-300',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

/**
 * Encabezado de tarjeta. El aire va arriba del título, no debajo: así el
 * bloque se lee agrupado con su propio contenido y separado del anterior.
 */
export function CardHeader({ title, description, action, className, children }) {
  return (
    <div className={cn('px-5 pt-5 pb-3 flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {title && <h3 className="text-base font-semibold text-ink-900">{title}</h3>}
        {description && <p className="text-xs text-ink-500 mt-1">{description}</p>}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={cn('px-5 pb-5', className)}>{children}</div>;
}

/**
 * Título de una vista completa, con su explicación opcional.
 */
export function SectionTitle({ title, description, action, className }) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4 mb-5', className)}>
      <div className="min-w-0">
        <h2 className="text-xl font-semibold text-ink-900">{title}</h2>
        {description && <p className="text-sm text-ink-500 mt-1.5 measure">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
