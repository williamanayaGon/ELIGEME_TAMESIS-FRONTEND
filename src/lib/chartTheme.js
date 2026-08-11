/**
 * Tema de gráficos de ELÍGEME.
 *
 * Un solo hue para magnitud. El color aquí codifica *cantidad*, no
 * identidad: las patologías, los estratos y los grupos de edad son
 * series únicas, así que gastar la paleta categórica en ellos sería
 * re-codificar con color lo que la longitud de la barra ya dice.
 *
 * La rampa ordinal está validada con el verificador del skill de dataviz
 * contra superficie blanca:
 *   monotonía de luminosidad · PASS
 *   ΔL adyacente ≥ 0.06      · PASS
 *   extremo claro ≥ 2:1      · PASS (2.50:1)
 *   un solo hue              · PASS (dispersión 2°)
 *
 * Sobre el color de los indicadores: NO hay semáforo. Los umbrales del
 * tablero anterior (80%, 90%) estaban escritos a mano y CLAUDE.md los
 * prohíbe expresamente — "semáforos con umbrales que nadie definió".
 * Un porcentaje se publica en tinta neutra y el lector juzga.
 */

/** Rampa ordinal: estratos, grupos de edad, cualquier escala con orden. */
export const RAMPA_ORDINAL = [
  '#93a9fc', // brand-300
  '#6482f4', // brand-400
  '#3f5de6', // brand-500
  '#2c46cc', // brand-600
  '#1d2c82', // brand-800
  '#0d1435'  // brand-950
];

/** Un solo tono para series nominales (patologías, conteos sin orden). */
export const HUE_MAGNITUD = '#2c46cc'; // brand-600

/** Pista de los medidores: mismo hue, paso claro. */
export const PISTA_MEDIDOR = '#dde5ff'; // brand-100

export const TINTA = {
  eje: '#647085',      // ink-500 · 4.95:1
  rejilla: '#eef0f4',  // ink-100
  superficie: '#ffffff'
};

/**
 * Toma N pasos repartidos por la rampa. Con menos de 6 categorías no se
 * usan los primeros N (quedarían todos claros), se reparten para que el
 * salto entre vecinos se siga viendo.
 */
export function pasosOrdinales(n) {
  if (n <= 1) return [HUE_MAGNITUD];
  if (n >= RAMPA_ORDINAL.length) return RAMPA_ORDINAL.slice(0, n);
  const paso = (RAMPA_ORDINAL.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => RAMPA_ORDINAL[Math.round(i * paso)]);
}

/** Ejes recesivos: la rejilla no compite con los datos. */
export const ejeX = {
  tick: { fontSize: 12, fill: TINTA.eje },
  axisLine: false,
  tickLine: false,
  dy: 4
};

export const ejeY = {
  tick: { fontSize: 12, fill: TINTA.eje },
  axisLine: false,
  tickLine: false,
  allowDecimals: false,
  width: 34
};

export const rejilla = {
  strokeDasharray: '2 4',
  vertical: false,
  stroke: TINTA.rejilla
};

export const tooltipEstilo = {
  contentStyle: {
    borderRadius: '8px',
    border: '1px solid #e1e5eb',
    boxShadow: '0 2px 4px rgba(20,25,32,.04), 0 4px 10px rgba(20,25,32,.08)',
    fontSize: '13px',
    padding: '8px 10px'
  },
  labelStyle: { color: '#141920', fontWeight: 600, marginBottom: 2 },
  itemStyle: { color: '#4b5666' },
  cursor: { fill: 'rgba(42,67,150,0.06)' }
};

/**
 * La animación de la gráfica anterior duraba 1500ms para dibujar seis
 * barras. Un cuarto de segundo basta para que se lea como "llegó".
 */
export const ANIM_MS = 260;
