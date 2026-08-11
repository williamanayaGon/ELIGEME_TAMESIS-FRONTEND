import { SinRegistrar } from './Stat';

/**
 * Medidor de una razón contra su total.
 *
 * Reemplaza el donut de `conic-gradient` que había en Cobertura. Un donut
 * de dos porciones es la peor forma de mostrar una sola razón: obliga a
 * comparar ángulos cuando basta comparar longitudes, y no tenía nombre
 * accesible de ningún tipo.
 *
 * La pista es un paso claro del mismo hue, no gris: así el medidor se lee
 * como una escala y no como dos categorías en competencia.
 */
export function Meter({ label, value, total, formula }) {
  const medible = total > 0;
  const pct = medible ? Math.round((value / total) * 100) : null;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
        {medible ? (
          <p className="text-sm font-semibold text-ink-900" data-numeral>
            {value}<span className="text-ink-500 font-normal"> de {total}</span>
          </p>
        ) : (
          <p className="text-sm"><SinRegistrar /></p>
        )}
      </div>

      {medible ? (
        <>
          <div
            role="meter"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${label}: ${pct}%`}
            className="mt-2 h-2.5 w-full rounded-full bg-brand-100 overflow-hidden"
          >
            <div
              className="h-full rounded-full bg-brand-600 transition-[width] duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          {formula && <p className="mt-2 text-xs text-ink-500">{formula}</p>}
        </>
      ) : (
        <div aria-hidden="true" className="mt-2 h-2.5 w-full rounded-full bg-ink-100" />
      )}
    </div>
  );
}

/**
 * Lista de barras horizontales para magnitudes nominales (patologías).
 *
 * Un solo tono: la longitud ya codifica la cantidad, colorear cada fila
 * distinto gastaría el canal de identidad en algo que no lo necesita.
 * Cada fila lleva su cifra escrita — el color nunca es el único dato.
 */
export function BarList({ items, total, emptyLabel = 'Sin registrar' }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-ink-500 italic py-6 text-center">{emptyLabel}</p>;
  }

  // La barra se mide contra el total, igual que el porcentaje que va al
  // lado. Antes la barra usaba el máximo de la lista y la etiqueta el
  // total: dos denominadores distintos en la misma fila, así que una barra
  // llena podía estar rotulada "20%".
  const base = total > 0 ? total : Math.max(...items.map(i => i.value), 1);

  return (
    <ul className="space-y-3.5">
      {items.map((item) => {
        const share = total > 0 ? Math.round((item.value / total) * 100) : null;
        return (
          <li key={item.label}>
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
              <span className="text-sm text-ink-800 truncate">{item.label}</span>
              <span className="text-sm font-semibold text-ink-900 shrink-0" data-numeral>
                {item.value}
                {share !== null && (
                  <span className="text-ink-500 font-normal text-xs ml-1.5">{share}%</span>
                )}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-ink-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-600"
                style={{ width: `${Math.max((item.value / base) * 100, 2)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Distribución ordinal compacta (grupos de edad). El orden importa, así
 * que el color lo refleja: mismo hue, más oscuro conforme avanza la escala.
 */
export function OrdinalSplit({ segments, total }) {
  if (!total) {
    return <p className="text-sm text-ink-500 italic py-4">Sin registrar</p>;
  }

  return (
    <div>
      {/* gap-0.5 deja el respiro de 2px entre segmentos que pide el sistema */}
      <div className="flex gap-0.5 h-3 rounded-full overflow-hidden bg-ink-100">
        {segments.map((s) => (
          s.value > 0 && (
            <div
              key={s.label}
              style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
              title={`${s.label}: ${s.value}`}
            />
          )
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        {segments.map((s) => (
          <div key={s.label}>
            <dt className="flex items-center gap-1.5 text-xs text-ink-500">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </dt>
            <dd className="text-lg font-semibold text-ink-900 mt-0.5 ml-3.5" data-numeral>
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
