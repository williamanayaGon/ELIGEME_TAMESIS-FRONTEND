import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList
} from 'recharts';
import {
  MdGroups, MdEventRepeat, MdEngineering, MdFactCheck, MdDownload,
  MdTune, MdClose, MdInfoOutline, MdArrowForward
} from 'react-icons/md';

import { apiFetch, apiDownload } from '../lib/api';

// Un solo tono: las gráficas llevan una sola serie, así que el color
// codifica magnitud, no identidad. Validado para contraste sobre claro.
const AZUL = '#2c46cc'; // brand-600, mismo hue de magnitud que el resto de gráficas

const hoy = () => new Date().toISOString().slice(0, 10);
const inicioAno = () => `${new Date().getFullYear()}-01-01`;

// Un dato ausente se muestra como tal, no como cero.
const oNoCalculable = (v, sufijo = '') =>
  v === null || v === undefined ? 'No calculable' : `${v}${sufijo}`;

function Vacio({ mensaje }) {
  return (
    <div className="text-center py-10 px-6">
      <p className="text-gray-500 font-medium">{mensaje}</p>
    </div>
  );
}

function Seccion({ titulo, icono, children, accion }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b bg-gray-50 flex justify-between items-center gap-3">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">{icono} {titulo}</h3>
        {accion}
      </div>
      {children}
    </div>
  );
}

function Dato({ etiqueta, valor, nota, destacado }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase font-bold">{etiqueta}</p>
      <p className={`font-semibold ${destacado ? 'text-2xl text-brand-700' : 'text-lg text-ink-900'}`}>{valor}</p>
      {nota && <p className="text-xs text-gray-500 mt-0.5">{nota}</p>}
    </div>
  );
}

