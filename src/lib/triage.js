/**
 * Priorización de visitas domiciliarias.
 *
 * Reemplaza el semáforo anterior, que tenía dos defectos graves:
 *
 *   1. Inventaba signos vitales. `parseFloat(data.temperature) || 37`
 *      significaba que un paciente sin temperatura registrada se evaluaba
 *      como si tuviera 37 °C, y salía "ESTABLE".
 *   2. Los umbrales estaban escritos en el código y no se mostraban, así
 *      que el médico veía un color sin saber qué lo produjo.
 *
 * Las tres reglas de este módulo:
 *
 *   · Nada se infiere. Un signo que no se registró NO cuenta como normal;
 *     cuenta como no registrado, y eso es su propio estado.
 *   · Toda alerta viaja con su motivo escrito y el umbral que la disparó,
 *     para que aparezca en pantalla junto al color.
 *   · Una alerta se apaga cuando existe una visita registrada DESPUÉS de
 *     la bitácora que la generó. El paciente atendido sale de la cola.
 *
 * Los umbrales son valores por defecto documentados. La entidad los puede
 * sobrescribir: `evaluarPrioridad` recibe `umbrales` y `umbralDias`, y el
 * panel toma este último de `GET /api/programa/umbral`.
 */

/** Umbrales clínicos por defecto. La entidad puede reemplazarlos. */
export const UMBRALES_POR_DEFECTO = {
  temperatura: { alta: 38.5, media: 37.8, baja: 35.5 },
  sistolica:   { alta: 180, media: 140, baja: 90 },
  diastolica:  { alta: 110, media: 90 },
  // Días sin visita del profesional antes de considerarlo seguimiento vencido.
  diasSinVisita: 5
};

/** Eventos que el cuidador marca en la bitácora y su peso base. */
const ALERTAS_ALTAS = ['Caída', 'Dif. Respiratoria'];
const ALERTAS_MEDIAS = ['Fiebre', 'Dolor', 'Cambio Conducta'];

/**
 * Combinaciones diagnóstico + hallazgo que elevan la prioridad.
 *
 * Esto es lo que pedía "según su enfermedad": la misma alerta no pesa
 * igual en cualquier paciente. Una caída en alguien con Parkinson o con
 * fractura de cadera previa no es el mismo evento que en alguien sin esas
 * condiciones.
 *
 * `dx` se compara en minúsculas y por coincidencia parcial, porque el
 * diagnóstico se guarda como texto libre.
 */
const REGLAS_DIAGNOSTICO = [
  {
    id: 'respiratorio',
    dx: ['epoc', 'respiratoria', 'esclerosis lateral', 'ela'],
    alerta: 'Dif. Respiratoria',
    motivo: (dx) => `Dificultad respiratoria registrada en paciente con ${dx}`
  },
  {
    id: 'caidas-neuro',
    dx: ['parkinson', 'alzheimer', 'demencia', 'discapacidad cognitiva', 'acv', 'derrame'],
    alerta: 'Caída',
    motivo: (dx) => `Caída registrada en paciente con ${dx}`
  },
  {
    id: 'caidas-osteo',
    dx: ['fractura', 'inmovilidad', 'artritis', 'artrosis'],
    alerta: 'Caída',
    motivo: (dx) => `Caída registrada en paciente con ${dx}`
  },
  {
    id: 'cardio-presion',
    dx: ['insuficiencia cardíaca', 'insuficiencia cardiaca', 'hipertensión', 'hipertension', 'renal'],
    alerta: null, // se activa por signo vital, no por evento marcado
    porSistolica: true,
    motivo: (dx) => `Presión fuera de rango en paciente con ${dx}`
  },
  {
    id: 'paliativo',
    dx: ['cáncer', 'cancer', 'paliativo'],
    alerta: null,
    porCualquierAlerta: true,
    motivo: (dx) => `Hallazgo registrado en paciente con ${dx}`
  }
];

const NIVELES = { alta: 3, media: 2, seguimiento: 1, normal: 0, sinDatos: 1, atendido: -1 };

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const dias = (desde) => {
  const d = new Date(desde);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
};

