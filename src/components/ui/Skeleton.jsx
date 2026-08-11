import { cn } from '../../lib/utils';

/**
 * Estados de carga.
 *
 * Antes no había ninguno en todo el proyecto: mientras cargaban seis
 * peticiones en paralelo, el tablero mostraba 0 pacientes y 0% de
 * cobertura. Con señal intermitente en zona rural eso no se lee como
 * "cargando", se lee como "el programa está vacío".
 *
 * El esqueleto imita la forma del contenido que viene, para que el salto
 * al llegar los datos sea mínimo.
 */

export function Skeleton({ className, ...props }) {
  return <div className={cn('skeleton', className)} {...props} />;
}

/** Envuelve una región que carga. Anuncia el cambio a lectores de pantalla. */
export function LoadingRegion({ loading, label = 'Cargando datos', skeleton, children }) {
  if (loading) {
    return (
      <div role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">{label}…</span>
        <div aria-hidden="true">{skeleton}</div>
      </div>
    );
  }
  return children;
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white border border-ink-200 rounded-lg shadow-e1 p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-20 mt-3" />
      <Skeleton className="h-3 w-full mt-3.5" />
      <Skeleton className="h-3 w-2/3 mt-1.5" />
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }, (_, i) => <StatCardSkeleton key={i} />)}
    </div>
  );
}

export function ChartSkeleton({ height = 'h-[280px]' }) {
  return (
    <div className="bg-white border border-ink-200 rounded-lg shadow-e1 p-5">
      <Skeleton className="h-4 w-40" />
      <div className={cn('mt-5 flex items-end gap-3', height)}>
        {[52, 78, 41, 88, 63, 34].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="bg-white border border-ink-200 rounded-lg shadow-e1 overflow-hidden">
      <div className="border-b border-ink-200 bg-ink-50 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="px-4 py-3.5 flex gap-4 border-b border-ink-100 last:border-0">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className={cn('h-3.5 flex-1', c === 0 && 'flex-[1.6]')} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-white border border-ink-200 rounded-lg shadow-e1 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2 mt-2" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-16 w-full mt-4 rounded-md" />
          <div className="flex gap-3 mt-4">
            <Skeleton className="h-11 flex-1 rounded-md" />
            <Skeleton className="h-11 flex-1 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="bg-white border border-ink-200 rounded-lg shadow-e1 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64 mt-2" />
            </div>
            <Skeleton className="h-11 w-40 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