// Distribución simple: barra proporcional + conteo. Suficiente para
// categorías cortas, y no pretende ser una gráfica que no aporta.
function Distribucion({ datos, total }) {
  const entradas = Object.entries(datos).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-2.5">
      {entradas.map(([k, v]) => (
        <div key={k}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-700">{k}</span>
            <span className="font-bold text-gray-900">
              {v} <span className="text-gray-400 font-normal">
                ({total > 0 ? Math.round((v / total) * 1000) / 10 : 0}%)
              </span>
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-brand-600 h-2 rounded-full"
              style={{ width: `${total > 0 ? (v / total) * 100 : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CaracterizacionPrograma() {
  const [periodo, setPeriodo] = useState({ desde: inicioAno(), hasta: hoy() });
  const [perfil, setPerfil] = useState(null);
  const [intensidad, setIntensidad] = useState(null);
  const [capacidad, setCapacidad] = useState(null);
  const [situaciones, setSituaciones] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [modalUmbral, setModalUmbral] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const qs = `?desde=${periodo.desde}&hasta=${periodo.hasta}`;
      const [rp, ri, rc, rs] = await Promise.all([
        apiFetch('/api/programa/perfil'),
        apiFetch(`/api/programa/intensidad${qs}`),
        apiFetch('/api/programa/capacidad'),
        apiFetch('/api/programa/situaciones')
      ]);
      if (rp.ok) setPerfil(await rp.json());
      if (ri.ok) setIntensidad(await ri.json());
      if (rc.ok) setCapacidad(await rc.json());
      if (rs.ok) setSituaciones(await rs.json());
    } catch {
      toast.error('Error de conexión');
    } finally {
      setCargando(false);
    }
  }, [periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  const descargarDossier = async () => {
    try {
      await apiDownload(
        `/api/programa/dossier?desde=${periodo.desde}&hasta=${periodo.hasta}`,
        'caracterizacion.pdf'
      );
      toast.success('Dossier descargado');
    } catch (e) { toast.error(e.message); }
  };

  const diagnosticos = (perfil?.topDiagnosticos ?? []).map(d => ({
    ...d,
    etiqueta: d.nombre.length > 28 ? `${d.nombre.slice(0, 26)}…` : d.nombre
  }));

  return (
    <div className="animate-fade space-y-5">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Reporte ADRES</h2>
          <p className="text-sm text-gray-500">
            Caracterización de la población atendida: a quién atiende el programa, con qué
            intensidad y con qué recursos.
          </p>
        </div>
        <button onClick={descargarDossier}
          className="bg-blue-900 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-800 transition flex items-center gap-2 shadow-sm">
          <MdDownload className="text-xl" /> Dossier en PDF
        </button>
      </div>

      {/* El alcance va antes que cualquier cifra */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <MdInfoOutline className="text-amber-600 text-xl shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <p className="font-bold">Cubre a las personas registradas en ELÍGEME, no al municipio.</p>
          <p className="text-amber-800 mt-0.5">
            Estas cifras describen el programa de cuidado domiciliario tal como quedó registrado aquí.
            La población total del municipio, la demanda no atendida y los criterios de las
            convocatorias los aporta la Secretaría de Planeación: esta plataforma no los tiene y no
            los estima.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Periodo desde</label>
          <input type="date" value={periodo.desde}
            onChange={e => setPeriodo({ ...periodo, desde: e.target.value })}
            className="block p-2 border border-gray-300 rounded-lg mt-1" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Hasta</label>
          <input type="date" value={periodo.hasta}
            onChange={e => setPeriodo({ ...periodo, hasta: e.target.value })}
            className="block p-2 border border-gray-300 rounded-lg mt-1" />
        </div>
        <p className="text-xs text-gray-500 pb-2">Aplica a intensidad y al dossier.</p>
      </div>

      {cargando && <p className="text-center py-12 text-gray-400">Cargando…</p>}

      {!cargando && (
        <>
          {/* ---------- SITUACIONES ---------- */}
          <Seccion titulo="Situaciones detectadas" icono={<MdFactCheck className="text-blue-700" />}>
            {situaciones?.vacio || !situaciones?.situaciones?.length ? (
              <Vacio mensaje={situaciones?.mensaje ?? 'No se detectaron situaciones con los criterios aplicados.'} />
            ) : (
              <>
                <div className="divide-y divide-gray-100">
                  {situaciones.situaciones.map(s => (
                    <div key={s.id} className="p-4 flex flex-wrap justify-between items-start gap-3 hover:bg-gray-50">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800">{s.hecho}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Criterio: {s.criterio}</p>
                        {s.umbralConfigurable && (
                          <p className={`text-xs mt-1 ${s.umbralDefinidoPorLaEntidad ? 'text-gray-500' : 'text-amber-700'}`}>
                            {s.umbralDefinidoPorLaEntidad
                              ? `Umbral definido por la entidad: ${s.justificacionUmbral}`
                              : `⚠ Umbral no definido por la entidad. ${s.justificacionUmbral}`}
                          </p>
                        )}
                      </div>
                      <a href={s.enlace}
                        className="text-blue-600 font-bold text-xs hover:underline flex items-center gap-1 shrink-0">
                        Ver listado <MdArrowForward />
                      </a>
                    </div>
                  ))}
                </div>
                <p className="px-4 py-3 text-xs text-gray-500 bg-gray-50 border-t">
                  {situaciones.nota}
                </p>
              </>
            )}
          </Seccion>

          {/* ---------- PERFIL ---------- */}
          <Seccion titulo="Perfil de las personas atendidas" icono={<MdGroups className="text-blue-700" />}>
            {perfil?.vacio ? (
              <Vacio mensaje={perfil.mensaje} />
            ) : perfil && (
              <div className="p-5 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Dato etiqueta="Registradas" valor={perfil.total} destacado />
                  <Dato etiqueta="Activas" valor={perfil.permanencia.activas} />
                  <Dato etiqueta="Egresadas" valor={perfil.permanencia.egresadas} />
                  <Dato etiqueta="Con cuidador" valor={`${perfil.cobertura.conCuidador}`}
                    nota={`${perfil.cobertura.porcentajeConCuidador}% del total`} />
                  <Dato etiqueta="60 años o más" valor={perfil.etario.sesentaOMas}
                    nota={`${perfil.etario.porcentajeSesentaOMas}% del total`} />
                </div>

                {perfil.sinFechaRegistro > 0 && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded p-2">
                    {perfil.sinFechaRegistro} persona(s) no tienen fecha de registro: son anteriores a que
                    el programa la guardara. No entran en los conteos por periodo.
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-3">Grupo etario</h4>
                    <Distribucion datos={perfil.etario.grupos} total={perfil.total} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-3">Estrato</h4>
                    <Distribucion datos={perfil.estrato} total={perfil.total} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-3">Territorio</h4>
                    <Distribucion datos={perfil.territorio} total={perfil.total} />
                  </div>
                </div>

                {diagnosticos.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-1">Diagnósticos más frecuentes</h4>
                    <p className="text-xs text-gray-500 mb-3">De mayor a menor, agrupando el texto registrado</p>
                    <div style={{ height: Math.max(160, diagnosticos.length * 38) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={diagnosticos} layout="vertical"
                          margin={{ top: 0, right: 64, left: 8, bottom: 0 }}>
                          <CartesianGrid horizontal={false} stroke="#E5E7EB" strokeDasharray="3 3" />
                          <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }}
                            axisLine={false} tickLine={false} allowDecimals={false} />
                          <YAxis type="category" dataKey="etiqueta" width={180}
                            tick={{ fontSize: 12, fill: '#374151' }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: '#F3F4F6' }}
                            formatter={(v, _n, p) => [`${v} persona(s) · ${p.payload.porcentaje}%`, 'Registradas']}
                            labelFormatter={(_l, p) => p?.[0]?.payload?.nombre ?? ''}
                            contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }} />
                          <Bar dataKey="conteo" fill={AZUL} radius={[0, 4, 4, 0]} barSize={16}>
                            <LabelList dataKey="conteo" position="right" offset={8}
                              style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Seccion>

          {/* ---------- INTENSIDAD ---------- */}
          <Seccion titulo="Intensidad de la atención" icono={<MdEventRepeat className="text-blue-700" />}
            accion={
              <button onClick={() => setModalUmbral(true)}
                className="text-xs font-bold text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-white transition flex items-center gap-1.5">
                <MdTune /> Umbral de seguimiento
              </button>
            }>
            {intensidad?.vacio ? (
              <Vacio mensaje={intensidad.mensaje} />
            ) : intensidad && (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Dato etiqueta="Visitas" valor={intensidad.visitas.total}
                    nota={`${intensidad.visitas.porPersona} por persona`} />
                  <Dato etiqueta="Bitácoras" valor={intensidad.bitacoras.total}
                    nota={`${intensidad.bitacoras.porPersona} por persona`} />
                  <Dato etiqueta="Sin seguimiento reciente" valor={intensidad.sinSeguimientoReciente.conteo}
                    nota={`Umbral: ${intensidad.umbral.dias} días`} />
                  <Dato etiqueta="Días entre visitas"
                    valor={oNoCalculable(intensidad.diasPromedioEntreVisitas)} />
                </div>

                <div className="text-xs text-gray-500 space-y-1 border-t pt-3">
                  <p>{intensidad.sinSeguimientoReciente.criterio}</p>
                  <p>{intensidad.notaIntervalos}</p>
                  {!intensidad.umbral.definidoPorLaEntidad && (
                    <p className="text-amber-700 font-medium">
                      ⚠ El umbral de {intensidad.umbral.dias} días lo sugiere la plataforma, no lo definió la
                      entidad. Defínelo para que la cifra sea defendible.
                    </p>
                  )}
                </div>
              </div>
            )}
          </Seccion>

          {/* ---------- CAPACIDAD ---------- */}
          <Seccion titulo="Capacidad del programa" icono={<MdEngineering className="text-blue-700" />}>
            {capacidad?.vacio ? (
              <Vacio mensaje={capacidad.mensaje} />
            ) : capacidad && (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Dato etiqueta="Cuidadores" valor={capacidad.cuidadores.total}
                    nota={`${capacidad.cuidadores.aprobados} aprobados`} />
                  <Dato etiqueta="Con paciente a cargo" valor={capacidad.cuidadores.conPacienteACargo} />
                  <Dato etiqueta="Postulaciones pendientes" valor={capacidad.cuidadores.pendientes} />
                  <Dato etiqueta="Profesionales" valor={capacidad.profesionales} />
                  <Dato etiqueta="Pacientes por cuidador"
                    valor={oNoCalculable(capacidad.pacientesPorCuidador)} destacado />
                </div>
                <p className="text-xs text-gray-500 border-t pt-3">{capacidad.notaRelacion}</p>
              </div>
            )}
          </Seccion>
        </>
      )}

      {modalUmbral && (
        <ModalUmbral
          onClose={() => setModalUmbral(false)}
          onGuardado={() => { setModalUmbral(false); cargar(); }}
        />
      )}
    </div>
  );
}

// =================================================================

function ModalUmbral({ onClose, onGuardado }) {
  const [dias, setDias] = useState(60);
  const [justificacion, setJustificacion] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    apiFetch('/api/programa/umbral')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setDias(d.dias);
        if (d.definidoPorLaEntidad) setJustificacion(d.justificacion);
      })
      .catch(() => { /* se queda con el valor inicial */ });
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await apiFetch('/api/programa/umbral', {
        method: 'PUT', body: JSON.stringify({ dias, justificacion })
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error || 'No se pudo guardar');
      toast.success('Umbral definido por la entidad');
      onGuardado();
    } catch {
      toast.error('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <form onSubmit={guardar} className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="bg-blue-900 text-white px-6 py-4 flex justify-between items-center">
          <h3 className="font-bold text-lg">Umbral de seguimiento</h3>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white text-2xl"><MdClose /></button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Cuántos días sin bitácora ni visita hacen que una persona cuente como
            <strong> sin seguimiento reciente</strong>. La plataforma no fija este número:
            lo decide la entidad y queda guardado con su razón.
          </p>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Días</label>
            <input type="number" min="1" max="365" required value={dias}
              onChange={e => setDias(Number(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg mt-1 text-lg font-bold" />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Justificación *</label>
            <textarea required rows="3" minLength={10} value={justificacion}
              onChange={e => setJustificacion(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg mt-1"
              placeholder="Por qué la entidad eligió este número (protocolo, norma, acuerdo interno…)" />
            <p className="text-xs text-gray-500 mt-1">
              Queda guardada junto al umbral y aparece en el dossier, para que la cifra sea defendible.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-bold text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button type="submit" disabled={guardando}
            className="bg-blue-900 text-white px-5 py-2 rounded-lg font-bold hover:bg-blue-800 disabled:bg-gray-400">
            {guardando ? 'Guardando…' : 'Guardar umbral'}
          </button>
        </div>
      </form>
    </div>
  );
}