export const parseBitacora = (log) => {
  if (!log) return {};
  const crudo = log.content ?? log.notes ?? log.formData;
  try {
    return typeof crudo === 'string' ? JSON.parse(crudo) : (crudo || {});
  } catch {
    return { observations: crudo || '' };
  }
};

/**
 * Evalúa a un paciente.
 *
 * @param {object}   paciente
 * @param {object[]} bitacoras  bitácoras del paciente, cualquier orden
 * @param {object[]} visitas    visitas del paciente, cualquier orden
 * @param {object}   umbrales   sobrescribe UMBRALES_POR_DEFECTO
 * @param {number}   umbralDias días sin visita definidos por la entidad
 */
export function evaluarPrioridad(paciente, bitacoras = [], visitas = [], umbrales = {}, umbralDias = null) {
  const U = { ...UMBRALES_POR_DEFECTO, ...umbrales };
  const limiteDias = umbralDias ?? U.diasSinVisita;

  const porFecha = (a, b) => new Date(b.date) - new Date(a.date);
  const logs = [...bitacoras].sort(porFecha);
  const vis = [...visitas].sort(porFecha);

  const ultimaVisita = vis[0] ? new Date(vis[0].date) : null;
  const ultimaBitacora = logs[0] ? new Date(logs[0].date) : null;

  // ---- Sin bitácoras: no es "estable", es que no hay información -----------
  if (logs.length === 0) {
    return {
      nivel: 'sinDatos',
      orden: NIVELES.sinDatos,
      etiqueta: 'Sin bitácora registrada',
      motivos: [{ texto: 'El cuidador no ha registrado ninguna bitácora para este paciente.' }],
      atendida: false,
      vitales: {},
      ultimaVisita,
      ultimaBitacora: null,
      diasSinVisita: ultimaVisita ? dias(ultimaVisita) : null
    };
  }

  const log = logs[0];
  const d = parseBitacora(log);
  const fechaBitacora = new Date(log.date);
  const dx = (paciente.diagnosis || paciente.condition || '').toLowerCase();

  const vitales = {
    temperatura: num(d.temperature),
    sistolica: num(d.systolicBP),
    diastolica: num(d.diastolicBP)
  };

  const alertas = Array.isArray(d.alerts) ? d.alerts.filter(a => a !== 'Ninguno') : [];

  const motivos = [];
  let nivel = 'normal';
  const subir = (n) => { if (NIVELES[n] > NIVELES[nivel]) nivel = n; };

  // ---- Signos vitales registrados ----------------------------------------
  if (vitales.temperatura !== null) {
    if (vitales.temperatura >= U.temperatura.alta) {
      subir('alta');
      motivos.push({ texto: `Temperatura ${vitales.temperatura} °C`, umbral: `umbral alto: ${U.temperatura.alta} °C` });
    } else if (vitales.temperatura <= U.temperatura.baja) {
      subir('alta');
      motivos.push({ texto: `Temperatura ${vitales.temperatura} °C`, umbral: `umbral bajo: ${U.temperatura.baja} °C` });
    } else if (vitales.temperatura >= U.temperatura.media) {
      subir('media');
      motivos.push({ texto: `Temperatura ${vitales.temperatura} °C`, umbral: `umbral de precaución: ${U.temperatura.media} °C` });
    }
  }

  let presionFuera = false;
  if (vitales.sistolica !== null) {
    if (vitales.sistolica >= U.sistolica.alta || vitales.sistolica <= U.sistolica.baja) {
      subir('alta');
      presionFuera = true;
      motivos.push({
        texto: `Presión sistólica ${vitales.sistolica} mmHg`,
        umbral: `rango de alerta: ≤${U.sistolica.baja} o ≥${U.sistolica.alta} mmHg`
      });
    } else if (vitales.sistolica >= U.sistolica.media) {
      subir('media');
      presionFuera = true;
      motivos.push({
        texto: `Presión sistólica ${vitales.sistolica} mmHg`,
        umbral: `umbral de precaución: ${U.sistolica.media} mmHg`
      });
    }
  }

  if (vitales.diastolica !== null && vitales.diastolica >= U.diastolica.alta) {
    subir('alta');
    presionFuera = true;
    motivos.push({
      texto: `Presión diastólica ${vitales.diastolica} mmHg`,
      umbral: `umbral alto: ${U.diastolica.alta} mmHg`
    });
  }

  // ---- Eventos que marcó el cuidador -------------------------------------
  alertas.forEach(a => {
    if (ALERTAS_ALTAS.includes(a)) {
      subir('alta');
      motivos.push({ texto: `El cuidador registró: ${a}` });
    } else if (ALERTAS_MEDIAS.includes(a)) {
      subir('media');
      motivos.push({ texto: `El cuidador registró: ${a}` });
    } else {
      subir('media');
      motivos.push({ texto: `El cuidador registró: ${a}` });
    }
  });

  if (d.alertLevel === 'Desorientado') {
    subir('alta');
    motivos.push({ texto: 'Nivel de conciencia: desorientado' });
  }

  if (d.medsGiven === 'No') {
    subir('media');
    motivos.push({
      texto: 'No se administraron los medicamentos',
      umbral: d.medsReason ? `motivo: ${d.medsReason}` : undefined
    });
  }

  // ---- El diagnóstico eleva ciertos hallazgos ----------------------------
  REGLAS_DIAGNOSTICO.forEach(regla => {
    const coincide = regla.dx.find(t => dx.includes(t));
    if (!coincide) return;

    const aplica =
      (regla.alerta && alertas.includes(regla.alerta)) ||
      (regla.porSistolica && presionFuera) ||
      (regla.porCualquierAlerta && (alertas.length > 0 || motivos.length > 0));

    if (!aplica) return;

    subir('alta');
    const etiquetaDx = paciente.diagnosis || paciente.condition;
    const texto = regla.motivo(etiquetaDx);
    if (!motivos.some(m => m.texto === texto)) {
      motivos.push({ texto, porDiagnostico: true });
    }
  });

  // ---- Seguimiento vencido ------------------------------------------------
  const diasSinVisita = ultimaVisita ? dias(ultimaVisita) : null;
  if (diasSinVisita === null) {
    if (nivel === 'normal') {
      subir('seguimiento');
      motivos.push({ texto: 'Nunca ha recibido una visita del profesional' });
    }
  } else if (diasSinVisita >= limiteDias && nivel === 'normal') {
    subir('seguimiento');
    motivos.push({
      texto: `Última visita hace ${diasSinVisita} días`,
      umbral: `umbral de seguimiento: ${limiteDias} días`
    });
  }

  // ---- ¿Ya se atendió? ----------------------------------------------------
  //
  // Esta es la parte que faltaba: una alerta permanecía encendida aunque el
  // profesional ya hubiera ido. Si existe una visita posterior a la bitácora
  // que generó los hallazgos, el caso está atendido y sale de la cola hasta
  // que una bitácora nueva vuelva a levantar algo.
  const hayHallazgoClinico = ['alta', 'media'].includes(nivel);
  const atendida = Boolean(
    hayHallazgoClinico && ultimaVisita && ultimaVisita > fechaBitacora
  );

  if (atendida) {
    return {
      nivel: 'atendido',
      orden: NIVELES.atendido,
      etiqueta: 'Atendido',
      motivos: [{
        texto: `Visitado el ${ultimaVisita.toLocaleDateString('es-CO')}, después de la bitácora del ${fechaBitacora.toLocaleDateString('es-CO')}.`
      }],
      motivosResueltos: motivos,
      atendida: true,
      vitales, alertas, ultimaVisita, ultimaBitacora, diasSinVisita
    };
  }

  const ETIQUETAS = {
    alta: 'Atención prioritaria',
    media: 'Requiere revisión',
    seguimiento: 'Seguimiento vencido',
    sinDatos: 'Sin bitácora registrada',
    normal: 'Sin hallazgos registrados'
  };

  return {
    nivel,
    orden: NIVELES[nivel],
    etiqueta: ETIQUETAS[nivel],
    motivos,
    atendida: false,
    vitales, alertas, ultimaVisita, ultimaBitacora, diasSinVisita
  };
}

/** Tono del sistema de diseño para cada nivel. */
export const TONO_NIVEL = {
  alta: 'risk',
  media: 'warn',
  seguimiento: 'warn',
  // Que un paciente del programa no tenga ninguna bitácora es accionable:
  // significa que el cuidador no está registrando. No es un estado neutro.
  sinDatos: 'warn',
  normal: 'ok',
  atendido: 'ok'
};
